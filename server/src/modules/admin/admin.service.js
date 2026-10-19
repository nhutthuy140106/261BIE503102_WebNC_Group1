const User = require('../shared/user.model');
const Post = require('../shared/post.model');
const Job = require('../shared/job.model');
const Order = require('../buyer/order/order.model');
const Report = require('../buyer/report/report.model');
const { audit } = require('../shared/audit-log.model');
const { notify } = require('../shared/notify');
const ApiError = require('../../utils/ApiError');
const { parsePaging, escapeRegex } = require('../../utils/pagination');
const { stripAccents } = require('../../utils/text');

const page = (q) => parsePaging(q);

/* ===================== Người dùng ===================== */

async function listUsers(q) {
  const { page: p, limit, skip } = page(q);
  const filter = {};
  if (q.role) filter.role = q.role;
  if (q.status) filter.status = q.status;
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q.trim()), 'i');
    filter.$or = [{ name: re }, { phone: re }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items, meta: { page: p, limit, total } };
}

async function getUser(id) {
  const u = await User.findById(id);
  if (!u) throw ApiError.notFound('Không tìm thấy người dùng');
  const [orders, offersPosted] = await Promise.all([
    Order.countDocuments({ buyer: u._id }),
    Job.countDocuments({ poster: u._id }),
  ]);
  return { ...u.toJSON(), stats: { ordersPlaced: orders, jobsPosted: offersPosted } };
}

// không còn admin nào đang hoạt động thì không ai quản trị được hệ thống
async function otherActiveAdmins(exceptId) {
  return User.countDocuments({ role: 'admin', status: 'active', _id: { $ne: exceptId } });
}

async function lockUser(admin, id, reason) {
  const u = await User.findById(id);
  if (!u) throw ApiError.notFound('Không tìm thấy người dùng');
  if (String(u._id) === String(admin._id)) throw ApiError.invalidState('Bạn không thể tự khóa tài khoản của mình');
  if (u.status === 'locked') throw ApiError.invalidState('Tài khoản này đã bị khóa');
  if (u.role === 'admin' && (await otherActiveAdmins(u._id)) === 0) throw ApiError.invalidState('Không thể khóa admin cuối cùng');
  u.status = 'locked'; u.lockedReason = reason; u.lockedAt = new Date();
  await u.save(); // phiên đang có tự bị vô hiệu ở lần gọi tới (middleware auth kiểm status)
  await audit(admin, 'user.lock', 'user', u._id, reason);
  return u;
}

async function unlockUser(admin, id) {
  const u = await User.findById(id);
  if (!u) throw ApiError.notFound('Không tìm thấy người dùng');
  if (u.status !== 'locked') throw ApiError.invalidState('Tài khoản này không bị khóa');
  u.status = 'active'; u.lockedReason = ''; u.lockedAt = undefined;
  await u.save();
  await audit(admin, 'user.unlock', 'user', u._id);
  return u;
}

async function setRole(admin, id, role) {
  const u = await User.findById(id);
  if (!u) throw ApiError.notFound('Không tìm thấy người dùng');
  if (String(u._id) === String(admin._id)) throw ApiError.invalidState('Bạn không thể đổi vai trò của chính mình');
  if (u.role === role) throw ApiError.invalidState('Người dùng đã có vai trò này');
  u.role = role;
  await u.save();
  await audit(admin, 'user.role', 'user', u._id, role);
  return u;
}

/* ===================== Bài đăng ===================== */

async function listPosts(q) {
  const { page: p, limit, skip } = page(q);
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.type) filter.type = q.type;
  if (q.q) filter.searchText = new RegExp(escapeRegex(stripAccents(q.q).trim()), 'i');
  const [items, total] = await Promise.all([
    Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('seller', 'name phone'),
    Post.countDocuments(filter),
  ]);
  return { items, meta: { page: p, limit, total } };
}

// Admin chỉ ẩn/hiện; không sửa nội dung bài của phía Bán
async function hidePost(admin, id, reason) {
  const post = await Post.findById(id);
  if (!post) throw ApiError.notFound('Không tìm thấy bài');
  if (post.status === 'hidden') throw ApiError.invalidState('Bài này đã bị ẩn');
  post.statusBeforeHidden = post.status; post.status = 'hidden'; post.hiddenReason = reason;
  await post.save();
  await audit(admin, 'post.hide', 'post', post._id, reason);
  await notify(post.seller, { type: 'post_hidden', title: 'Bài của bạn đã bị gỡ', body: `${post.title} — lý do: ${reason}`, link: { type: 'post', id: post._id } });
  return post;
}

async function unhidePost(admin, id) {
  const post = await Post.findById(id);
  if (!post) throw ApiError.notFound('Không tìm thấy bài');
  if (post.status !== 'hidden') throw ApiError.invalidState('Bài này không bị ẩn');
  post.status = post.statusBeforeHidden || 'open'; post.statusBeforeHidden = undefined; post.hiddenReason = '';
  await post.save();
  await audit(admin, 'post.unhide', 'post', post._id);
  return post;
}

/* ===================== Báo cáo ===================== */

// open → reviewing → resolved | rejected
const REPORT_FLOW = { open: ['reviewing'], reviewing: ['resolved', 'rejected'], resolved: [], rejected: [] };

async function listReports(q) {
  const { page: p, limit, skip } = page(q);
  const filter = q.state ? { state: q.state } : {};
  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).populate('reporter', 'name phone'), // cũ nhất trước = hàng đợi
    Report.countDocuments(filter),
  ]);
  return { items, meta: { page: p, limit, total } };
}

async function getReport(id) {
  const r = await Report.findById(id).populate('reporter', 'name phone');
  if (!r) throw ApiError.notFound('Không tìm thấy báo cáo');
  return r;
}

async function transitionReport(admin, id, to, note) {
  const r = await Report.findById(id);
  if (!r) throw ApiError.notFound('Không tìm thấy báo cáo');
  if (!REPORT_FLOW[r.state].includes(to)) throw ApiError.invalidState(`Không thể chuyển báo cáo từ "${r.state}" sang "${to}"`);
  r.state = to; r.handledBy = admin._id;
  if (note) r.adminNote = note;
  r.history.push({ state: to, at: new Date(), note: note || '' });
  await r.save();
  await audit(admin, `report.${to}`, 'report', r._id, note || '');
  await notify(r.reporter, { type: 'report_state', title: 'Báo cáo của bạn đã được cập nhật', body: `Trạng thái: ${to}`, link: { type: 'report', id: r._id } });
  return r;
}

/* ===================== Tổng quan ===================== */

const countBy = async (Model, field, values) => {
  const rows = await Model.aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  const out = Object.fromEntries(values.map((v) => [v, 0]));
  for (const r of rows) out[r._id] = r.n;
  return out;
};

async function stats() {
  const [users, posts, jobs, orders, reports] = await Promise.all([
    countBy(User, 'status', ['active', 'locked']),
    countBy(Post, 'status', ['open', 'soldout', 'closed', 'hidden']),
    countBy(Job, 'status', ['open', 'closed', 'done', 'cancelled']),
    countBy(Order, 'state', Order.STATES),
    countBy(Report, 'state', ['open', 'reviewing', 'resolved', 'rejected']),
  ]);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return {
    users: { total: sum(users), ...users, admins: await User.countDocuments({ role: 'admin' }) },
    posts: { total: sum(posts), ...posts },
    jobs: { total: sum(jobs), ...jobs },
    orders: { total: sum(orders), byState: orders },
    reports: { total: sum(reports), byState: reports, pending: reports.open + reports.reviewing },
  };
}

module.exports = {
  listUsers, getUser, lockUser, unlockUser, setRole,
  listPosts, hidePost, unhidePost,
  listReports, getReport, transitionReport,
  stats,
};
