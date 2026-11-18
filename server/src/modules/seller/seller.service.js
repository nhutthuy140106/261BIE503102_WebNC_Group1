// Phía Bán & Đăng việc: bài của tôi, việc của tôi, đơn khách đặt, đề nghị nhận việc, hỏi đáp.
// Thay cho các đường tạm ở modules/dev (chỉ giữ để test cũ chạy). Người bán/người đăng việc chỉ thao tác trên dữ liệu CỦA MÌNH.
const Post = require('../shared/post.model');
const Job = require('../shared/job.model');
const Order = require('../buyer/order/order.model');
const Offer = require('../buyer/offer/offer.model');
const Question = require('../buyer/question/question.model');
const offers = require('../buyer/offer/offer.service');
const xu = require('../buyer/xu/xu.service');
const { notify } = require('../shared/notify');
const verification = require('./verification.service');
const { release } = require('../shared/order-release');
const shop = require('./shop.service');
const postStats = require('../shared/post-stats');
const settings = require('../shared/setting.model');
const { stripAccents } = require('../../utils/text');
const ApiError = require('../../utils/ApiError');

/* ---------------------------------------------------------------- Bài đăng (đồ ăn / đồ dùng / dịch vụ) */

// Người bán KHÔNG được tự đặt các trường do hệ thống/quản trị quyết định
const POST_PROTECTED = new Set(['_id', '__v', 'seller', 'rating', 'reviewCount', 'sold', 'promoted', 'spinPromo', 'hiddenReason', 'statusBeforeHidden', 'searchText', 'createdAt', 'updatedAt', 'slug', 'deal']);
// lấy tên trường cấp trên cùng (vd 'stock.mode' → 'stock') để trường lồng nhau cũng được nhận
const POST_FIELDS = [...new Set(Object.keys(Post.schema.paths).map((p) => p.split('.')[0]))].filter((p) => !POST_PROTECTED.has(p));
const SELLER_STATUS = ['draft', 'open', 'closed']; // soldout do hệ thống; hidden do admin

const pick = (src, keys) => Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

async function ownPost(user, id) {
  const p = await Post.findOne({ _id: id, seller: user._id }).select('+bank +formData');
  if (!p) throw ApiError.notFound('Không tìm thấy bài của bạn');
  return p;
}

/** Bài của tôi, mỗi bài kèm lượt xem, lượt lưu, số đã bán thật */
async function listPosts(user) {
  const posts = await Post.find({ seller: user._id }).select('+bank +formData').sort({ createdAt: -1 });
  const m = await shop.postMetrics(posts.map((p) => p._id));
  return posts.map((p) => ({ ...p.toJSON(), views: m.views.get(String(p._id)) || 0, saves: m.saves.get(String(p._id)) || 0, sold: m.sold.get(String(p._id)) || 0 }));
}

/** Chỉ người đã được AntGo duyệt hồ sơ mới đăng bán / đăng việc */
async function requireVerified(user) {
  if (!(await verification.isApproved(user._id))) throw new ApiError(403, 'NOT_VERIFIED', 'Bạn cần được AntGo xác minh người bán trước khi đăng');
}

/** Từ khóa cấm do admin đặt: bài/việc chứa từ cấm bị từ chối kèm từ vi phạm */
async function checkBanned(...texts) {
  const list = await settings.get('bannedKeywords');
  if (!list || !list.length) return;
  const hay = stripAccents(texts.filter(Boolean).join(' '));
  const hit = list.find((k) => k && hay.includes(stripAccents(k)));
  if (hit) throw ApiError.validation('Nội dung chứa từ bị cấm', [{ field: 'title', message: `Nội dung chứa từ không được phép: "${hit}". Hãy sửa lại rồi đăng` }]);
}

async function createPost(user, data) {
  await requireVerified(user);
  await checkBanned(data.title, data.description);
  const doc = pick(data, POST_FIELDS);
  if (doc.status && !SELLER_STATUS.includes(doc.status)) throw ApiError.validation('Trạng thái bài không hợp lệ', [{ field: 'status', message: 'Chỉ được chọn nháp, đang bán hoặc đóng' }]);
  return Post.create({ ...doc, seller: user._id });
}

async function updatePost(user, id, data) {
  const p = await ownPost(user, id);
  if (p.status === 'hidden') throw ApiError.invalidState('Bài đã bị quản trị gỡ, không sửa được');
  await checkBanned(data.title, data.description);
  const doc = pick(data, POST_FIELDS);
  if (doc.status && !SELLER_STATUS.includes(doc.status)) throw ApiError.validation('Trạng thái bài không hợp lệ', [{ field: 'status', message: 'Chỉ được chọn nháp, đang bán hoặc đóng' }]);
  p.set(doc);
  await p.save();
  return p;
}

/** Sửa nhanh: đóng/mở bài, đổi giá, số còn lại (bài giới hạn số lượng) */
async function patchPost(user, id, { closed, price, stockLeft }) {
  const p = await ownPost(user, id);
  if (p.status === 'hidden') throw ApiError.invalidState('Bài đã bị quản trị gỡ, không sửa được');
  if (closed !== undefined) p.status = closed ? 'closed' : 'open';
  if (price !== undefined) p.price = price;
  if (stockLeft !== undefined) {
    if (!p.stock || p.stock.mode !== 'limit') throw ApiError.invalidState('Bài này không giới hạn số lượng');
    p.stock.left = stockLeft;
    p.status = stockLeft === 0 ? 'soldout' : (p.status === 'soldout' ? 'open' : p.status);
  }
  await p.save();
  return p;
}

async function removePost(user, id) {
  const p = await ownPost(user, id);
  if (await Order.exists({ post: p._id, state: { $in: Order.ACTIVE } })) throw ApiError.invalidState('Bài còn đơn đang xử lý, hãy đóng bài thay vì xóa');
  if (await Post.exists({ 'combo.items.postId': p._id })) throw ApiError.invalidState('Bài đang nằm trong một combo, hãy gỡ khỏi combo trước');
  await p.deleteOne();
}

/* ---------------------------------------------------------------- Việc làm (người đăng việc) */

const JOB_FIELDS = ['title', 'category', 'desc', 'pay', 'unit', 'workTime', 'windows', 'area', 'distance', 'exactAddress', 'headcount'];

async function ownJob(user, id) {
  const job = await Job.findById(id);
  if (!job) throw ApiError.notFound('Không tìm thấy việc');
  if (String(job.poster) !== String(user._id)) throw ApiError.forbidden('Chỉ người đăng việc mới thao tác được');
  return job;
}

const listJobs = (user) => Job.find({ poster: user._id }).sort({ createdAt: -1 });

async function createJob(user, data) {
  await requireVerified(user);
  await checkBanned(data.title, data.desc);
  return Job.create({ ...pick(data, JOB_FIELDS), poster: user._id });
}

async function updateJob(user, id, data) {
  const job = await ownJob(user, id);
  if (job.status === 'done' || job.status === 'cancelled') throw ApiError.invalidState('Việc đã kết thúc, không sửa được');
  job.set(pick(data, JOB_FIELDS));
  await job.save();
  return job;
}

async function patchJob(user, id, { closed }) {
  const job = await ownJob(user, id);
  if (closed && job.status === 'open') job.status = 'closed';
  else if (closed === false && job.status === 'closed') {
    const taken = await Offer.countDocuments({ job: job._id, state: { $in: ['chosen', 'working', 'reported', 'done'] } });
    if (taken >= job.headcount) throw ApiError.invalidState('Việc đã đủ người, không mở lại được');
    job.status = 'open';
  }
  await job.save();
  return job;
}

async function removeJob(user, id) {
  const job = await ownJob(user, id);
  if (await Offer.exists({ job: job._id, state: { $in: Offer.ACTIVE } })) throw ApiError.invalidState('Việc còn đề nghị đang hoạt động, hãy đóng việc thay vì xóa');
  await job.deleteOne();
}

/* ---------------------------------------------------------------- Đơn khách đặt */

const STEPS = {
  confirm: { from: ['waiting'], to: 'confirmed' },
  prepare: { from: ['confirmed'], to: 'preparing' },
  deliver: { from: ['preparing'], to: (o) => (o.fulfillment === 'delivery' ? 'delivering' : 'ready') },
  ready: { from: ['preparing'], to: 'ready' },
  complete: { from: ['delivering', 'ready'], to: 'done' },
  decline: { from: ['waiting'], to: 'declined' },
  // đơn có báo giá: đã lấy đồ / đã kiểm tra → báo giá (khách duyệt) → làm → trả đồ / hoàn thành
  pickUp: { from: ['confirmed'], to: 'picked' },
  returned: { from: ['preparing'], to: 'done' },
};
const ORDER_CANCELABLE = ['waiting', 'confirmed', 'picked', 'pricing', 'preparing'];
// bước chỉ dành cho đơn có báo giá (giặt sấy, sửa chữa) / chỉ dành cho đơn thường
const FLOW_ONLY = new Set(['pickUp', 'quote', 'returned']);
const PLAIN_ONLY = new Set(['prepare', 'deliver', 'ready', 'complete']);

async function ownOrder(user, id) {
  const o = await applyOne(await Order.findById(id));
  if (!o) throw ApiError.notFound('Không tìm thấy đơn');
  if (String(o.seller) !== String(user._id)) throw ApiError.forbidden('Chỉ người bán của đơn mới thao tác được');
  return o;
}

async function listOrders(user) {
  await sweep({ seller: user._id });
  return Order.find({ seller: user._id }).sort({ createdAt: -1 }).limit(300).populate('buyer', 'name avatar phone area');
}

const { move } = require('../shared/order-move');
const { applyOne, sweep } = require('../shared/order-deadlines');

async function orderAction(user, id, action, payload = {}) {
  const o = await ownOrder(user, id);
  if (FLOW_ONLY.has(action) && !o.flow) throw ApiError.invalidState('Bước này chỉ dành cho đơn giặt sấy hoặc sửa chữa có báo giá');
  if (PLAIN_ONLY.has(action) && o.flow) throw ApiError.invalidState('Đơn có báo giá đi theo các bước: lấy đồ / kiểm tra → báo giá → làm → trả đồ');
  if (action === 'quote') {
    if (o.state !== 'picked') throw ApiError.invalidState('Chỉ báo giá được sau khi đã lấy đồ / kiểm tra');
    if (o.cancelRequest && o.cancelRequest.status === 'pending') throw ApiError.invalidState('Khách đang xin hủy đơn, hãy trả lời yêu cầu hủy trước');
    const lines = (payload.lines || []).filter((l) => l && String(l.name || '').trim());
    if (!lines.length || lines.some((l) => !(l.qty > 0) || !(l.price >= 0))) throw ApiError.validation('Cần ít nhất một dòng giá hợp lệ', [{ field: 'lines', message: 'Mỗi dòng có tên, số lượng > 0 và đơn giá ≥ 0' }]);
    const clean = lines.map((l) => ({ name: String(l.name).trim().slice(0, 120), qty: Math.round(l.qty * 100) / 100, price: Math.round(l.price) }));
    o.quote = { lines: clean, total: Math.round(clean.reduce((n, l) => n + l.qty * l.price, 0)), at: new Date(), status: 'pending' };
    await move(o, 'pricing');
  } else if (STEPS[action]) {
    const step = STEPS[action];
    if (!step.from.includes(o.state)) throw ApiError.invalidState(`Không thể thực hiện khi đơn đang ở trạng thái "${o.state}"`);
    if (o.cancelRequest && o.cancelRequest.status === 'pending' && action !== 'decline') throw ApiError.invalidState('Khách đang xin hủy đơn, hãy trả lời yêu cầu hủy trước');
    const to = typeof step.to === 'function' ? step.to(o) : step.to;
    await move(o, to);
    if (to === 'declined') {
      o.cancelInfo = { by: 'seller', reason: String(payload.reason || '').trim() || 'Người bán không nhận đơn này' };
      await o.save();
      await release(o);
    }
  } else if (action === 'approveCancel' || action === 'keepOrder') {
    if (!o.cancelRequest || o.cancelRequest.status !== 'pending') throw ApiError.invalidState('Đơn này không có yêu cầu hủy nào đang chờ');
    if (action === 'approveCancel') {
      if (!ORDER_CANCELABLE.includes(o.state)) throw ApiError.invalidState('Đơn đã qua bước có thể hủy');
      o.cancelRequest.status = 'accepted';
      o.cancelInfo = { by: 'buyer', reason: o.cancelRequest.reason };
      await move(o, 'cancelled');
      await release(o);
    } else {
      o.cancelRequest.status = 'rejected';
      await o.save();
      await notify(o.buyer, { type: 'order_cancel_rejected', title: `Người bán giữ đơn ${o.code}, chưa đồng ý hủy`, link: { type: 'order', id: o._id } });
    }
  } else if (action === 'surcharge') {
    if (!Order.ACTIVE.includes(o.state)) throw ApiError.invalidState('Chỉ báo phụ thu khi đơn đang xử lý');
    if (o.surcharge && o.surcharge.status === 'pending') throw ApiError.duplicate('Đã có một khoản phụ thu đang chờ khách đồng ý');
    if (!(payload.amount >= 1000) || !payload.reason || payload.reason.length < 3) throw ApiError.validation('Cần số tiền phụ thu và lý do', [{ field: 'amount', message: 'Nhập số tiền (từ 1.000đ) và lý do' }]);
    o.surcharge = { amount: payload.amount, reason: payload.reason, status: 'pending' };
    await o.save();
    await notify(o.buyer, { type: 'order_surcharge', title: `Đơn ${o.code} có phụ thu, cần bạn đồng ý`, link: { type: 'order', id: o._id } });
  } else if (['issueRedo', 'issueRefund', 'issueReturn', 'issueReject'].includes(action)) {
    if (!o.issue || o.issue.st !== 'open') throw ApiError.invalidState('Đơn này không có yêu cầu báo vấn đề nào đang chờ');
    const reply = String(payload.reply || '').trim().slice(0, 300);
    if (action === 'issueRefund' || action === 'issueReturn') {
      if (!(payload.amount >= 1000) || payload.amount > o.total) throw ApiError.validation('Số tiền hoàn không hợp lệ', [{ field: 'amount', message: 'Nhập số tiền từ 1.000đ tới tổng đơn' }]);
      o.issue.amount = payload.amount;
    }
    o.issue.st = { issueRedo: 'redo', issueRefund: 'refund', issueReturn: 'returnAgreed', issueReject: 'rejected' }[action];
    o.issue.reply = reply;
    await o.save();
    const said = { issueRedo: 'nhận làm lại', issueRefund: 'đồng ý hoàn tiền', issueReturn: 'đồng ý nhận lại hàng', issueReject: 'không đồng ý' }[action];
    await notify(o.buyer, { type: 'order_issue_reply', title: `Người bán ${said} cho yêu cầu của đơn ${o.code}`, body: reply, link: { type: 'order', id: o._id } });
  } else if (action === 'approveReturn' || action === 'rejectReturn') {
    if (!o.returnRequest || o.returnRequest.status !== 'pending') throw ApiError.invalidState('Đơn này không có yêu cầu trả hàng nào đang chờ');
    o.returnRequest.status = action === 'approveReturn' ? 'accepted' : 'rejected';
    await o.save();
    await notify(o.buyer, { type: 'order_return_reply', title: `Yêu cầu trả hàng đơn ${o.code} ${action === 'approveReturn' ? 'được đồng ý' : 'bị từ chối'}`, link: { type: 'order', id: o._id } });
  } else {
    throw ApiError.badRequest('Thao tác không hợp lệ');
  }
  await o.populate('buyer', 'name avatar phone area');
  return o;
}

/* ---------------------------------------------------------------- Đề nghị nhận việc của việc tôi đăng */

async function listOffers(user) {
  const jobIds = (await Job.find({ poster: user._id }).select('_id')).map((j) => j._id);
  return Offer.find({ job: { $in: jobIds } }).sort({ createdAt: -1 }).limit(300)
    .populate('worker', 'name avatar phone area')
    .populate({ path: 'job', populate: { path: 'poster', select: 'name avatar area' } });
}

async function offerAction(user, id, action) {
  const offer = await Offer.findById(id);
  if (!offer) throw ApiError.notFound('Không tìm thấy đề nghị');
  const job = await ownJob(user, offer.job);
  if (action === 'choose') {
    if (offer.state !== 'offered') throw ApiError.invalidState('Chỉ chọn được đề nghị đang chờ');
    if (job.status !== 'open') throw ApiError.invalidState('Việc đã đóng');
    offers.push(offer, 'chosen');
    await offer.save();
    const chosen = await Offer.countDocuments({ job: job._id, state: { $in: ['chosen', 'working', 'reported', 'done'] } });
    if (chosen >= job.headcount) {
      job.status = 'closed';
      await job.save();
      for (const o of await Offer.find({ job: job._id, state: 'offered' })) {
        offers.push(o, 'rejected');
        await o.save();
        await notify(o.worker, { type: 'offer_rejected', title: 'Việc đã có người nhận', body: job.title, link: { type: 'job', id: job._id } });
      }
    }
    await offers.syncOfferCount(job._id);
    await notify(offer.worker, { type: 'offer_chosen', title: 'Bạn được chọn làm việc', body: job.title, link: { type: 'offer', id: offer._id } });
  } else if (action === 'reject') {
    if (offer.state !== 'offered') throw ApiError.invalidState('Chỉ từ chối được đề nghị đang chờ');
    offers.push(offer, 'rejected');
    await offer.save();
    await offers.syncOfferCount(job._id);
    await notify(offer.worker, { type: 'offer_rejected', title: 'Đề nghị của bạn chưa được chọn', body: job.title, link: { type: 'job', id: job._id } });
  } else if (action === 'confirmDone') {
    if (offer.state !== 'reported') throw ApiError.invalidState('Chỉ xác nhận được khi người làm đã báo hoàn thành');
    offers.push(offer, 'done');
    await offer.save();
    const finished = await Offer.countDocuments({ job: job._id, state: 'done' });
    if (finished >= job.headcount) await Job.updateOne({ _id: job._id }, { status: 'done' });
    await xu.award(offer.worker, 'job', offer._id);
    await notify(offer.worker, { type: 'offer_done', title: 'Việc đã được xác nhận hoàn thành', link: { type: 'offer', id: offer._id } });
  } else {
    throw ApiError.badRequest('Thao tác không hợp lệ');
  }
  return offer.populate([{ path: 'worker', select: 'name avatar phone area' }, { path: 'job', populate: { path: 'poster', select: 'name avatar area' } }]);
}

/** Người đăng việc đánh giá người làm sau khi việc hoàn thành (một lần) */
async function rateOffer(user, id, { stars, text = '' }) {
  const offer = await Offer.findById(id);
  if (!offer) throw ApiError.notFound('Không tìm thấy đề nghị');
  await ownJob(user, offer.job);
  if (offer.state !== 'done') throw ApiError.invalidState('Chỉ đánh giá được khi việc đã hoàn thành');
  if (offer.posterRating && offer.posterRating.stars) throw ApiError.duplicate('Bạn đã đánh giá người làm này rồi');
  offer.posterRating = { stars, text: text.trim().slice(0, 500), at: new Date() };
  await offer.save();
  await notify(offer.worker, { type: 'review_new', title: `${user.name} đã đánh giá bạn ${stars} sao`, body: text, link: { type: 'offer', id: offer._id } });
  return offer.populate([{ path: 'worker', select: 'name avatar phone area' }, { path: 'job', populate: { path: 'poster', select: 'name avatar area' } }]);
}

/* ---------------------------------------------------------------- Hỏi đáp của việc tôi đăng */

async function answerQuestion(user, id, text) {
  const q = await Question.findById(id);
  if (!q) throw ApiError.notFound('Không tìm thấy câu hỏi');
  await ownJob(user, q.job);
  q.answer = { text, by: user._id, at: new Date() };
  await q.save();
  return q;
}

module.exports = {
  listPosts, createPost, updatePost, patchPost, removePost,
  listJobs, createJob, updateJob, patchJob, removeJob,
  listOrders, orderAction, listOffers, offerAction, rateOffer, answerQuestion,
};
