const router = require('express').Router();
const { z } = require('zod');
const Question = require('./question.model');
const Job = require('../../shared/job.model');
const { notify } = require('../../shared/notify');
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const { body, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

// ≥ 9 chữ số, kể cả khi cách bằng dấu cách . - ( ) để tránh lách luật
const hasPhoneNumber = (text) => /\d{9,}/.test(text.replace(/[\s.\-()_,]/g, ''));

const schema = z.object({
  text: z.string({ error: 'Cần nhập câu hỏi' }).trim()
    .min(5, 'Câu hỏi tối thiểu 5 ký tự').max(500, 'Câu hỏi tối đa 500 ký tự')
    .refine((t) => !hasPhoneNumber(t), 'Không ghi số điện thoại ở hỏi đáp công khai; hãy nhắn tin riêng'),
});

/**
 * @openapi
 * /jobs/{id}/questions:
 *   get:
 *     tags: [Hỏi đáp]
 *     summary: Hỏi đáp công khai của một việc
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: "{ data: Question[] } — mới nhất trước" }
 *       404: { description: Việc không tồn tại }
 *   post:
 *     tags: [Hỏi đáp]
 *     summary: Đăng câu hỏi (5–500 ký tự, không chứa số điện thoại)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string } } } } }
 *     responses:
 *       201: { description: Đã đăng }
 *       404: { description: Việc không tồn tại }
 *       409: { description: Việc đã có người nhận, hỏi đáp đã đóng }
 *       422: { description: Quá ngắn/dài hoặc có số điện thoại }
 */
router.get('/:id/questions', ids('id'), asyncHandler(async (req, res) => {
  if (!(await Job.exists({ _id: req.params.id }))) throw ApiError.notFound('Không tìm thấy việc');
  const rows = await Question.find({ job: req.params.id }).sort({ createdAt: -1 }).populate('author', 'name avatar');
  res.json({ data: rows });
}));

router.post('/:id/questions', auth, ids('id'), body(schema), asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Không tìm thấy việc');
  if (job.status !== 'open') throw ApiError.invalidState('Việc đã có người nhận nên hỏi đáp đã đóng');
  const q = await Question.create({ job: job._id, author: req.user._id, text: req.body.text });
  if (String(job.poster) !== String(req.user._id)) {
    await notify(job.poster, { type: 'question_new', title: `${req.user.name} hỏi về việc của bạn`, body: q.text, link: { type: 'job', id: job._id } });
  }
  await q.populate('author', 'name avatar');
  res.status(201).json({ data: q });
}));

module.exports = router;
module.exports.hasPhoneNumber = hasPhoneNumber;
