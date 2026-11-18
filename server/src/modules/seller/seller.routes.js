const router = require('express').Router();
const { z } = require('zod');
const service = require('./seller.service');
const verification = require('./verification.service');
const shop = require('./shop.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const { body, ids } = require('../../middlewares/validate');
const { auth } = require('../../middlewares/auth');

router.use(auth);

// Nội dung bài/việc: model Mongoose mới là nơi kiểm tra chi tiết (kiểu, enum, ràng buộc); ở đây chỉ chặn body rỗng/sai kiểu
const anyObject = z.object({}).passthrough();
const patchPost = z.object({ closed: z.boolean().optional(), price: z.number().int().min(0).optional(), stockLeft: z.number().int().min(0).optional() })
  .refine((v) => Object.keys(v).length > 0, 'Cần ít nhất một trường để sửa');
const patchJob = z.object({ closed: z.boolean() });
const surcharge = z.object({
  amount: z.number().int().min(1000).optional(), reason: z.string().trim().optional(), reply: z.string().trim().max(300).optional(),
  // báo giá (đơn giặt sấy / sửa chữa): các dòng giá cuối
  lines: z.array(z.object({ name: z.string().trim().min(1).max(120), qty: z.number().positive().max(10000), price: z.number().min(0).max(100000000) })).max(30).optional(),
});

/**
 * @openapi
 * /seller/posts:
 *   get:
 *     tags: [Bán & Đăng việc]
 *     summary: Bài đăng (đồ ăn / đồ dùng / dịch vụ) của tôi — kể cả nháp và đã đóng; kèm tài khoản nhận tiền
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: "{ data: Post[] }" } }
 *   post:
 *     tags: [Bán & Đăng việc]
 *     summary: Đăng bài mới (theo hợp đồng docs/post-contract.md). Không tự đặt được promoted/hidden/seller
 *     security: [{ cookieAuth: [] }]
 *     responses: { 201: { description: Bài mới }, 422: { description: Dữ liệu không hợp lệ } }
 * /seller/posts/{id}:
 *   put: { tags: [Bán & Đăng việc], summary: Sửa bài của tôi, security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 404: { description: Không phải bài của bạn } } }
 *   patch: { tags: [Bán & Đăng việc], summary: "Sửa nhanh: closed (đóng/mở), price, stockLeft", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Bán & Đăng việc], summary: Xóa bài (không xóa được khi còn đơn đang xử lý hoặc nằm trong combo), security: [{ cookieAuth: [] }], responses: { 204: { description: Đã xóa } } }
 */
router.get('/posts', asyncHandler(async (req, res) => res.json({ data: await service.listPosts(req.user) })));
router.post('/posts', body(anyObject), asyncHandler(async (req, res) => res.status(201).json({ data: await service.createPost(req.user, req.body) })));
router.put('/posts/:id', ids('id'), body(anyObject), asyncHandler(async (req, res) => res.json({ data: await service.updatePost(req.user, req.params.id, req.body) })));
router.patch('/posts/:id', ids('id'), body(patchPost), asyncHandler(async (req, res) => res.json({ data: await service.patchPost(req.user, req.params.id, req.body) })));
router.delete('/posts/:id', ids('id'), asyncHandler(async (req, res) => { await service.removePost(req.user, req.params.id); res.status(204).end(); }));

/**
 * @openapi
 * /seller/jobs:
 *   get: { tags: [Bán & Đăng việc], summary: Việc làm tôi đăng, security: [{ cookieAuth: [] }], responses: { 200: { description: "{ data: Job[] }" } } }
 *   post: { tags: [Bán & Đăng việc], summary: Đăng việc mới, security: [{ cookieAuth: [] }], responses: { 201: { description: Việc mới } } }
 * /seller/jobs/{id}:
 *   put: { tags: [Bán & Đăng việc], summary: Sửa việc của tôi, security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 *   patch: { tags: [Bán & Đăng việc], summary: "Đóng / mở lại việc (body { closed })", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Bán & Đăng việc], summary: Xóa việc (không xóa khi còn đề nghị đang hoạt động), security: [{ cookieAuth: [] }], responses: { 204: { description: Đã xóa } } }
 */
router.get('/jobs', asyncHandler(async (req, res) => res.json({ data: await service.listJobs(req.user) })));
router.post('/jobs', body(anyObject), asyncHandler(async (req, res) => res.status(201).json({ data: await service.createJob(req.user, req.body) })));
router.put('/jobs/:id', ids('id'), body(anyObject), asyncHandler(async (req, res) => res.json({ data: await service.updateJob(req.user, req.params.id, req.body) })));
router.patch('/jobs/:id', ids('id'), body(patchJob), asyncHandler(async (req, res) => res.json({ data: await service.patchJob(req.user, req.params.id, req.body) })));
router.delete('/jobs/:id', ids('id'), asyncHandler(async (req, res) => { await service.removeJob(req.user, req.params.id); res.status(204).end(); }));

/**
 * @openapi
 * /seller/orders:
 *   get: { tags: [Bán & Đăng việc], summary: Đơn khách đặt cho tôi (kèm thông tin người mua), security: [{ cookieAuth: [] }], responses: { 200: { description: "{ data: Order[] }" } } }
 * /seller/orders/{id}/{action}:
 *   post:
 *     tags: [Bán & Đăng việc]
 *     summary: "Người bán xử lý đơn: confirm · prepare · deliver · ready · complete · decline · approveCancel · keepOrder · surcharge (amount, reason) · approveReturn · rejectReturn · đơn có báo giá: pickUp (đã lấy đồ / đã kiểm tra) · quote (lines) · returned (trả đồ / hoàn thành)"
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Đơn đã cập nhật }, 403: { description: Không phải đơn của bạn }, 409: { description: Sai trạng thái } }
 */
router.get('/orders', asyncHandler(async (req, res) => res.json({ data: await service.listOrders(req.user) })));
router.post('/orders/:id/:action', ids('id'), body(surcharge), asyncHandler(async (req, res) => res.json({ data: await service.orderAction(req.user, req.params.id, req.params.action, req.body) })));

/**
 * @openapi
 * /seller/offers:
 *   get: { tags: [Bán & Đăng việc], summary: Đề nghị nhận việc gửi tới việc tôi đăng, security: [{ cookieAuth: [] }], responses: { 200: { description: "{ data: Offer[] }" } } }
 * /seller/offers/{id}/{action}:
 *   post: { tags: [Bán & Đăng việc], summary: "Người đăng việc: choose · reject · confirmDone", security: [{ cookieAuth: [] }], responses: { 200: { description: Đề nghị đã cập nhật }, 409: { description: Sai trạng thái } } }
 * /seller/questions/{id}/answer:
 *   post: { tags: [Bán & Đăng việc], summary: Trả lời hỏi đáp của việc tôi đăng, security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get('/offers', asyncHandler(async (req, res) => res.json({ data: await service.listOffers(req.user) })));
router.post('/offers/:id/rate', ids('id'), body(z.object({ stars: z.number().int().min(1).max(5), text: z.string().trim().max(500).optional() })), asyncHandler(async (req, res) => res.json({ data: await service.rateOffer(req.user, req.params.id, req.body) })));
router.post('/offers/:id/:action', ids('id'), asyncHandler(async (req, res) => res.json({ data: await service.offerAction(req.user, req.params.id, req.params.action) })));
router.post('/questions/:id/answer', ids('id'), body(z.object({ text: z.string().trim().min(2) })), asyncHandler(async (req, res) => res.json({ data: await service.answerQuestion(req.user, req.params.id, req.body.text) })));

const verifyBody = z.object({
  fullName: z.string().trim().min(2, 'Nhập họ tên đúng giấy tờ'),
  idNumber: z.string().regex(/^\d{12}$/, 'Số CCCD gồm 12 chữ số'),
  idFront: z.string().min(1, 'Thiếu ảnh mặt trước'),
  idBack: z.string().min(1, 'Thiếu ảnh mặt sau'),
  selfie: z.string().min(1, 'Thiếu ảnh chân dung'),
  shopName: z.string().trim().min(2, 'Nhập tên gian hàng'),
  shopType: z.enum(['food', 'goods', 'service'], { error: 'Chọn loại gian hàng' }),
  intro: z.string().trim().max(500).optional(),
});

/**
 * @openapi
 * /seller/verification:
 *   get: { tags: [Bán & Đăng việc], summary: "Trạng thái xác minh người bán của tôi: none · pending · approved · rejected", security: [{ cookieAuth: [] }], responses: { 200: { description: "{ data: { status, submittedAt?, reviewedAt?, rejectReason?, body? } }" } } }
 *   post: { tags: [Bán & Đăng việc], summary: Nộp / nộp lại hồ sơ (không nộp khi đang chờ hoặc đã duyệt), security: [{ cookieAuth: [] }], responses: { 201: { description: Đã nộp, chờ duyệt }, 409: { description: Đang chờ / đã duyệt }, 422: { description: Hồ sơ chưa đủ } } }
 */
router.get('/verification', asyncHandler(async (req, res) => res.json({ data: await verification.mine(req.user) })));
router.post('/verification', body(verifyBody), asyncHandler(async (req, res) => res.status(201).json({ data: await verification.submit(req.user, req.body) })));


const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ dạng HH:mm');
const shopBody = z.object({
  name: z.string().trim().min(2, 'Tên gian hàng tối thiểu 2 ký tự').max(60).optional(),
  kind: z.string().trim().max(40).optional(),
  address: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(600).optional(),
  // ảnh phải do server cấp (POST /uploads) hoặc link https — không nhận chuỗi ảnh nhúng sẵn (base64) làm phình dữ liệu
  avatar: z.string().regex(/^(\/images\/uploads\/[\w./-]+|https:\/\/\S+)$/, 'Ảnh đại diện phải tải lên qua /uploads').max(500).nullable().optional(),
  cover: z.string().regex(/^(\/images\/uploads\/[\w./-]+|https:\/\/\S+)$/, 'Ảnh bìa phải tải lên qua /uploads').max(500).nullable().optional(),
  replyTime: z.string().trim().max(60).optional(),
});
const hoursBody = z.object({ hours: z.array(z.object({ on: z.boolean(), from: hhmm, to: hhmm })).length(7, 'Cần đủ giờ của 7 ngày') });
const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày dạng yyyy-mm-dd');
const offBody = z.object({ date: dateParam, note: z.string().trim().max(120).optional() });
const pauseBody = z.object({ until: dateParam });
const replyBody = z.object({ text: z.string().trim().min(2, 'Phản hồi tối thiểu 2 ký tự').max(500) });

/**
 * @openapi
 * /seller/shop:
 *   get: { tags: [Bán & Đăng việc], summary: "Hồ sơ gian hàng của tôi + số liệu thật (đánh giá, đơn hoàn thành, người theo dõi, lượt xem), giờ nhận đơn, ngày nghỉ, tạm ngưng", security: [{ cookieAuth: [] }], responses: { 200: { description: "{ shop, hours[7], offs[], pause }" } } }
 *   put: { tags: [Bán & Đăng việc], summary: "Sửa hồ sơ gian hàng (tên, loại, địa chỉ, giới thiệu, ảnh bìa, thời gian trả lời)", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /seller/shop/hours:
 *   put: { tags: [Bán & Đăng việc], summary: "Giờ nhận đơn 7 ngày (hours[0] = Thứ Hai)", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /seller/shop/offs:
 *   put: { tags: [Bán & Đăng việc], summary: "Thêm / sửa ngày nghỉ { date, note }", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /seller/shop/offs/{date}:
 *   delete: { tags: [Bán & Đăng việc], summary: Bỏ ngày nghỉ, security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /seller/shop/pause:
 *   put: { tags: [Bán & Đăng việc], summary: "Tạm ngưng nhận đơn đến ngày { until }", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Bán & Đăng việc], summary: Mở lại nhận đơn, security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /seller/stats:
 *   get: { tags: [Bán & Đăng việc], summary: "Hiệu quả theo 5 mốc today · 7 · 30 · 90 · year (thu nhập, đơn xong, đánh giá, lượt xem, lượt lưu, biểu đồ) — tính từ dữ liệu thật", security: [{ cookieAuth: [] }], responses: { 200: { description: "{ data: { today, 7, 30, 90, year } }" } } }
 * /seller/reviews:
 *   get: { tags: [Bán & Đăng việc], summary: Đánh giá khách dành cho tôi, security: [{ cookieAuth: [] }], responses: { 200: { description: "{ data: Review[] }" } } }
 * /seller/reviews/{id}/reply:
 *   post: { tags: [Bán & Đăng việc], summary: Phản hồi một đánh giá (mỗi đánh giá một lần), security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 409: { description: Đã phản hồi } } }
 */
router.get('/shop', asyncHandler(async (req, res) => res.json({ data: await shop.getShop(req.user) })));
router.put('/shop', body(shopBody), asyncHandler(async (req, res) => res.json({ data: await shop.updateShop(req.user, req.body) })));
router.put('/shop/hours', body(hoursBody), asyncHandler(async (req, res) => res.json({ data: await shop.setHours(req.user, req.body.hours) })));
router.put('/shop/offs', body(offBody), asyncHandler(async (req, res) => res.json({ data: await shop.setOff(req.user, req.body.date, req.body.note || '') })));
router.delete('/shop/offs/:date', asyncHandler(async (req, res) => {
  const date = dateParam.safeParse(req.params.date);
  if (!date.success) throw ApiError.badRequest('Ngày dạng yyyy-mm-dd');
  res.json({ data: await shop.setOff(req.user, date.data, null) });
}));
router.put('/shop/pause', body(pauseBody), asyncHandler(async (req, res) => res.json({ data: await shop.setPause(req.user, req.body.until) })));
router.delete('/shop/pause', asyncHandler(async (req, res) => res.json({ data: await shop.setPause(req.user, null) })));
router.get('/stats', asyncHandler(async (req, res) => res.json({ data: await shop.stats(req.user) })));
router.get('/reviews', asyncHandler(async (req, res) => res.json({ data: await shop.listReviews(req.user) })));
router.post('/reviews/:id/reply', ids('id'), body(replyBody), asyncHandler(async (req, res) => res.json({ data: await shop.replyReview(req.user, req.params.id, req.body.text) })));

module.exports = router;
