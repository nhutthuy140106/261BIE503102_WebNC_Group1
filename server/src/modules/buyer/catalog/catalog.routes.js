const router = require('express').Router();
const service = require('./catalog.service');
const v = require('./catalog.validation');
const asyncHandler = require('../../../utils/asyncHandler');
const { query } = require('../../../middlewares/validate');
const { optionalAuth } = require('../../../middlewares/auth');

/**
 * @openapi
 * /posts:
 *   get:
 *     tags: [Khám phá]
 *     summary: Danh sách bài (đồ ăn, đồ dùng, dịch vụ) còn mở
 *     parameters:
 *       - { name: type, in: query, schema: { type: string, enum: [food, goods, service] } }
 *       - { name: area, in: query, schema: { type: string } }
 *       - { name: q, in: query, schema: { type: string } }
 *       - { name: minPrice, in: query, schema: { type: number } }
 *       - { name: maxPrice, in: query, schema: { type: number } }
 *       - { name: acceptsXu, in: query, schema: { type: boolean } }
 *       - { name: sort, in: query, schema: { type: string, enum: [nearest, newest, price, -price] } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Post[], meta }; mỗi bài có seller là UserSummary { _id, name, avatar (URL hoặc null), area } và slug" }
 *       422: { description: Tham số sai (vd minPrice > maxPrice) }
 * /posts/{id}:
 *   get:
 *     tags: [Khám phá]
 *     summary: Chi tiết bài (kèm các khối đặt hàng); nhận id hoặc slug-có-id (vd bun-bo-<id>)
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Id sai định dạng }
 *       404: { description: Không tồn tại }
 * /jobs:
 *   get:
 *     tags: [Khám phá]
 *     summary: Danh sách việc làm đang mở (không có địa chỉ chính xác)
 *     parameters:
 *       - { name: area, in: query, schema: { type: string } }
 *       - { name: q, in: query, schema: { type: string } }
 *       - { name: minPay, in: query, schema: { type: number } }
 *       - { name: sort, in: query, schema: { type: string, enum: [newest, nearest, -pay] } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Job[], meta }; mỗi việc có poster là UserSummary { _id, name, avatar (URL hoặc null), area }" }
 * /jobs/{id}:
 *   get:
 *     tags: [Khám phá]
 *     summary: Chi tiết việc; có myOffer nếu đã đăng nhập và đã gửi đề nghị
 *     description: Địa chỉ chính xác (exactAddress) không bao giờ có ở đây.
 *     security: [{}, { cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Id sai định dạng }
 *       404: { description: Không tồn tại }
 * /search:
 *   get:
 *     tags: [Khám phá]
 *     summary: Tìm chung bài + việc
 *     parameters:
 *       - { name: q, in: query, required: true, schema: { type: string } }
 *       - { name: type, in: query, schema: { type: string, enum: [food, goods, service, job] } }
 *       - { name: area, in: query, schema: { type: string } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: { posts, jobs, totals: { posts, jobs } } }" }
 *       422: { description: Thiếu q }
 */
const wrap = (fn) => asyncHandler(async (req, res) => {
  const out = await fn(req);
  res.json(out.items ? { data: out.items, meta: out.meta } : { data: out });
});

router.get('/posts', query(v.posts), wrap((req) => service.listPosts(req.valid.query)));
router.get('/posts/:id', optionalAuth, wrap((req) => service.getPost(req.params.id, req.user)));
router.get('/jobs', query(v.jobs), wrap((req) => service.listJobs(req.valid.query)));
router.get('/jobs/:id', optionalAuth, wrap((req) => service.getJob(req.params.id, req.user)));
router.get('/search', query(v.search), wrap((req) => service.search(req.valid.query)));

module.exports = router;
