const router = require('express').Router();
const { z } = require('zod');
const mongoose = require('mongoose');
const Report = require('./report.model');
const Order = require('../order/order.model');
const Offer = require('../offer/offer.model');
const Post = require('../../shared/post.model');
const Job = require('../../shared/job.model');
const User = require('../../shared/user.model');
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const { parsePaging } = require('../../../utils/pagination');
const { body, query } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const schema = z.object({
  targetType: z.enum(['order', 'offer', 'post', 'job', 'user'], { error: 'targetType không hợp lệ' }),
  targetId: z.string().regex(/^[a-f\d]{24}$/i, 'Mã sai định dạng'),
  reason: z.enum(['not_received', 'quality', 'payment', 'abuse', 'other'], { error: 'Cần chọn lý do' }),
  detail: z.string({ error: 'Cần mô tả vấn đề' }).trim().min(10, 'Mô tả tối thiểu 10 ký tự').max(1000),
  images: z.array(z.string().regex(/^\/images\/uploads\/[\w-]+\.(png|jpg|webp)$/, 'Ảnh phải tải lên qua /uploads')).max(4).default([]),
});
const listSchema = z.object({
  mine: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const MODELS = { order: Order, offer: Offer, post: Post, job: Job, user: User };

// Đơn/đề nghị: chỉ người liên quan mới báo cáo được (403). Bài/việc/người: chỉ cần tồn tại.
async function assertAllowed(user, targetType, targetId) {
  const doc = await MODELS[targetType].findById(targetId);
  if (!doc) throw ApiError.notFound('Đối tượng báo cáo không tồn tại');
  const me = String(user._id);
  if (targetType === 'order' && ![doc.buyer, doc.seller].some((u) => String(u) === me)) throw ApiError.forbidden('Đây không phải đơn của bạn');
  if (targetType === 'offer') {
    const job = await Job.findById(doc.job);
    if (![doc.worker, job && job.poster].some((u) => String(u) === me)) throw ApiError.forbidden('Đây không phải việc của bạn');
  }
}

/**
 * @openapi
 * /reports:
 *   post:
 *     tags: [Báo cáo]
 *     summary: Gửi báo cáo vấn đề với đơn/việc/bài/người dùng (state = open)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, reason, detail]
 *             properties:
 *               targetType: { type: string, enum: [order, offer, post, job, user] }
 *               targetId: { type: string }
 *               reason: { type: string, enum: [not_received, quality, payment, abuse, other] }
 *               detail: { type: string, minLength: 10 }
 *               images: { type: array, maxItems: 4, items: { type: string } }
 *     responses:
 *       201: { description: "{ data: { _id, state: open, createdAt } }" }
 *       403: { description: Đơn/việc không liên quan tới bạn }
 *       404: { description: Đối tượng không tồn tại }
 *       422: { description: Thiếu lý do hoặc mô tả quá ngắn }
 *   get:
 *     tags: [Báo cáo]
 *     summary: Báo cáo tôi đã gửi (chỉ thấy báo cáo của mình)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: mine, in: query, schema: { type: boolean } }
 *       - { name: page, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Report[], meta }" }
 */
router.use(auth);

router.post('/', body(schema), asyncHandler(async (req, res) => {
  await assertAllowed(req.user, req.body.targetType, req.body.targetId);
  const r = await Report.create({ ...req.body, reporter: req.user._id, state: 'open', history: [{ state: 'open', at: new Date() }] });
  res.status(201).json({ data: r });
}));

router.get('/', query(listSchema), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.valid.query);
  // luôn khóa theo người gửi; tham số mine chỉ để khớp hợp đồng. Admin xem tất cả ở module Admin.
  const filter = { reporter: new mongoose.Types.ObjectId(String(req.user._id)) };
  const [items, total] = await Promise.all([
    Report.find(filter).select('-handledBy').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);
  res.json({ data: items, meta: { page, limit, total } });
}));

module.exports = router;
