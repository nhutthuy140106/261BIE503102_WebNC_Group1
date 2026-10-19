const router = require('express').Router();
const mongoose = require('mongoose');
const { z } = require('zod');
const Review = require('./review.model');
const Order = require('../order/order.model');
const Offer = require('../offer/offer.model');
const Job = require('../../shared/job.model');
const { notify } = require('../../shared/notify');
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const { parsePaging } = require('../../../utils/pagination');
const { body, query } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Mã sai định dạng');

const createSchema = z.object({
  targetType: z.enum(['order', 'offer'], { error: 'targetType phải là order hoặc offer' }),
  targetId: oid,
  rating: z.number({ error: 'Cần chọn số sao' }).int().min(1, 'Số sao từ 1 đến 5').max(5, 'Số sao từ 1 đến 5'),
  comment: z.string().trim().max(1000).default(''),
  images: z.array(z.string().regex(/^\/images\/uploads\/[\w-]+\.(png|jpg|webp)$/, 'Ảnh phải tải lên qua /uploads')).max(6).default([]),
});

const listSchema = z.object({
  postId: oid.optional(),
  userId: oid.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hasPhoto: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'oldest', 'high', 'low']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).refine((o) => o.postId || o.userId, { message: 'Cần postId hoặc userId', path: ['postId'] });

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Đánh giá]
 *     summary: Đánh giá sau khi đơn/việc hoàn thành
 *     description: order = người mua đánh giá người bán; offer = người nhận việc đánh giá người đăng việc.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, rating]
 *             properties:
 *               targetType: { type: string, enum: [order, offer] }
 *               targetId: { type: string }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *               images: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Đã đánh giá }
 *       403: { description: Không phải đơn/việc của bạn }
 *       404: { description: Không tìm thấy đơn/việc }
 *       409: { description: Chưa hoàn thành hoặc đã đánh giá rồi }
 *       422: { description: rating ngoài 1–5 }
 *   get:
 *     tags: [Đánh giá]
 *     summary: Danh sách đánh giá + thống kê sao (theo bài hoặc theo người)
 *     parameters:
 *       - { name: postId, in: query, schema: { type: string } }
 *       - { name: userId, in: query, schema: { type: string } }
 *       - { name: rating, in: query, schema: { type: integer } }
 *       - { name: hasPhoto, in: query, schema: { type: boolean } }
 *       - { name: sort, in: query, schema: { type: string, enum: [newest, oldest, high, low] } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: { average, count, distribution, items }, meta }" }
 *       422: { description: Thiếu postId/userId }
 */
router.post('/', auth, body(createSchema), asyncHandler(async (req, res) => {
  const { targetType, targetId, rating, comment, images } = req.body;
  let target; let post;
  let source;

  if (targetType === 'order') {
    source = await Order.findById(targetId);
    if (!source) throw ApiError.notFound('Không tìm thấy đơn');
    if (String(source.buyer) !== String(req.user._id)) throw ApiError.forbidden('Chỉ đánh giá được đơn của chính bạn');
    if (source.state !== 'done') throw ApiError.invalidState('Đơn chưa hoàn thành nên chưa đánh giá được');
    target = source.seller; post = source.post;
  } else {
    source = await Offer.findById(targetId);
    if (!source) throw ApiError.notFound('Không tìm thấy việc');
    if (String(source.worker) !== String(req.user._id)) throw ApiError.forbidden('Chỉ đánh giá được việc của chính bạn');
    if (source.state !== 'done') throw ApiError.invalidState('Việc chưa hoàn thành nên chưa đánh giá được');
    target = (await Job.findById(source.job)).poster;
  }
  if (source.reviewed) throw ApiError.duplicate('Bạn đã đánh giá rồi');

  const review = await Review.create({ reviewer: req.user._id, target, targetType, targetId, post, rating, comment, images })
    .catch((e) => { if (e.code === 11000) throw ApiError.duplicate('Bạn đã đánh giá rồi'); throw e; });
  source.reviewed = true;
  await source.save();
  await notify(target, { type: 'review_new', title: `${req.user.name} đã đánh giá ${rating} sao`, body: comment, link: { type: targetType, id: targetId } });
  res.status(201).json({ data: review });
}));

router.get('/', query(listSchema), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const { page, limit, skip } = parsePaging(q);
  const base = {};
  if (q.postId) base.post = new mongoose.Types.ObjectId(q.postId);
  if (q.userId) base.target = new mongoose.Types.ObjectId(q.userId);

  // thống kê sao tính trên toàn bộ đánh giá của bài/người (không bị lọc sao/ảnh làm méo)
  const stats = await Review.aggregate([
    { $match: base },
    { $group: { _id: '$rating', n: { $sum: 1 } } },
  ]);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let count = 0; let sum = 0;
  for (const s of stats) { distribution[s._id] = s.n; count += s.n; sum += s._id * s.n; }

  const filter = { ...base };
  if (q.rating) filter.rating = q.rating;
  if (q.hasPhoto === 'true') filter['images.0'] = { $exists: true };
  const sort = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, high: { rating: -1, createdAt: -1 }, low: { rating: 1, createdAt: -1 } }[q.sort || 'newest'];
  const [items, total] = await Promise.all([
    Review.find(filter).sort(sort).skip(skip).limit(limit).populate('reviewer', 'name avatar'),
    Review.countDocuments(filter),
  ]);
  res.json({
    data: { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution, items },
    meta: { page, limit, total },
  });
}));

module.exports = router;
