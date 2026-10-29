// Nháp đơn lưu trong SESSION (req.session.cart): dữ liệu tạm, mất khi hết phiên — khác với đơn (dữ liệu bền trong MongoDB).
// Khách chưa đăng nhập vẫn thêm món được; chỉ checkout mới cần đăng nhập.
const router = require('express').Router();
const { z } = require('zod');
const Post = require('../../shared/post.model');
const orders = require('../order/order.service');
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const { body, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');
const { effectivePrice } = require('../../../utils/promo');

const MAX_ITEMS = 20;
const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Mã sai định dạng');

const itemSchema = z.object({
  postId: oid,
  quantity: z.number({ error: 'Cần nhập số lượng' }).int().min(1, 'Số lượng tối thiểu 1').max(99),
  selections: z.array(z.object({ group: z.string(), choices: z.array(z.string()) })).default([]),
  answers: z.array(z.object({ question: z.string(), value: z.string().max(500) })).default([]),
});

const checkoutSchema = z.object({
  fulfillment: z.enum(['delivery', 'pickup'], { error: 'fulfillment phải là delivery hoặc pickup' }),
  addressId: oid.optional(),
  scheduledAt: z.coerce.date().optional(),
  utensils: z.boolean().optional(),
  note: z.string().trim().max(300).optional(),
  voucherCode: z.string().trim().max(30).optional(),
  payment: z.enum(['cash', 'transfer'], { error: 'payment phải là cash hoặc transfer' }),
});

const cartOf = (req) => { if (!req.session.cart) req.session.cart = []; return req.session.cart; };

// Giá/tên luôn lấy lại từ DB lúc xem; giỏ chỉ nhớ "chọn bài nào, bao nhiêu, tùy chọn gì"
async function present(cart) {
  const posts = await Post.find({ _id: { $in: cart.map((i) => i.postId) } });
  const byId = new Map(posts.map((p) => [String(p._id), p]));
  const items = cart.map((i) => {
    const p = byId.get(i.postId);
    if (!p) return { ...i, title: '(Bài không còn)', available: false, lineEstimate: 0 };
    const eff = effectivePrice(p);
    let perUnit = eff.price;
    for (const sel of i.selections) {
      const g = p.optionGroups.find((x) => x.name === sel.group);
      for (const label of sel.choices) perUnit += ((g && g.choices.find((c) => c.label === label)) || {}).price || 0;
    }
    return { ...i, title: p.title, image: p.images[0], unitPrice: eff.price, originalPrice: eff.promo ? eff.original : undefined, available: p.status === 'open', lineEstimate: perUnit * i.quantity };
  });
  return { items, estimate: items.reduce((n, i) => n + i.lineEstimate, 0) }; // chưa gồm phí giao/voucher: tính khi checkout
}

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Giỏ nháp]
 *     summary: Xem giỏ nháp trong phiên (không cần đăng nhập)
 *     responses:
 *       200: { description: "{ data: { items, estimate } } — giá lấy lại từ DB" }
 *   post:
 *     tags: [Giỏ nháp]
 *     summary: Thêm/thay món trong giỏ (mỗi bài một dòng, gửi lại cùng postId thì thay)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId, quantity]
 *             properties:
 *               postId: { type: string }
 *               quantity: { type: integer }
 *               selections: { type: array, items: { type: object, properties: { group: { type: string }, choices: { type: array, items: { type: string } } } } }
 *               answers: { type: array, items: { type: object, properties: { question: { type: string }, value: { type: string } } } }
 *     responses:
 *       200: { description: Giỏ sau khi thêm }
 *       404: { description: Bài không tồn tại }
 *       409: { description: Bài đã hết hàng/đóng, hoặc giỏ đầy (20 món) }
 *       422: { description: Dữ liệu sai }
 * /cart/{postId}:
 *   delete:
 *     tags: [Giỏ nháp]
 *     summary: Bỏ một món khỏi giỏ
 *     parameters: [{ name: postId, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Giỏ sau khi bỏ }
 *       400: { description: Id sai định dạng }
 * /cart/checkout:
 *   post:
 *     tags: [Giỏ nháp]
 *     summary: Đặt toàn bộ giỏ thành đơn (cần đăng nhập)
 *     description: Mỗi món thành một đơn (đơn gắn một bài). Tổng tiền tính lại ở server. Voucher chỉ áp cho đơn đầu tiên. Có món lỗi thì không tạo đơn nào và giỏ được giữ nguyên.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fulfillment, payment]
 *             properties:
 *               fulfillment: { type: string, enum: [delivery, pickup] }
 *               addressId: { type: string }
 *               scheduledAt: { type: string, format: date-time }
 *               utensils: { type: boolean }
 *               note: { type: string }
 *               voucherCode: { type: string }
 *               payment: { type: string, enum: [cash, transfer] }
 *     responses:
 *       201: { description: "{ data: Order[] } và giỏ được xóa" }
 *       401: { description: Chưa đăng nhập (giỏ vẫn còn trong phiên) }
 *       409: { description: Giỏ trống hoặc có món hết hàng }
 *       422: { description: Một món không hợp lệ (details cho biết món nào) }
 */
router.get('/', asyncHandler(async (req, res) => res.json({ data: await present(cartOf(req)) })));

router.post('/', body(itemSchema), asyncHandler(async (req, res) => {
  const cart = cartOf(req);
  const post = await Post.findById(req.body.postId);
  if (!post) throw ApiError.notFound('Bài không tồn tại');
  if (post.status !== 'open') throw ApiError.invalidState('Bài đã hết hàng hoặc không còn hiển thị');
  const idx = cart.findIndex((i) => i.postId === req.body.postId);
  if (idx < 0 && cart.length >= MAX_ITEMS) throw ApiError.invalidState(`Giỏ nháp tối đa ${MAX_ITEMS} món`);
  if (idx >= 0) cart[idx] = req.body; else cart.push(req.body);
  res.json({ data: await present(cart) });
}));

router.delete('/:postId', ids('postId'), asyncHandler(async (req, res) => {
  req.session.cart = cartOf(req).filter((i) => i.postId !== req.params.postId);
  res.json({ data: await present(req.session.cart) });
}));

router.post('/checkout', auth, body(checkoutSchema), asyncHandler(async (req, res) => {
  const cart = cartOf(req);
  if (!cart.length) throw ApiError.invalidState('Giỏ nháp đang trống');

  const inputs = cart.map((item, i) => ({
    ...item,
    ...req.body,
    voucherCode: i === 0 ? req.body.voucherCode : undefined, // một voucher cho cả lần đặt
  }));
  // kiểm hết trước rồi mới ghi, để không tạo dở dang
  const prepared = [];
  for (const input of inputs) {
    try { prepared.push(await orders.prepare(req.user, input)); } catch (e) {
      if (e.details) e.details = e.details.map((d) => ({ ...d, postId: input.postId }));
      throw e;
    }
  }
  const created = [];
  for (let i = 0; i < inputs.length; i++) created.push(await orders.commit(req.user, inputs[i], prepared[i]));
  req.session.cart = [];
  res.status(201).json({ data: created });
}));

module.exports = router;
