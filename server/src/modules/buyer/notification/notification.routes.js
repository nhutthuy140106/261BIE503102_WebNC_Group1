const router = require('express').Router();
const { z } = require('zod');
const Notification = require('./notification.model');
const asyncHandler = require('../../../utils/asyncHandler');
const { parsePaging } = require('../../../utils/pagination');
const { body, query } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const listSchema = z.object({
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
const readSchema = z.object({ ids: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Mã sai định dạng')).optional() });

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Thông báo]
 *     summary: Danh sách thông báo của tôi (mới nhất trước)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: unread, in: query, schema: { type: boolean } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Notification[], meta }" }
 * /notifications/unread-count:
 *   get:
 *     tags: [Thông báo]
 *     summary: Số chưa đọc (chấm chuông)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: "{ data: { count } }" }
 * /notifications/read:
 *   post:
 *     tags: [Thông báo]
 *     summary: Đánh dấu đã đọc (gửi ids, bỏ trống = đọc tất cả)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { ids: { type: array, items: { type: string } } } } } }
 *     responses:
 *       200: { description: "{ data: { updated } }" }
 *       422: { description: ids sai định dạng }
 */
router.use(auth);

router.get('/', query(listSchema), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const { page, limit, skip } = parsePaging(q);
  const filter = { user: req.user._id, ...(q.unread === 'true' ? { read: false } : {}) };
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);
  res.json({ data: items, meta: { page, limit, total } });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  res.json({ data: { count: await Notification.countDocuments({ user: req.user._id, read: false }) } });
}));

router.post('/read', body(readSchema), asyncHandler(async (req, res) => {
  // luôn khóa theo user: không đánh dấu hộ thông báo của người khác
  const filter = { user: req.user._id, read: false, ...(req.body.ids ? { _id: { $in: req.body.ids } } : {}) };
  const r = await Notification.updateMany(filter, { read: true });
  res.json({ data: { updated: r.modifiedCount } });
}));

module.exports = router;
