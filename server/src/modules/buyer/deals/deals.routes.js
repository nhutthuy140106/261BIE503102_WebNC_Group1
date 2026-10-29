const router = require('express').Router();
const { z } = require('zod');
const Post = require('../../shared/post.model');
const asyncHandler = require('../../../utils/asyncHandler');
const { query } = require('../../../middlewares/validate');
const { effectivePrice, upcomingPromo } = require('../../../utils/promo');

const dealsQuery = z.object({
  now: z.string().datetime({ offset: true }).optional(),
  area: z.enum(['A', 'B', 'C', 'D']).optional(),
  type: z.enum(['food', 'goods', 'service']).optional(),
});

// Dùng chung cho route và công cụ của trợ lý: bài đang Giờ vàng + bài sắp tới trong 3 giờ
async function listDeals({ now = new Date(), area, type } = {}) {
  const filter = { status: 'open', 'promo.active': true };
  if (area) filter.area = area;
  if (type) filter.type = type;
  const posts = await Post.find(filter).populate('seller', 'name avatar area');
  const active = []; const upcoming = [];
  for (const p of posts) {
    const e = effectivePrice(p, now);
    if (e.promo) { active.push({ ...p.toJSON(), deal: { price: e.price, original: e.original, label: e.promo.label, endsAt: e.promo.endsAt } }); continue; }
    const up = upcomingPromo(p, now);
    if (up) upcoming.push({ ...p.toJSON(), deal: null, upcoming: up });
  }
  active.sort((a, b) => a.deal.endsAt - b.deal.endsAt || (a._id > b._id ? 1 : -1)); // sắp hết giờ lên trước
  upcoming.sort((a, b) => a.upcoming.startsAt - b.upcoming.startsAt);
  return { now, active, upcoming };
}

/**
 * @openapi
 * /deals:
 *   get:
 *     tags: [Khám phá]
 *     summary: Bài đang "Giờ vàng" (giảm theo khung giờ) và bài sắp giảm trong 3 giờ tới
 *     description: Giờ tính theo Asia/Ho_Chi_Minh. `now` (ISO, có múi giờ) chỉ để demo/test, mặc định là giờ server. Giá trong `deal.price` là giá server sẽ tính khi đặt vào đúng lúc `now`.
 *     parameters:
 *       - { name: now, in: query, schema: { type: string, format: date-time } }
 *       - { name: area, in: query, schema: { type: string, enum: [A, B, C, D] } }
 *       - { name: type, in: query, schema: { type: string, enum: [food, goods, service] } }
 *     responses:
 *       200: { description: "{ data: { now, active: [Post + deal{price,original,label,endsAt}], upcoming: [Post + upcoming{label,startsAt}] } }" }
 *       422: { description: now sai định dạng }
 */
router.get('/', query(dealsQuery), asyncHandler(async (req, res) => {
  const { now, area, type } = req.valid.query;
  res.json({ data: await listDeals({ now: now ? new Date(now) : new Date(), area, type }) });
}));

module.exports = router;
module.exports.listDeals = listDeals;
