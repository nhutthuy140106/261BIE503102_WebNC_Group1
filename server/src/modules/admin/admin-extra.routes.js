// Các API quản trị mở rộng, gắn vào /api/admin (đã qua auth + vai trò admin/moderator ở admin.routes.js).
// Việc nhạy cảm (voucher, Xu, thông báo hệ thống, cài đặt, xuất dữ liệu) chỉ admin; người kiểm duyệt (moderator) xử lý nội dung.
const router = require('express').Router();
const { z } = require('zod');
const service = require('./admin-extra.service');
const asyncHandler = require('../../utils/asyncHandler');
const { body, query, ids } = require('../../middlewares/validate');
const { requireRole } = require('../../middlewares/auth');

const adminOnly = requireRole('admin');
const paging = { page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() };
const note = (min = 5) => z.string({ error: 'Cần ghi lý do' }).trim().min(min, `Tối thiểu ${min} ký tự`).max(400);

const list = (fn) => asyncHandler(async (req, res) => { const { items, meta } = await fn(req.valid.query); res.json({ data: items, meta }); });
const one = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req) }));

/**
 * @openapi
 * /admin/dashboard:
 *   get: { tags: [Admin], summary: "Bảng điều khiển: việc cần xử lý, biểu đồ theo ngày, tỷ lệ, người bán hàng đầu", security: [{ cookieAuth: [] }], parameters: [{ name: days, in: query, schema: { type: integer, minimum: 7, maximum: 90 } }], responses: { 200: { description: OK } } }
 * /admin/orders:
 *   get: { tags: [Admin], summary: "Mọi đơn (lọc theo trạng thái, đang báo vấn đề, mã đơn)", security: [{ cookieAuth: [] }], responses: { 200: { description: Danh sách } } }
 * /admin/orders/{id}:
 *   get: { tags: [Admin], summary: "Chi tiết đơn; chat=1 kèm tin nhắn (ghi nhật ký)", security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 404: { description: Không có } } }
 * /admin/orders/{id}/issue:
 *   post: { tags: [Admin], summary: "Phân xử báo vấn đề: refund | redo | reject", security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 409: { description: Không có báo vấn đề cần phân xử } } }
 * /admin/orders/{id}/cancel:
 *   post: { tags: [Admin], summary: Hủy đơn đang xử lý khi có vi phạm, security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 409: { description: Đơn không còn xử lý } } }
 * /admin/audit:
 *   get: { tags: [Admin], summary: Nhật ký thao tác (chỉ xem), security: [{ cookieAuth: [] }], responses: { 200: { description: Danh sách } } }
 * /admin/users/{id}/profile:
 *   get: { tags: [Admin], summary: "Hồ sơ đầy đủ: đếm đơn/bài, xác minh, số dư + sổ Xu", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /admin/users/{id}/xu:
 *   post: { tags: [Admin], summary: "Cộng/trừ Xu thủ công kèm lý do (chỉ admin)", security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 403: { description: Không phải admin } } }
 * /admin/vouchers:
 *   get: { tags: [Admin], summary: Danh mục voucher đổi bằng Xu, security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { tags: [Admin], summary: Tạo voucher (chỉ admin), security: [{ cookieAuth: [] }], responses: { 201: { description: OK } } }
 * /admin/vouchers/{id}:
 *   patch: { tags: [Admin], summary: Sửa / bật / tắt voucher (chỉ admin), security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /admin/support:
 *   get: { tags: [Admin], summary: Hộp thư hỗ trợ, security: [{ cookieAuth: [] }], responses: { 200: { description: Danh sách } } }
 * /admin/announcements:
 *   get: { tags: [Admin], summary: Lịch sử thông báo hệ thống (chỉ admin), security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { tags: [Admin], summary: Gửi thông báo tới toàn khu hoặc một khu (chỉ admin), security: [{ cookieAuth: [] }], responses: { 201: { description: OK } } }
 * /admin/settings:
 *   get: { tags: [Admin], summary: "Từ khóa cấm, khu vực, danh mục", security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 *   put: { tags: [Admin], summary: Lưu cài đặt (chỉ admin), security: [{ cookieAuth: [] }], responses: { 200: { description: OK } } }
 * /admin/export/{what}:
 *   get: { tags: [Admin], summary: "Xuất CSV: users | orders | reports (chỉ admin)", security: [{ cookieAuth: [] }], responses: { 200: { description: text/csv } } }
 */
router.get('/dashboard', query(z.object({ days: z.coerce.number().int().min(7).max(90).optional() })), one((req) => service.dashboard(req.valid.query.days)));

router.get('/orders', query(z.object({
  state: z.enum(['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'delivering', 'ready', 'done', 'cancelled', 'declined']).optional(),
  issue: z.enum(['open', 'any']).optional(), q: z.string().trim().max(30).optional(), ...paging,
})), list(service.listOrders));
router.get('/orders/:id', ids('id'), query(z.object({ chat: z.enum(['0', '1']).optional() })), one((req) => service.getOrder(req.user, req.params.id, { chat: req.valid.query.chat === '1' })));
router.post('/orders/:id/issue', ids('id'), body(z.object({
  decision: z.enum(['refund', 'redo', 'reject'], { error: 'decision phải là refund, redo hoặc reject' }),
  amount: z.number().int().optional(), note: note(5),
})), one((req) => service.resolveIssue(req.user, req.params.id, req.body)));
router.post('/orders/:id/cancel', ids('id'), body(z.object({ reason: note(5) })), one((req) => service.cancelOrder(req.user, req.params.id, req.body.reason)));

router.get('/audit', query(z.object({ action: z.string().trim().max(30).optional(), targetType: z.string().trim().max(30).optional(), actor: z.string().optional(), ...paging })), list(service.listAudit));

router.get('/users/:id/profile', ids('id'), one((req) => service.userProfile(req.params.id)));
router.post('/users/:id/xu', adminOnly, ids('id'), body(z.object({
  delta: z.number({ error: 'Cần số Xu' }).int().refine((n) => n !== 0 && Math.abs(n) <= 1000, 'Số Xu từ 1 đến 1000 (âm = trừ)'), reason: note(5),
})), one((req) => service.adjustXu(req.user, req.params.id, req.body)));

const voucherBody = z.object({
  cid: z.string().trim().regex(/^[a-z0-9-]{2,20}$/, 'Mã gồm chữ thường, số, gạch ngang (2–20 ký tự)'),
  title: z.string().trim().min(3, 'Cần tên voucher').max(80),
  cond: z.string().trim().max(120).default(''),
  amount: z.number().int().min(0).default(0), ship: z.boolean().default(false), min: z.number().int().min(0).default(0),
  cost: z.number().int().min(1, 'Giá đổi tối thiểu 1 Xu').max(100000),
});
router.get('/vouchers', one(() => service.listVouchers()));
router.post('/vouchers', adminOnly, body(voucherBody), asyncHandler(async (req, res) => res.status(201).json({ data: await service.createVoucher(req.user, req.body) })));
router.patch('/vouchers/:id', adminOnly, ids('id'), body(z.object({
  title: z.string().trim().min(3).max(80).optional(), cond: z.string().trim().max(120).optional(),
  amount: z.number().int().min(0).optional(), ship: z.boolean().optional(), min: z.number().int().min(0).optional(),
  cost: z.number().int().min(1).max(100000).optional(), active: z.boolean().optional(),
})), one((req) => service.updateVoucher(req.user, req.params.id, req.body)));

router.get('/support', query(z.object({ state: z.enum(['open', 'answered', 'closed']).optional(), q: z.string().trim().max(20).optional(), ...paging })), list(service.listTickets));
router.get('/support/:id', ids('id'), one((req) => service.getTicket(req.params.id)));
router.post('/support/:id/reply', ids('id'), body(z.object({ text: z.string({ error: 'Cần nhập nội dung' }).trim().min(2, 'Nội dung quá ngắn').max(1500) })), one((req) => service.replyTicket(req.user, req.params.id, req.body.text)));
router.post('/support/:id/close', ids('id'), one((req) => service.closeTicket(req.user, req.params.id)));

router.get('/announcements', adminOnly, one(() => service.listAnnouncements()));
router.post('/announcements', adminOnly, body(z.object({
  title: z.string({ error: 'Cần tiêu đề' }).trim().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(100),
  body: z.string().trim().max(500).default(''), area: z.string().trim().min(1).max(20).default('all'),
})), asyncHandler(async (req, res) => res.status(201).json({ data: await service.announce(req.user, req.body) })));

router.get('/settings', one(() => service.getSettings()));
router.put('/settings', adminOnly, body(z.object({
  bannedKeywords: z.array(z.string()).max(300).optional(), areas: z.array(z.string()).max(40).optional(), categories: z.array(z.string()).max(60).optional(),
})), one((req) => service.saveSettings(req.user, req.body)));

router.get('/export/:what', adminOnly, asyncHandler(async (req, res) => {
  const csv = await service.exportCsv(req.user, req.params.what);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="antgo-${req.params.what}.csv"`);
  res.send(csv);
}));

module.exports = router;
