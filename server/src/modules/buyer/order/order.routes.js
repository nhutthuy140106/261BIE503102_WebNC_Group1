const router = require('express').Router();
const service = require('./order.service');
const v = require('./order.validation');
const asyncHandler = require('../../../utils/asyncHandler');
const { body, query, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Đơn hàng]
 *     summary: Tạo đơn từ một bài
 *     description: Tổng tiền tính ở server từ giá hiện tại của bài; field total/breakdown gửi lên bị bỏ qua. Đơn lưu bản chụp tên/giá bài lúc đặt.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId, quantity, fulfillment, payment]
 *             properties:
 *               postId: { type: string }
 *               quantity: { type: integer, example: 1 }
 *               selections: { type: array, items: { type: object, properties: { group: { type: string }, choices: { type: array, items: { type: string } } } } }
 *               answers: { type: array, items: { type: object, properties: { question: { type: string }, value: { type: string } } } }
 *               fulfillment: { type: string, enum: [delivery, pickup] }
 *               addressId: { type: string }
 *               scheduledAt: { type: string, format: date-time }
 *               utensils: { type: boolean }
 *               note: { type: string }
 *               voucherCode: { type: string, example: XU10 }
 *               payment: { type: string, enum: [cash, transfer] }
 *     responses:
 *       201: { description: "Đơn mới, state = waiting, có code AG-O…, total, breakdown; snapshot có sellerName và sellerAvatar (URL hoặc null)" }
 *       401: { description: Chưa đăng nhập }
 *       403: { description: Đặt bài của chính mình / dùng địa chỉ của người khác }
 *       404: { description: Bài không tồn tại }
 *       409: { description: Bài hết hàng, đã bán hoặc đã đóng }
 *       422: { description: Thiếu địa chỉ khi giao, thiếu câu hỏi bắt buộc, giờ ở quá khứ, lựa chọn sai }
 *   get:
 *     tags: [Đơn hàng]
 *     summary: Đơn đã đặt của tôi
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: role, in: query, schema: { type: string, enum: [placed] } }
 *       - { name: state, in: query, description: "active = đang diễn ra, history = đã kết thúc", schema: { type: string, enum: [active, history] } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Order[], meta }; snapshot gồm title, image, sellerName, sellerAvatar (URL hoặc null)" }
 * /orders/{id}:
 *   get:
 *     tags: [Đơn hàng]
 *     summary: Chi tiết đơn (người mua hoặc người bán của đơn)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       403: { description: Đơn của người khác }
 *       404: { description: Không tồn tại }
 * /orders/{id}/cancel-request:
 *   post:
 *     tags: [Đơn hàng]
 *     summary: Gửi yêu cầu hủy (không tự hủy, không tự hoàn tiền)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [reason], properties: { reason: { type: string } } } } }
 *     responses:
 *       200: { description: Đã ghi yêu cầu }
 *       403: { description: Không phải người đặt }
 *       409: { description: Đơn không còn hủy được hoặc đã gửi yêu cầu rồi }
 *       422: { description: Thiếu lý do }
 * /orders/{id}/return-request:
 *   post:
 *     tags: [Đơn hàng]
 *     summary: Gửi yêu cầu trả hàng (chỉ đồ dùng, đơn đã hoàn thành, trong 7 ngày) — quy tắc chờ chốt Q6
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [reason], properties: { reason: { type: string } } } } }
 *     responses:
 *       200: { description: Đã ghi yêu cầu }
 *       409: { description: Không đủ điều kiện trả hàng }
 *       422: { description: Thiếu lý do }
 * /orders/{id}/tracking:
 *   get:
 *     tags: [Đơn hàng]
 *     summary: Vị trí xe giao hàng (MÔ PHỎNG, tính từ mốc thời gian của đơn)
 *     description: Chỉ người mua, người bán của đơn hoặc admin. Chỉ đơn đồ ăn/đồ dùng giao tận nơi chưa hủy; đơn tự lấy, dịch vụ → 404 NO_TRACKING. Hai thiết bị gọi cùng lúc thấy xe cùng một chỗ.
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: "{ data: { simulated, note, shop:{lat,lng}, home:{lat,lng}, courier:{lat,lng,phase,etaMin,distanceKm} } }; phase = waiting | preparing | delivering | delivered" }
 *       403: { description: Không phải đơn của bạn }
 *       404: { description: Không có đơn, hoặc NO_TRACKING }
 * /orders/{id}/approve-surcharge:
 *   post:
 *     tags: [Đơn hàng]
 *     summary: Đồng ý khoản phụ thu người làm đã báo (cộng vào tổng) — chờ chốt Q6
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Tổng tiền đã cộng phụ thu }
 *       409: { description: Không có phụ thu đang chờ }
 */
router.use(auth);
router.post('/', body(v.create), asyncHandler(async (req, res) =>
  res.status(201).json({ data: await service.create(req.user, req.body) })));
router.get('/', query(v.list), asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.user, req.valid.query);
  res.json({ data: items, meta });
}));
router.get('/:id', ids('id'), asyncHandler(async (req, res) =>
  res.json({ data: await service.getVisible(req.user, req.params.id) })));
router.get('/:id/tracking', ids('id'), asyncHandler(async (req, res) =>
  res.json({ data: await service.tracking(req.user, req.params.id) })));
router.post('/:id/cancel-request', ids('id'), body(v.reason), asyncHandler(async (req, res) =>
  res.json({ data: await service.requestCancel(req.user, req.params.id, req.body.reason) })));
router.post('/:id/return-request', ids('id'), body(v.reason), asyncHandler(async (req, res) =>
  res.json({ data: await service.requestReturn(req.user, req.params.id, req.body.reason) })));
router.post('/:id/approve-surcharge', ids('id'), asyncHandler(async (req, res) =>
  res.json({ data: await service.approveSurcharge(req.user, req.params.id) })));

module.exports = router;
