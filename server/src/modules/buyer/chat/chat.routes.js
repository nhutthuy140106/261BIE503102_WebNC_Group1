const router = require('express').Router();
const { z } = require('zod');
const { Conversation, Message } = require('./chat.model');
const User = require('../../shared/user.model');
const { notify } = require('../../shared/notify');
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const { parsePaging } = require('../../../utils/pagination');
const { body, query, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Mã sai định dạng');
const openSchema = z.object({
  withUser: oid,
  context: z.object({ type: z.enum(['order', 'offer', 'post', 'job']), id: oid }).optional(),
});
const sendSchema = z.object({ text: z.string({ error: 'Tin nhắn không được để trống' }).trim().min(1, 'Tin nhắn không được để trống').max(2000, 'Tin nhắn tối đa 2000 ký tự') });
const pageSchema = z.object({ page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() });

// 403 nếu không thuộc hội thoại (nhắn tin KHÔNG đổi trạng thái đơn)
async function member(user, id) {
  const c = await Conversation.findById(id);
  if (!c) throw ApiError.notFound('Không tìm thấy hội thoại');
  if (!c.participants.some((p) => String(p) === String(user._id))) throw ApiError.forbidden('Bạn không thuộc hội thoại này');
  return c;
}

const unreadOf = (convId, userId) => Message.countDocuments({ conversation: convId, sender: { $ne: userId }, readBy: { $ne: userId } });

/**
 * @openapi
 * /conversations:
 *   get:
 *     tags: [Hội thoại]
 *     summary: Danh sách hội thoại của tôi, kèm số tin chưa đọc
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: "{ data: [{ _id, with, context, lastMessage, unread }] }; with là UserSummary { _id, name, avatar (URL hoặc null) }" }
 *   post:
 *     tags: [Hội thoại]
 *     summary: Mở hoặc lấy hội thoại với một người (cùng cặp + cùng ngữ cảnh thì trả lại hội thoại cũ)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [withUser]
 *             properties:
 *               withUser: { type: string }
 *               context: { type: object, properties: { type: { type: string, enum: [order, offer, post, job] }, id: { type: string } } }
 *     responses:
 *       200: { description: Hội thoại đã có }
 *       201: { description: Hội thoại mới }
 *       404: { description: Người nhận không tồn tại }
 *       409: { description: Nhắn cho chính mình }
 * /conversations/{id}/messages:
 *   get:
 *     tags: [Hội thoại]
 *     summary: Tin nhắn (phân trang, mới nhất trước)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: "{ data: Message[], meta }" }
 *       403: { description: Không thuộc hội thoại }
 *       404: { description: Không tồn tại }
 *   post:
 *     tags: [Hội thoại]
 *     summary: Gửi tin (1–2000 ký tự)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string } } } } }
 *     responses:
 *       201: { description: Đã gửi }
 *       403: { description: Không thuộc hội thoại }
 *       422: { description: Tin rỗng hoặc quá dài }
 * /conversations/{id}/read:
 *   post:
 *     tags: [Hội thoại]
 *     summary: Đánh dấu đã đọc mọi tin của người kia
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: "{ data: { updated } }" }
 *       403: { description: Không thuộc hội thoại }
 */
router.use(auth);

router.get('/', asyncHandler(async (req, res) => {
  const rows = await Conversation.find({ participants: req.user._id }).sort({ updatedAt: -1 }).populate('participants', 'name avatar');
  const data = await Promise.all(rows.map(async (c) => ({
    _id: c._id,
    with: c.participants.find((p) => String(p._id) !== String(req.user._id)),
    context: c.context,
    lastMessage: c.lastMessage,
    unread: await unreadOf(c._id, req.user._id),
  })));
  res.json({ data });
}));

router.post('/', body(openSchema), asyncHandler(async (req, res) => {
  const { withUser, context } = req.body;
  if (withUser === String(req.user._id)) throw ApiError.invalidState('Bạn không thể nhắn cho chính mình');
  if (!(await User.exists({ _id: withUser }))) throw ApiError.notFound('Người nhận không tồn tại');
  const filter = { participants: { $all: [req.user._id, withUser] } };
  filter['context.type'] = context ? context.type : { $exists: false };
  if (context) filter['context.id'] = context.id;
  let c = await Conversation.findOne(filter);
  let status = 200;
  if (!c) { c = await Conversation.create({ participants: [req.user._id, withUser], context }); status = 201; }
  res.status(status).json({ data: c });
}));

router.get('/:id/messages', ids('id'), query(pageSchema), asyncHandler(async (req, res) => {
  await member(req.user, req.params.id);
  const { page, limit, skip } = parsePaging(req.valid.query, { limit: 30, max: 100 });
  const filter = { conversation: req.params.id };
  const [items, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);
  res.json({ data: items, meta: { page, limit, total } });
}));

router.post('/:id/messages', ids('id'), body(sendSchema), asyncHandler(async (req, res) => {
  const c = await member(req.user, req.params.id);
  const msg = await Message.create({ conversation: c._id, sender: req.user._id, text: req.body.text, readBy: [req.user._id] });
  c.lastMessage = { text: msg.text, at: msg.createdAt, sender: req.user._id };
  await c.save();
  const other = c.participants.find((p) => String(p) !== String(req.user._id));
  await notify(other, { type: 'message_new', title: `${req.user.name} nhắn cho bạn`, body: msg.text.slice(0, 80), link: c.context && c.context.type ? c.context : undefined });
  res.status(201).json({ data: msg });
}));

router.post('/:id/read', ids('id'), asyncHandler(async (req, res) => {
  await member(req.user, req.params.id);
  const r = await Message.updateMany(
    { conversation: req.params.id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } },
  );
  res.json({ data: { updated: r.modifiedCount } });
}));

module.exports = router;
