const router = require('express').Router();
const { z } = require('zod');
const service = require('./seller.service');
const verification = require('./verification.service');
const asyncHandler = require('../../utils/asyncHandler');
const { body, ids } = require('../../middlewares/validate');
const { auth } = require('../../middlewares/auth');

router.use(auth);

// Nội dung bài/việc: model Mongoose mới là nơi kiểm tra chi tiết (kiểu, enum, ràng buộc); ở đây chỉ chặn body rỗng/sai kiểu
const anyObject = z.object({}).passthrough();
const patchPost = z.object({ closed: z.boolean().optional(), price: z.number().int().min(0).optional(), stockLeft: z.number().int().min(0).optional() })
  .refine((v) => Object.keys(v).length > 0, 'Cần ít nhất một trường để sửa');
const patchJob = z.object({ closed: z.boolean() });
const surcharge = z.object({ amount: z.number().int().min(1000).optional(), reason: z.string().trim().optional() });

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
 *     summary: "Người bán xử lý đơn: confirm · prepare · deliver · ready · complete · decline · approveCancel · keepOrder · surcharge (amount, reason) · approveReturn · rejectReturn"
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

module.exports = router;
