// Gian hàng của người bán: hồ sơ, giờ nhận đơn, thống kê Hiệu quả, đánh giá nhận được, theo dõi. Số liệu luôn tính từ dữ liệu thật.
const Shop = require('./shop.model');
const { PostView, ShopFollow, dayKey } = require('./engagement.model');
const { buildStats } = require('./stats');
const Post = require('../shared/post.model');
const Job = require('../shared/job.model');
const User = require('../shared/user.model');
const Order = require('../buyer/order/order.model');
const Offer = require('../buyer/offer/offer.model');
const Review = require('../buyer/review/review.model');
const Saved = require('../buyer/saved/saved.model');
const { notify } = require('../shared/notify');
const ApiError = require('../../utils/ApiError');

const SHOP_FIELDS = ['name', 'kind', 'address', 'bio', 'cover', 'replyTime'];

/** Có hồ sơ gian hàng rồi thì lấy, chưa có thì tạo bản mặc định theo tài khoản */
async function ensureShop(user) {
  let s = await Shop.findOne({ user: user._id });
  if (!s) s = await Shop.create({ user: user._id, name: user.name, address: `Block ${user.area || 'B'}` });
  return s;
}

const myPostIds = async (user) => (await Post.find({ seller: user._id }).select('_id')).map((p) => p._id);

async function ratingOf(userId) {
  const [r] = await Review.aggregate([{ $match: { target: userId, targetType: 'order' } }, { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$rating' } } }]);
  return r ? { count: r.n, avg: r.avg } : { count: 0, avg: 0 };
}

async function presentShop(user, s) {
  const ids = await myPostIds(user);
  const [rating, doneOrders, doneHires, followers, views] = await Promise.all([
    ratingOf(user._id),
    Order.countDocuments({ seller: user._id, state: 'done' }),
    Offer.countDocuments({ state: 'done', job: { $in: (await Job.find({ poster: user._id }).select('_id')).map((j) => j._id) } }),
    ShopFollow.countDocuments({ shop: user._id }),
    // lượt xem gian hàng = tổng lượt xem bài của tôi trong 7 ngày gần nhất (giao diện ghi "lượt xem tuần này")
    PostView.aggregate([{ $match: { post: { $in: ids }, date: { $gte: dayKey(new Date(Date.now() - 6 * 86400000)) } } }, { $group: { _id: null, n: { $sum: '$count' } } }]),
  ]);
  return {
    shop: {
      name: s.name || user.name, kind: s.kind, at: s.address || `Block ${user.area || 'B'}`, since: `Hàng xóm từ ${new Date(user.createdAt).getFullYear()}`,
      reply: s.replyTime, bio: s.bio, avatar: user.avatar || '', cover: s.cover || null, followers, shopViews: views[0] ? views[0].n : 0,
      rating: rating.count ? rating.avg.toFixed(1).replace('.', ',') : '—', reviewCount: rating.count, doneCount: doneOrders + doneHires,
    },
    hours: s.hours.map((h) => ({ on: h.on, from: h.from, to: h.to })),
    offs: s.offs.map((o) => ({ date: o.date, note: o.note })).sort((a, b) => a.date.localeCompare(b.date)),
    pause: s.pause ? { until: s.pause.until } : null,
  };
}

const getShop = async (user) => presentShop(user, await ensureShop(user));

async function updateShop(user, patch) {
  const s = await ensureShop(user);
  for (const k of SHOP_FIELDS) if (patch[k] !== undefined) s[k] = patch[k];
  await s.save();
  return presentShop(user, s);
}

async function setHours(user, hours) {
  const s = await ensureShop(user);
  s.hours = hours;
  await s.save();
  return presentShop(user, s);
}

async function setOff(user, date, note) {
  const s = await ensureShop(user);
  s.offs = s.offs.filter((o) => o.date !== date);
  if (note !== null) s.offs.push({ date, note });
  await s.save();
  return presentShop(user, s);
}

async function setPause(user, until) {
  const s = await ensureShop(user);
  s.pause = until ? { until } : null;
  await s.save();
  return presentShop(user, s);
}

/** Hiệu quả: 5 mốc thời gian, đọc từ đơn / đề nghị / đánh giá / lượt xem / lượt lưu thật */
async function stats(user, now = new Date()) {
  const ids = await myPostIds(user);
  const since = new Date(now.getFullYear() - 1, 0, 1); // đủ cho "Năm nay" và so sánh với năm trước
  const jobIds = (await Job.find({ poster: user._id }).select('_id pay')).reduce((m, j) => m.set(String(j._id), j.pay), new Map());
  const [orders, hires, reviews, views, saves] = await Promise.all([
    Order.find({ seller: user._id, createdAt: { $gte: since } }).select('state total snapshot.type createdAt updatedAt history').lean(),
    Offer.find({ job: { $in: [...jobIds.keys()] }, state: 'done' }).select('job history updatedAt').lean(),
    Review.find({ target: user._id, targetType: 'order', createdAt: { $gte: since } }).select('rating createdAt').lean(),
    PostView.find({ seller: user._id, date: { $gte: dayKey(since) } }).select('date count').lean(),
    Saved.find({ targetModel: 'Post', targetId: { $in: ids }, createdAt: { $gte: since } }).select('createdAt').lean(),
  ]);
  return buildStats({
    orders,
    hires: hires.map((h) => ({ pay: jobIds.get(String(h.job)) || 0, at: ((h.history || []).filter((x) => x.state === 'done').pop() || {}).at || h.updatedAt })),
    reviews, views, saves: saves.map((x) => x.createdAt),
  }, now);
}

/** Đánh giá khách dành cho tôi (mới nhất trước), kèm tên bài và người đánh giá */
async function listReviews(user) {
  return Review.find({ target: user._id, targetType: 'order' }).sort({ createdAt: -1 }).limit(100)
    .populate('reviewer', 'name avatar phone').populate('post', 'title');
}

async function replyReview(user, id, text) {
  const r = await Review.findById(id);
  if (!r) throw ApiError.notFound('Không tìm thấy đánh giá');
  if (String(r.target) !== String(user._id)) throw ApiError.forbidden('Chỉ người được đánh giá mới phản hồi được');
  if (r.reply && r.reply.text) throw ApiError.duplicate('Bạn đã phản hồi đánh giá này rồi');
  r.reply = { text, at: new Date() };
  await r.save();
  await notify(r.reviewer, { type: 'review_reply', title: `${user.name} đã phản hồi đánh giá của bạn`, body: text });
  return r.populate([{ path: 'reviewer', select: 'name avatar phone' }, { path: 'post', select: 'title' }]);
}

/** Lượt xem (tổng), lượt lưu, số đã bán của từng bài — gắn vào danh sách bài của tôi */
async function postMetrics(postIds) {
  const [views, saves, sold] = await Promise.all([
    PostView.aggregate([{ $match: { post: { $in: postIds } } }, { $group: { _id: '$post', n: { $sum: '$count' } } }]),
    Saved.aggregate([{ $match: { targetModel: 'Post', targetId: { $in: postIds } } }, { $group: { _id: '$targetId', n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { post: { $in: postIds }, state: 'done' } }, { $group: { _id: '$post', n: { $sum: '$quantity' } } }]),
  ]);
  const map = (rows) => new Map(rows.map((r) => [String(r._id), r.n]));
  return { views: map(views), saves: map(saves), sold: map(sold) };
}

/** Người khác mở bài thì cộng 1 lượt xem hôm nay (chủ bài tự xem không tính) */
async function countView(post, viewer) {
  const sellerId = post.seller && post.seller._id ? post.seller._id : post.seller;
  if (viewer && String(viewer._id) === String(sellerId)) return;
  await PostView.updateOne({ post: post._id, date: dayKey() }, { $setOnInsert: { seller: sellerId }, $inc: { count: 1 } }, { upsert: true });
}

async function follow(user, shopId) {
  if (String(user._id) === String(shopId)) throw ApiError.invalidState('Bạn không thể theo dõi gian hàng của chính mình');
  if (!(await User.exists({ _id: shopId }))) throw ApiError.notFound('Không tìm thấy gian hàng');
  await ShopFollow.updateOne({ user: user._id, shop: shopId }, { $setOnInsert: { user: user._id, shop: shopId } }, { upsert: true });
  return { following: true, followers: await ShopFollow.countDocuments({ shop: shopId }) };
}

async function unfollow(user, shopId) {
  await ShopFollow.deleteOne({ user: user._id, shop: shopId });
  return { following: false, followers: await ShopFollow.countDocuments({ shop: shopId }) };
}

module.exports = { getShop, updateShop, setHours, setOff, setPause, stats, listReviews, replyReview, postMetrics, countView, follow, unfollow, ensureShop };
