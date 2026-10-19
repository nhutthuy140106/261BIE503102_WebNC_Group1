// TẠM THỜI — thay cho phía Bán / Đăng việc để thử trọn luồng. Chỉ bật khi không phải production.
// Khi hai module kia xong thì xóa thư mục này (và dòng mount ở app.js).
const router = require('express').Router();
const { z } = require('zod');
const Order = require('../buyer/order/order.model');
const Offer = require('../buyer/offer/offer.model');
const Question = require('../buyer/question/question.model');
const Job = require('../shared/job.model');
const offers = require('../buyer/offer/offer.service');
const { notify } = require('../shared/notify');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { body, ids } = require('../../middlewares/validate');
const { auth } = require('../../middlewares/auth');

router.use(auth);

/**
 * @openapi
 * /dev/orders/{id}/advance:
 *   post:
 *     tags: [Dev (tạm)]
 *     summary: "[Tạm] Người bán đẩy đơn sang bước tiếp theo (chỉ người bán của đơn)"
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { to: { type: string, description: "Trạng thái đích, vd declined/cancelled/delivering" } } } } }
 *     responses:
 *       200: { description: OK }
 * /dev/orders/{id}/surcharge:
 *   post:
 *     tags: [Dev (tạm)]
 *     summary: "[Tạm] Người bán báo phụ thu"
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { amount: { type: integer }, reason: { type: string } } } } }
 *     responses:
 *       200: { description: OK }
 * /dev/jobs/{id}/offers/{offerId}/choose:
 *   post:
 *     tags: [Dev (tạm)]
 *     summary: "[Tạm] Người đăng việc chọn người (offered → chosen); đủ headcount thì đóng việc, các đề nghị khác thành rejected"
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: offerId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Không phải người đăng }
 * /dev/offers/{id}/confirm-done:
 *   post:
 *     tags: [Dev (tạm)]
 *     summary: "[Tạm] Người đăng việc xác nhận hoàn thành (reported → done)"
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 * /dev/questions/{id}/answer:
 *   post:
 *     tags: [Dev (tạm)]
 *     summary: "[Tạm] Người đăng việc trả lời hỏi đáp"
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string } } } } }
 *     responses:
 *       200: { description: OK }
 */

// Cho phép đi tiếp theo thứ tự; 'to' tùy chọn để nhảy tới declined/cancelled
const FLOW = ['waiting', 'confirmed', 'preparing', 'ready', 'done'];
router.post('/orders/:id/advance', ids('id'), body(z.object({ to: z.string().optional() })), asyncHandler(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) throw ApiError.notFound('Không tìm thấy đơn');
  if (String(o.seller) !== String(req.user._id)) throw ApiError.forbidden('Chỉ người bán của đơn mới thao tác được');
  let to = req.body.to;
  if (!to) {
    const i = FLOW.indexOf(o.state);
    if (i < 0 || i === FLOW.length - 1) throw ApiError.invalidState('Đơn đã ở bước cuối');
    to = FLOW[i + 1];
  }
  if (!Order.STATES.includes(to)) throw ApiError.validation('Trạng thái không hợp lệ');
  o.state = to;
  o.history.push({ state: to, at: new Date() });
  if (to === 'cancelled' && o.cancelRequest) o.cancelRequest.status = 'accepted';
  await o.save();
  await notify(o.buyer, { type: 'order_state', title: `Đơn ${o.code}: ${to}`, link: { type: 'order', id: o._id } });
  res.json({ data: o });
}));

router.post('/orders/:id/surcharge', ids('id'), body(z.object({ amount: z.number().int().min(1), reason: z.string().min(3) })), asyncHandler(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) throw ApiError.notFound('Không tìm thấy đơn');
  if (String(o.seller) !== String(req.user._id)) throw ApiError.forbidden('Chỉ người bán của đơn mới thao tác được');
  o.surcharge = { amount: req.body.amount, reason: req.body.reason, status: 'pending' };
  await o.save();
  await notify(o.buyer, { type: 'order_surcharge', title: `Đơn ${o.code} có phụ thu, cần bạn đồng ý`, link: { type: 'order', id: o._id } });
  res.json({ data: o });
}));

async function ownJob(user, jobId) {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Không tìm thấy việc');
  if (String(job.poster) !== String(user._id)) throw ApiError.forbidden('Chỉ người đăng việc mới thao tác được');
  return job;
}

router.post('/jobs/:id/offers/:offerId/choose', ids('id', 'offerId'), asyncHandler(async (req, res) => {
  const job = await ownJob(req.user, req.params.id);
  const offer = await Offer.findOne({ _id: req.params.offerId, job: job._id });
  if (!offer) throw ApiError.notFound('Không tìm thấy đề nghị của việc này');
  if (offer.state !== 'offered') throw ApiError.invalidState('Chỉ chọn được đề nghị đang chờ');
  if (job.status !== 'open') throw ApiError.invalidState('Việc đã đóng');
  offers.push(offer, 'chosen');
  await offer.save();
  const chosen = await Offer.countDocuments({ job: job._id, state: { $in: ['chosen', 'working', 'reported', 'done'] } });
  if (chosen >= job.headcount) {
    job.status = 'closed';
    await job.save();
    const others = await Offer.find({ job: job._id, state: 'offered' });
    for (const o of others) {
      offers.push(o, 'rejected');
      await o.save();
      await notify(o.worker, { type: 'offer_rejected', title: 'Việc đã có người nhận', body: job.title, link: { type: 'job', id: job._id } });
    }
  }
  await offers.syncOfferCount(job._id);
  await notify(offer.worker, { type: 'offer_chosen', title: 'Bạn được chọn làm việc', body: job.title, link: { type: 'offer', id: offer._id } });
  res.json({ data: offer });
}));

router.post('/offers/:id/confirm-done', ids('id'), asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw ApiError.notFound('Không tìm thấy đề nghị');
  await ownJob(req.user, offer.job);
  if (offer.state !== 'reported') throw ApiError.invalidState('Chỉ xác nhận được khi người làm đã báo hoàn thành');
  offers.push(offer, 'done');
  await offer.save();
  await notify(offer.worker, { type: 'offer_done', title: 'Việc đã được xác nhận hoàn thành', link: { type: 'offer', id: offer._id } });
  res.json({ data: offer });
}));

router.post('/questions/:id/answer', ids('id'), body(z.object({ text: z.string().trim().min(2) })), asyncHandler(async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) throw ApiError.notFound('Không tìm thấy câu hỏi');
  await ownJob(req.user, q.job);
  q.answer = { text: req.body.text, by: req.user._id, at: new Date() };
  await q.save();
  res.json({ data: q });
}));

module.exports = router;
