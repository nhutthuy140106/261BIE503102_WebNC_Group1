const router = require('express').Router();
const { z } = require('zod');
const service = require('./pricing.service');
const asyncHandler = require('../../../utils/asyncHandler');
const { query } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const q = z.object({
  kind: z.enum(['food', 'goods', 'service', 'job']),
  title: z.string().trim().min(2).max(100),
  category: z.string().trim().max(40).optional(),
});

/**
 * @openapi
 * /pricing/suggest:
 *   get:
 *     tags: [Gợi ý]
 *     summary: Gợi ý khoảng giá/tiền công khi đăng bài hoặc việc (kNN trên bài tương tự)
 *     description: Tìm tối đa 7 bài cùng loại giống nhất (TF-IDF tên + danh mục), lấy trung vị có trọng số và phân vị 25–75%. Ít mẫu giống thì `confidence` = low.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: kind, in: query, required: true, schema: { type: string, enum: [food, goods, service, job] } }
 *       - { name: title, in: query, required: true, schema: { type: string } }
 *       - { name: category, in: query, schema: { type: string } }
 *     responses:
 *       200: { description: "{ data: { low, suggested, high, samples, confidence, basis } | null }" }
 *       401: { description: Chưa đăng nhập }
 *       422: { description: Tham số sai }
 */
router.get('/suggest', auth, query(q), asyncHandler(async (req, res) => res.json({ data: await service.suggest(req.valid.query) })));

module.exports = router;
