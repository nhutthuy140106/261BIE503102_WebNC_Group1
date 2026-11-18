// Người dùng gửi và theo dõi phiếu hỗ trợ: /api/support/tickets
const router = require('express').Router();
const { z } = require('zod');
const Ticket = require('./support.model');
const { nextCode } = require('../../shared/counter.model');
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const { body, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

router.use(auth);

const createBody = z.object({
  topic: z.enum(Ticket.TOPICS).default('other'),
  text: z.string({ error: 'Cần nhập nội dung' }).trim().min(10, 'Nội dung tối thiểu 10 ký tự').max(1500),
});
const replyBody = z.object({ text: z.string({ error: 'Cần nhập nội dung' }).trim().min(2, 'Nội dung quá ngắn').max(1500) });

const present = (t) => ({ id: t._id, code: t.code, topic: t.topic, state: t.state, messages: t.messages.map((m) => ({ by: m.by, text: m.text, at: m.at })), createdAt: t.createdAt, updatedAt: t.updatedAt });

/**
 * @openapi
 * /support/tickets:
 *   get: { tags: [Hỗ trợ], summary: Phiếu hỗ trợ của tôi, security: [{ cookieAuth: [] }], responses: { 200: { description: Danh sách } } }
 *   post: { tags: [Hỗ trợ], summary: Gửi phiếu hỗ trợ mới, security: [{ cookieAuth: [] }], responses: { 201: { description: Đã gửi }, 422: { description: Thiếu nội dung } } }
 * /support/tickets/{id}/reply:
 *   post: { tags: [Hỗ trợ], summary: Nhắn thêm vào phiếu (phiếu đã đóng thì không nhắn được), security: [{ cookieAuth: [] }], responses: { 200: { description: OK }, 409: { description: Phiếu đã đóng } } }
 */
router.get('/', asyncHandler(async (req, res) => {
  const rows = await Ticket.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(50);
  res.json({ data: rows.map(present) });
}));
router.post('/', body(createBody), asyncHandler(async (req, res) => {
  const open = await Ticket.countDocuments({ user: req.user._id, state: { $ne: 'closed' } });
  if (open >= 5) throw ApiError.invalidState('Bạn đang có 5 phiếu chưa đóng, hãy chờ AntGo trả lời trước khi gửi thêm');
  const t = await Ticket.create({ code: await nextCode('ticket', 'HT-'), user: req.user._id, topic: req.body.topic, messages: [{ by: 'user', text: req.body.text }] });
  res.status(201).json({ data: present(t) });
}));
router.post('/:id/reply', ids('id'), body(replyBody), asyncHandler(async (req, res) => {
  const t = await Ticket.findOne({ _id: req.params.id, user: req.user._id });
  if (!t) throw ApiError.notFound('Không tìm thấy phiếu hỗ trợ');
  if (t.state === 'closed') throw ApiError.invalidState('Phiếu này đã đóng, hãy gửi phiếu mới');
  t.messages.push({ by: 'user', text: req.body.text });
  t.state = 'open';
  await t.save();
  res.json({ data: present(t) });
}));

module.exports = router;
module.exports.present = present;
