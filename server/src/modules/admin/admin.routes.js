const router = require('express').Router();
const { z } = require('zod');
const service = require('./admin.service');
const asyncHandler = require('../../utils/asyncHandler');
const { body, query, ids } = require('../../middlewares/validate');
const { auth, requireRole } = require('../../middlewares/auth');

const paging = { page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() };
const reason = z.object({ reason: z.string({ error: 'Cần ghi lý do' }).trim().min(5, 'Lý do tối thiểu 5 ký tự').max(300) });

const userList = z.object({
  role: z.enum(['enduser', 'admin']).optional(),
  status: z.enum(['active', 'locked']).optional(),
  q: z.string().trim().max(60).optional(),
  ...paging,
});
const postList = z.object({
  status: z.enum(['open', 'soldout', 'closed', 'hidden']).optional(),
  type: z.enum(['food', 'goods', 'service']).optional(),
  q: z.string().trim().max(100).optional(),
  ...paging,
});
const reportList = z.object({ state: z.enum(['open', 'reviewing', 'resolved', 'rejected']).optional(), ...paging });
const roleBody = z.object({ role: z.enum(['enduser', 'admin'], { error: 'role phải là enduser hoặc admin' }) });
const transitionBody = z.object({
  to: z.enum(['reviewing', 'resolved', 'rejected'], { error: 'to phải là reviewing, resolved hoặc rejected' }),
  note: z.string().trim().max(500).optional(),
}).refine((o) => o.to === 'reviewing' || (o.note && o.note.length >= 3), { message: 'Cần ghi chú khi kết thúc báo cáo', path: ['note'] });

// Toàn bộ /admin/*: chưa đăng nhập 401, không phải admin 403
router.use(auth, requireRole('admin'));

const list = (fn) => asyncHandler(async (req, res) => {
  const { items, meta } = await fn(req.valid.query);
  res.json({ data: items, meta });
});
const one = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req) }));

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Danh sách người dùng
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: role, in: query, schema: { type: string, enum: [enduser, admin] } }
 *       - { name: status, in: query, schema: { type: string, enum: [active, locked] } }
 *       - { name: q, in: query, description: "tên hoặc số điện thoại", schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: User[], meta }" }
 *       401: { description: Chưa đăng nhập }
 *       403: { description: Không phải admin }
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Chi tiết người dùng (kèm số đơn đã đặt, số việc đã đăng)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tồn tại }
 * /admin/users/{id}/lock:
 *   post:
 *     tags: [Admin]
 *     summary: Khóa tài khoản (phiên đang có bị vô hiệu ở lần gọi kế tiếp)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [reason], properties: { reason: { type: string } } } } }
 *     responses:
 *       200: { description: Đã khóa }
 *       409: { description: Tự khóa mình, khóa admin cuối cùng, hoặc đã bị khóa }
 *       422: { description: Thiếu lý do }
 * /admin/users/{id}/unlock:
 *   post:
 *     tags: [Admin]
 *     summary: Mở khóa tài khoản
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Đã mở khóa }
 *       409: { description: Tài khoản không bị khóa }
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Đổi vai trò (không đổi được của chính mình)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [role], properties: { role: { type: string, enum: [enduser, admin] } } } } }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Đổi vai trò của chính mình, hoặc đã có vai trò đó }
 */
router.get('/users', query(userList), list(service.listUsers));
router.get('/users/:id', ids('id'), one((req) => service.getUser(req.params.id)));
router.post('/users/:id/lock', ids('id'), body(reason), one((req) => service.lockUser(req.user, req.params.id, req.body.reason)));
router.post('/users/:id/unlock', ids('id'), one((req) => service.unlockUser(req.user, req.params.id)));
router.patch('/users/:id/role', ids('id'), body(roleBody), one((req) => service.setRole(req.user, req.params.id, req.body.role)));

/**
 * @openapi
 * /admin/posts:
 *   get:
 *     tags: [Admin]
 *     summary: Danh sách bài (kể cả bài đã ẩn)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [open, soldout, closed, hidden] } }
 *       - { name: type, in: query, schema: { type: string, enum: [food, goods, service] } }
 *       - { name: q, in: query, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Post[], meta }" }
 * /admin/posts/{id}/hide:
 *   post:
 *     tags: [Admin]
 *     summary: Ẩn/gỡ bài vi phạm (không hiện ở /posts nữa), báo cho người bán
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [reason], properties: { reason: { type: string } } } } }
 *     responses:
 *       200: { description: Đã ẩn }
 *       409: { description: Bài đã bị ẩn }
 *       422: { description: Thiếu lý do }
 * /admin/posts/{id}/unhide:
 *   post:
 *     tags: [Admin]
 *     summary: Hiện lại bài (về đúng trạng thái trước khi ẩn)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Đã hiện lại }
 *       409: { description: Bài không bị ẩn }
 */
router.get('/posts', query(postList), list(service.listPosts));
router.post('/posts/:id/hide', ids('id'), body(reason), one((req) => service.hidePost(req.user, req.params.id, req.body.reason)));
router.post('/posts/:id/unhide', ids('id'), one((req) => service.unhidePost(req.user, req.params.id)));

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: Hàng đợi báo cáo (cũ nhất trước)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: state, in: query, schema: { type: string, enum: [open, reviewing, resolved, rejected] } }
 *       - { name: page, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Report[], meta }" }
 * /admin/reports/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Chi tiết báo cáo
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tồn tại }
 * /admin/reports/{id}/transition:
 *   post:
 *     tags: [Admin]
 *     summary: Đổi trạng thái open → reviewing → resolved|rejected (kèm ghi chú; người báo cáo được thông báo)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [to], properties: { to: { type: string, enum: [reviewing, resolved, rejected] }, note: { type: string } } } } }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Chuyển trạng thái không hợp lệ }
 *       422: { description: Kết thúc báo cáo mà thiếu ghi chú }
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Tổng quan (đếm từ dữ liệu thật bằng aggregation)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: "{ data: { users, posts, jobs, orders, reports } }" }
 *       403: { description: Không phải admin }
 */
router.get('/reports', query(reportList), list(service.listReports));
router.get('/reports/:id', ids('id'), one((req) => service.getReport(req.params.id)));
router.post('/reports/:id/transition', ids('id'), body(transitionBody), one((req) => service.transitionReport(req.user, req.params.id, req.body.to, req.body.note)));

router.get('/stats', one(() => service.stats()));

module.exports = router;
