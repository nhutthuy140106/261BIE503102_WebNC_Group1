const router = require('express').Router();
const service = require('./offer.service');
const v = require('./offer.validation');
const asyncHandler = require('../../../utils/asyncHandler');
const { body, query, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

/**
 * @openapi
 * /jobs/{id}/offers:
 *   post:
 *     tags: [Đề nghị nhận việc]
 *     summary: Gửi đề nghị nhận việc (gửi đề nghị ≠ đã nhận việc)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [intro]
 *             properties:
 *               intro: { type: string, example: Mình ở cùng block, rảnh sáng mai. }
 *               slots: { type: array, items: { type: string, format: date-time } }
 *     responses:
 *       201: { description: "Đề nghị mới, state = offered" }
 *       403: { description: Việc do chính bạn đăng }
 *       404: { description: Việc không tồn tại }
 *       409: { description: Việc đã đóng, hoặc bạn đã có đề nghị đang hoạt động }
 *       422: { description: Thiếu lời giới thiệu hoặc khung giờ ngoài khung việc }
 * /offers:
 *   get:
 *     tags: [Đề nghị nhận việc]
 *     summary: Việc đã nhận (đề nghị của tôi)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: state, in: query, schema: { type: string, enum: [active, history] } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Offer[], meta }; job.poster là UserSummary kèm avatar (URL hoặc null)" }
 * /offers/{id}:
 *   get:
 *     tags: [Đề nghị nhận việc]
 *     summary: Chi tiết đề nghị kèm việc; exactAddress chỉ có khi state từ chosen trở đi
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       403: { description: Đề nghị của người khác }
 *       404: { description: Không tồn tại }
 *   patch:
 *     tags: [Đề nghị nhận việc]
 *     summary: Sửa lời giới thiệu/khung giờ (chỉ khi offered)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { intro: { type: string }, slots: { type: array, items: { type: string, format: date-time } } } } } }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Đề nghị không còn ở trạng thái offered }
 *       422: { description: Dữ liệu sai }
 * /offers/{id}/withdraw:
 *   post:
 *     tags: [Đề nghị nhận việc]
 *     summary: Rút đề nghị (offered → withdrawn)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       409: { description: Sai trạng thái }
 * /offers/{id}/start:
 *   post:
 *     tags: [Đề nghị nhận việc]
 *     summary: Bắt đầu làm (chosen → working)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       409: { description: Sai trạng thái }
 * /offers/{id}/report-done:
 *   post:
 *     tags: [Đề nghị nhận việc]
 *     summary: Báo hoàn thành (working → reported); tự thành done sau 24 giờ nếu chủ việc im lặng
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [note], properties: { note: { type: string }, images: { type: array, maxItems: 4, items: { type: string } } } } } }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Sai trạng thái }
 *       422: { description: Thiếu ghi chú hoặc quá 4 ảnh }
 * /offers/{id}/confirm-paid:
 *   post:
 *     tags: [Đề nghị nhận việc]
 *     summary: Xác nhận đã nhận tiền công (trả trực tiếp, chỉ khi done)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK, có paidAt }
 *       409: { description: Chưa hoàn thành hoặc đã xác nhận rồi }
 * /offers/{id}/cancel-request:
 *   post:
 *     tags: [Đề nghị nhận việc]
 *     summary: Xin hủy (chosen|working → cancelled), bắt buộc chọn lý do
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [reason], properties: { reason: { type: string, enum: [busy, sick, other] }, detail: { type: string } } } } }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Sai trạng thái }
 *       422: { description: Thiếu lý do }
 */
const send = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req) }));

router.post('/jobs/:id/offers', auth, ids('id'), body(v.create), asyncHandler(async (req, res) =>
  res.status(201).json({ data: await service.create(req.user, req.params.id, req.body) })));

router.use('/offers', auth);
router.get('/offers', query(v.list), asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.user, req.valid.query);
  res.json({ data: items, meta });
}));
router.get('/offers/:id', ids('id'), send((req) => service.get(req.user, req.params.id)));
router.patch('/offers/:id', ids('id'), body(v.update), send((req) => service.update(req.user, req.params.id, req.body)));
router.post('/offers/:id/withdraw', ids('id'), send((req) => service.withdraw(req.user, req.params.id)));
router.post('/offers/:id/start', ids('id'), send((req) => service.start(req.user, req.params.id)));
router.post('/offers/:id/report-done', ids('id'), body(v.reportDone), send((req) => service.reportDone(req.user, req.params.id, req.body)));
router.post('/offers/:id/confirm-paid', ids('id'), send((req) => service.confirmPaid(req.user, req.params.id)));
router.post('/offers/:id/cancel-request', ids('id'), body(v.cancel), send((req) => service.cancelRequest(req.user, req.params.id, req.body)));

module.exports = router;
