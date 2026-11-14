// Quản trị AntGo duyệt hồ sơ xác minh người bán: GET /api/admin/seller-verifications · POST /:id/approve · POST /:id/reject
const router = require('express').Router();
const { z } = require('zod');
const verification = require('./verification.service');
const asyncHandler = require('../../utils/asyncHandler');
const { body, query, ids } = require('../../middlewares/validate');
const { auth, requireRole } = require('../../middlewares/auth');

router.use(auth, requireRole('admin'));

const listQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
const rejectBody = z.object({ reason: z.string({ error: 'Cần ghi lý do' }).trim().min(5, 'Lý do tối thiểu 5 ký tự').max(300) });

/**
 * @openapi
 * /admin/seller-verifications:
 *   get: { tags: [Quản trị], summary: "Hồ sơ xác minh người bán (mặc định chờ duyệt)", security: [{ cookieAuth: [] }], responses: { 200: { description: Danh sách } } }
 * /admin/seller-verifications/{id}/approve:
 *   post: { tags: [Quản trị], summary: Duyệt hồ sơ, security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 409: { description: Đã xử lý } } }
 * /admin/seller-verifications/{id}/reject:
 *   post: { tags: [Quản trị], summary: Từ chối hồ sơ (bắt buộc lý do), security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 422: { description: Thiếu lý do } } }
 */
router.get('/', query(listQuery), asyncHandler(async (req, res) => {
  const { items, meta } = await verification.list(req.valid.query);
  res.json({ data: items, meta });
}));
router.post('/:id/approve', ids('id'), asyncHandler(async (req, res) => res.json({ data: await verification.review(req.user, req.params.id, { approve: true }) })));
router.post('/:id/reject', ids('id'), body(rejectBody), asyncHandler(async (req, res) => res.json({ data: await verification.review(req.user, req.params.id, { approve: false, reason: req.body.reason }) })));

module.exports = router;
