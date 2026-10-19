const router = require('express').Router();
const { z } = require('zod');
const service = require('./saved.service');
const asyncHandler = require('../../../utils/asyncHandler');
const { query, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const listQuery = z.object({ type: z.enum(['food', 'goods', 'service', 'job']).optional() });

/**
 * @openapi
 * /me/saved:
 *   get:
 *     tags: [Đã lưu]
 *     summary: Bài/việc đã lưu (kèm cờ available)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: type, in: query, schema: { type: string, enum: [food, goods, service, job] } }
 *     responses:
 *       200: { description: "{ data: [{ postId, type, title, price, area, available }] }" }
 *       401: { description: Chưa đăng nhập }
 *       422: { description: type sai }
 * /me/saved/{postId}:
 *   put:
 *     tags: [Đã lưu]
 *     summary: Lưu (lưu lại lần nữa không tạo bản ghi trùng)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: postId, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       204: { description: Đã lưu }
 *       400: { description: Id sai định dạng }
 *       404: { description: Bài không tồn tại }
 *   delete:
 *     tags: [Đã lưu]
 *     summary: Bỏ lưu
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: postId, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       204: { description: Đã bỏ lưu }
 */
router.use(auth);
router.get('/', query(listQuery), asyncHandler(async (req, res) =>
  res.json({ data: await service.list(req.user._id, req.valid.query.type) })));
router.put('/:postId', ids('postId'), asyncHandler(async (req, res) => {
  await service.save(req.user._id, req.params.postId);
  res.status(204).end();
}));
router.delete('/:postId', ids('postId'), asyncHandler(async (req, res) => {
  await service.unsave(req.user._id, req.params.postId);
  res.status(204).end();
}));

module.exports = router;
