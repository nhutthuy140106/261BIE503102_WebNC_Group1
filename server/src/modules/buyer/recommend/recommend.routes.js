const router = require('express').Router();
const { z } = require('zod');
const service = require('./recommend.service');
const asyncHandler = require('../../../utils/asyncHandler');
const { query } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(20).optional() });
const shape = (rows) => rows.map((r) => ({ ...r.post.toJSON(), score: r.score, ...(r.reason ? { reason: r.reason } : {}) }));

/**
 * @openapi
 * /posts/{id}/similar:
 *   get:
 *     tags: [Gợi ý]
 *     summary: Bài tương tự (TF-IDF tên+mô tả+danh mục, cùng loại, gần giá, cùng khu)
 *     description: Mô tả thuật toán ở docs/thuat-toan-goi-y.md. Mỗi bài trả thêm `score` (0–1).
 *     parameters:
 *       - { name: id, in: path, required: true, description: "id hoặc slug-có-id", schema: { type: string } }
 *       - { name: limit, in: query, schema: { type: integer, default: 6 } }
 *     responses:
 *       200: { description: "{ data: Post[] kèm score }" }
 *       400: { description: Id/slug sai định dạng }
 *       404: { description: Bài không tồn tại }
 * /me/recommendations:
 *   get:
 *     tags: [Gợi ý]
 *     summary: Gợi ý cho bạn dựa trên bài đã lưu và đơn đã đặt
 *     description: Chưa có lịch sử thì trả bài mới trong khu của bạn (reason = new_in_area), không bịa sở thích.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: limit, in: query, schema: { type: integer, default: 8 } }
 *     responses:
 *       200: { description: "{ data: Post[] kèm score, reason }" }
 *       401: { description: Chưa đăng nhập }
 */
router.get('/posts/:id/similar', query(limitQuery), asyncHandler(async (req, res) =>
  res.json({ data: shape(await service.similar(req.params.id, req.valid.query.limit)) })));

router.get('/me/recommendations', auth, query(limitQuery), asyncHandler(async (req, res) =>
  res.json({ data: shape(await service.recommendations(req.user, req.valid.query.limit)) })));

module.exports = router;
