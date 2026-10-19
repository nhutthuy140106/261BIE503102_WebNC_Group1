const Offer = require('./offer.model');
const Job = require('../../shared/job.model');
const { nextCode } = require('../../shared/counter.model');
const { notify } = require('../../shared/notify');
const ApiError = require('../../../utils/ApiError');
const { parsePaging } = require('../../../utils/pagination');

const AUTO_DONE_MS = 24 * 3600 * 1000; // reported -> done tự động sau 24 giờ (tính lúc đọc, không cần cron — Q4)

const push = (offer, state) => { offer.state = state; offer.history.push({ state, at: new Date() }); };

async function syncOfferCount(jobId) {
  const n = await Offer.countDocuments({ job: jobId, state: 'offered' });
  await Job.updateOne({ _id: jobId }, { offerCount: n });
}

/** Nếu đã báo xong quá 24 giờ mà chủ việc im lặng thì tự hoàn thành. Gọi mỗi lần đọc/ghi một đề nghị. */
async function applyAutoDone(offer) {
  if (offer.state !== 'reported') return offer;
  const at = (offer.history.slice().reverse().find((h) => h.state === 'reported') || {}).at;
  if (at && Date.now() - new Date(at).getTime() >= AUTO_DONE_MS) {
    push(offer, 'done');
    await offer.save();
  }
  return offer;
}

/** Biểu diễn đề nghị cho người nhận: chỉ kèm địa chỉ chính xác khi đã được chọn trở đi. */
async function present(offer) {
  await offer.populate({ path: 'job', populate: { path: 'poster', select: 'name avatar area' } });
  const out = offer.toJSON();
  if (out.job) {
    if (!Offer.REVEAL_ADDRESS.includes(offer.state)) delete out.job.exactAddress;
  }
  return out;
}

async function own(user, id) {
  const offer = await Offer.findById(id);
  if (!offer) throw ApiError.notFound('Không tìm thấy đề nghị');
  if (String(offer.worker) !== String(user._id)) throw ApiError.forbidden('Đây không phải đề nghị của bạn');
  return applyAutoDone(offer);
}

function assertState(offer, allowed, action) {
  if (!allowed.includes(offer.state)) throw ApiError.invalidState(`Không thể ${action} khi đề nghị đang ở trạng thái "${offer.state}"`);
}

async function create(user, jobId, { intro, slots }) {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Không tìm thấy việc');
  if (String(job.poster) === String(user._id)) throw ApiError.forbidden('Bạn không thể nhận việc do chính mình đăng');
  if (job.status !== 'open') throw ApiError.invalidState('Việc này đã có người nhận hoặc đã đóng');
  if (job.windows.length && slots.some((s) => !job.windows.some((w) => w.getTime() === s.getTime()))) {
    throw ApiError.validation('Khung giờ nằm ngoài khung việc cho phép', [{ field: 'slots', message: 'Khung giờ nằm ngoài khung việc cho phép' }]);
  }
  if (await Offer.exists({ job: job._id, worker: user._id, state: { $in: Offer.ACTIVE } })) {
    throw ApiError.duplicate('Bạn đã gửi đề nghị cho việc này rồi');
  }
  const offer = await Offer.create({
    code: await nextCode('offer', 'AG-J'),
    job: job._id, worker: user._id, intro, slots,
    state: 'offered', history: [{ state: 'offered', at: new Date() }],
  });
  await syncOfferCount(job._id);
  await notify(job.poster, { type: 'offer_new', title: `${user.name} đề nghị nhận việc`, body: job.title, link: { type: 'job', id: job._id } });
  return present(offer);
}

async function list(user, { state, ...paging }) {
  const { page, limit, skip } = parsePaging(paging);
  const filter = { worker: user._id };
  if (state === 'active') filter.state = { $in: Offer.ACTIVE };
  if (state === 'history') filter.state = { $in: Offer.FINAL };
  const [rows, total] = await Promise.all([
    Offer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Offer.countDocuments(filter),
  ]);
  const items = [];
  for (const o of rows) items.push(await present(await applyAutoDone(o)));
  return { items, meta: { page, limit, total } };
}

const get = async (user, id) => present(await own(user, id));

async function update(user, id, data) {
  const offer = await own(user, id);
  assertState(offer, ['offered'], 'sửa lời giới thiệu');
  if (data.intro !== undefined) offer.intro = data.intro;
  if (data.slots !== undefined) {
    const job = await Job.findById(offer.job);
    if (job.windows.length && data.slots.some((s) => !job.windows.some((w) => w.getTime() === s.getTime()))) {
      throw ApiError.validation('Khung giờ nằm ngoài khung việc cho phép', [{ field: 'slots', message: 'Khung giờ nằm ngoài khung việc cho phép' }]);
    }
    offer.slots = data.slots;
  }
  await offer.save();
  return present(offer);
}

async function transition(user, id, { from, to, action, mutate, after }) {
  const offer = await own(user, id);
  assertState(offer, from, action);
  if (mutate) mutate(offer);
  push(offer, to);
  await offer.save();
  if (after) await after(offer);
  return present(offer);
}

const withdraw = (user, id) => transition(user, id, {
  from: ['offered'], to: 'withdrawn', action: 'rút đề nghị',
  after: (o) => syncOfferCount(o.job),
});

const start = (user, id) => transition(user, id, { from: ['chosen'], to: 'working', action: 'bắt đầu làm' });

const reportDone = (user, id, { note, images }) => transition(user, id, {
  from: ['working'], to: 'reported', action: 'báo hoàn thành',
  mutate: (o) => { o.report = { note, images, at: new Date() }; },
  after: async (o) => {
    const job = await Job.findById(o.job);
    await notify(job.poster, { type: 'offer_reported', title: 'Người nhận việc đã báo hoàn thành', body: job.title, link: { type: 'job', id: job._id } });
  },
});

const cancelRequest = (user, id, { reason, detail }) => transition(user, id, {
  from: ['chosen', 'working'], to: 'cancelled', action: 'xin hủy',
  mutate: (o) => { o.cancel = { reason, detail, at: new Date() }; },
  after: async (o) => {
    // người nhận rút lui: mở lại việc để người đăng chọn người khác
    await Job.updateOne({ _id: o.job, status: 'closed' }, { status: 'open' });
    await syncOfferCount(o.job);
    const job = await Job.findById(o.job);
    await notify(job.poster, { type: 'offer_cancelled', title: 'Người nhận việc xin hủy', body: `${job.title} — lý do: ${reason}`, link: { type: 'job', id: job._id } });
  },
});

async function confirmPaid(user, id) {
  const offer = await own(user, id);
  assertState(offer, ['done'], 'xác nhận đã nhận tiền công');
  if (offer.paidAt) throw ApiError.duplicate('Bạn đã xác nhận nhận tiền công rồi');
  offer.paidAt = new Date();
  await offer.save();
  return present(offer);
}

module.exports = {
  create, list, get, update, withdraw, start, reportDone, cancelRequest, confirmPaid,
  // dùng cho phía Đăng việc / dev
  push, syncOfferCount, applyAutoDone, present,
};
