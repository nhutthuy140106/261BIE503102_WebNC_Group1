const User = require('../shared/user.model');
const Post = require('../shared/post.model');
const Job = require('../shared/job.model');
const Order = require('../buyer/order/order.model');
const Report = require('../buyer/report/report.model');
const Verification = require('../seller/verification.model');
const { audit } = require('../shared/audit-log.model');
const { notify } = require('../shared/notify');
const ApiError = require('../../utils/ApiError');
const { parsePaging, escapeRegex } = require('../../utils/pagination');
const { stripAccents } = require('../../utils/text');

const page = (q) => parsePaging(q);

/* ===================== Người dùng ===================== */

async function listUsers(q) {
  const { page: p, limit, skip } = page(q);
  const filter = { role: { $nin: ['admin', 'moderator'] } }; // trang Người dùng chỉ quản lý người dùng; tài khoản quản trị không nằm ở đây
  if (q.status) filter.status = q.status;
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q.trim()), 'i');
    filter.$or = [{ name: re }, { phone: re }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  // kèm: trạng thái người bán (hồ sơ xác minh) và số lần bị báo cáo (báo cáo nhắm vào người đó hoặc bài của họ)
  const ids = items.map((u) => u._id);
  const [vers, posts] = await Promise.all([
    Verification.find({ user: { $in: ids } }).select('user status'),
    Post.find({ seller: { $in: ids } }).select('_id seller'),
  ]);
  const vOf = Object.fromEntries(vers.map((v) => [String(v.user), v.status]));
  const owner = Object.fromEntries(posts.map((x) => [String(x._id), String(x.seller)]));
  const reps = await Report.find({ $or: [{ targetType: 'user', targetId: { $in: ids } }, { targetType: 'post', targetId: { $in: posts.map((x) => x._id) } }] }).select('targetType targetId');
  const nRep = {};
  for (const r of reps) { const uid = r.targetType === 'user' ? String(r.targetId) : owner[String(r.targetId)]; nRep[uid] = (nRep[uid] || 0) + 1; }
  const out = items.map((u) => ({ ...u.toJSON(), sellerStatus: vOf[String(u._id)] || 'none', reportCount: nRep[String(u._id)] || 0 }));
  return { items: out, meta: { page: p, limit, total } };
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
const REPORT_FLOW = { open: ['reviewing', 'resolved', 'rejected'], reviewing: ['resolved', 'rejected'], resolved: [], rejected: [] };

const REPORT_MSG = { reviewing: 'AntGo đang xem xét báo cáo của bạn.', resolved: 'Báo cáo của bạn đã được xử lý.', rejected: 'Báo cáo của bạn chưa được chấp nhận.' };

async function listReports(q) {
  const { page: p, limit, skip } = page(q);
  const filter = q.state ? { state: q.state } : {};
  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).populate('reporter', 'name phone'), // cũ nhất trước = hàng đợi
    Report.countDocuments(filter),
  ]);
  // kèm tóm tắt đối tượng bị báo cáo (tên bài/đơn/người, chủ/cửa hàng) để thẻ báo cáo hiện đối tượng ngay ở đầu
  const { reportContext } = require('./admin-extra.service'); // tải muộn: tránh vòng phụ thuộc
  const withTarget = await Promise.all(items.map(async (r) => {
    const c = await reportContext(r).catch(() => ({ found: false }));
    const ownerName = (c.seller && c.seller.name) || (c.owner && c.owner.name) || '';
    return { ...r.toJSON(), target: { found: !!c.found, title: c.title || '', status: c.status || '', issueSt: c.issueSt || '', ownerName, orderId: c.orderId ? String(c.orderId) : '' } };
  }));
  return { items: withTarget, meta: { page: p, limit, total } };
}

async function getReport(id) {
  const r = await Report.findById(id).populate('reporter', 'name phone');
  if (!r) throw ApiError.notFound('Không tìm thấy báo cáo');
  const { reportContext } = require('./admin-extra.service'); // tải muộn: tránh vòng phụ thuộc
  return { ...r.toJSON(), context: await reportContext(r) };
}

const ACTION_MSG = { hide_post: 'Bài bị báo cáo đã được gỡ.', lock_user: 'Tài khoản bị báo cáo đã bị khóa.', warn_owner: 'Người bị báo cáo đã được nhắc nhở.', order_ruled: 'Đơn bị báo cáo đã được phân xử.', close_job: 'Việc bị báo cáo đã bị đóng.' };

async function transitionReport(admin, id, to, note, action) {
  const r = await Report.findById(id);
  if (!r) throw ApiError.notFound('Không tìm thấy báo cáo');
  if (!REPORT_FLOW[r.state].includes(to)) throw ApiError.invalidState(`Không thể chuyển báo cáo từ "${r.state}" sang "${to}"`);
  if (to === 'resolved') {
    // hướng xử lý có tác động thật thì làm luôn (bỏ qua nếu đã làm trước đó)
    if (action === 'hide_post' && r.targetType === 'post') {
      const p = await Post.findById(r.targetId);
      if (p && p.status !== 'hidden') await hidePost(admin, r.targetId, note || 'Vi phạm quy định');
    } else if (action === 'lock_user' && r.targetType === 'user') {
      const u = await User.findById(r.targetId);
      if (u && u.status !== 'locked') await lockUser(admin, r.targetId, note || 'Vi phạm quy định');
    }
    else if (action === 'close_job' && r.targetType === 'job') {
      const j = await Job.findById(r.targetId);
      if (j && j.status === 'open') { j.status = 'closed'; await j.save(); await audit(admin, 'job.close', 'job', j._id, note || ''); await notify(j.poster, { type: 'job_closed', title: 'Việc của bạn đã bị đóng', body: `${j.title} — lý do: ${note || 'vi phạm quy định'}`, link: { type: 'job', id: j._id } }); }
    } else if (action === 'warn_owner') {
      const { reportContext } = require('./admin-extra.service');
      const c = await reportContext(r).catch(() => ({}));
      const target = (c.owner && c.owner._id) || (c.seller && c.seller._id);
      if (target) { await notify(target, { type: 'report_warning', title: 'AntGo nhắc nhở bạn', body: `Nội dung của bạn bị báo cáo. ${note}`, link: { type: r.targetType, id: r.targetId } }); await audit(admin, 'report.warn', r.targetType, r.targetId, note || ''); }
    }
    r.action = action;
  } else if (to === 'rejected') r.action = 'none';
  r.state = to; r.handledBy = admin._id;
  if (note) r.adminNote = note;
  r.history.push({ state: to, at: new Date(), note: note || '' });
  await r.save();
  await audit(admin, `report.${to}`, 'report', r._id, note || '');
  await notify(r.reporter, { type: 'report_state', title: 'Báo cáo của bạn đã được cập nhật', body: REPORT_MSG[to] + (to === 'resolved' && ACTION_MSG[action] ? ' ' + ACTION_MSG[action] : '') + (note ? ` Kết luận: ${note}` : ''), link: { type: 'report', id: r._id } });
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
