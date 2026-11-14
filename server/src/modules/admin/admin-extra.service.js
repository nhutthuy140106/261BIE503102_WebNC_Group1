// Phần mở rộng của khu Quản trị: bảng điều khiển, đơn & tranh chấp, nhật ký, hộp thư hỗ trợ, Xu & voucher,
// thông báo hệ thống, cài đặt, xuất CSV. Mọi thao tác ghi đều ghi nhật ký (audit).
const mongoose = require('mongoose');
const User = require('../shared/user.model');
const Post = require('../shared/post.model');
const Job = require('../shared/job.model');
const Order = require('../buyer/order/order.model');
const Offer = require('../buyer/offer/offer.model');
const Report = require('../buyer/report/report.model');
const Notification = require('../buyer/notification/notification.model');
const { Conversation, Message } = require('../buyer/chat/chat.model');
const Ticket = require('../buyer/support/support.model');
const { XuEntry, VoucherDefinition } = require('../buyer/xu/xu.model');
const xu = require('../buyer/xu/xu.service');
const SellerVerification = require('../seller/verification.model');
const { AuditLog, audit } = require('../shared/audit-log.model');
const settings = require('../shared/setting.model');
const { release } = require('../shared/order-release');
const { move } = require('../shared/order-move');
const { notify } = require('../shared/notify');
const Announcement = require('./announcement.model');
const ApiError = require('../../utils/ApiError');
const { parsePaging, escapeRegex } = require('../../utils/pagination');

const VN = '+07:00';
const dayKey = (t) => xu.today(t);
const person = 'name phone avatar area';

/* ===================== Bảng điều khiển ===================== */

const countBy = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
};

/** Số liệu theo ngày (giờ Việt Nam) cho biểu đồ: người dùng mới, đơn mới, đơn hoàn thành, doanh số (tổng tiền đơn hoàn thành) */
async function dashboard(daysIn = 14) {
  const days = Math.min(90, Math.max(7, Number(daysIn) || 14));
  const keys = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * 864e5));
  const since = new Date(Date.now() - days * 864e5);
  const byDay = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: VN } });
  const series = async (Model, match, valueExpr, field = 'createdAt') => {
    const rows = await Model.aggregate([
      { $match: { ...match, [field]: { $gte: since } } },
      { $group: { _id: byDay(field), v: { $sum: valueExpr } } },
    ]);
    const m = new Map(rows.map((r) => [r._id, r.v]));
    return keys.map((k) => m.get(k) || 0);
  };
  const [newUsers, newOrders, doneOrders, revenue, orderByState, totals, topRows, pendingVer, openRep, openIssues, cancelReq, openTickets, postByStatus, userByStatus] = await Promise.all([
    series(User, {}, 1),
    series(Order, {}, 1),
    series(Order, { state: 'done' }, 1, 'updatedAt'),
    series(Order, { state: 'done' }, '$total', 'updatedAt'),
    countBy(Order, 'state'),
    Order.aggregate([{ $match: { state: 'done' } }, { $group: { _id: null, gmv: { $sum: '$total' }, n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { state: 'done' } },
      { $group: { _id: '$seller', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } }, { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    ]),
    SellerVerification.countDocuments({ status: 'pending' }),
    Report.countDocuments({ state: { $in: ['open', 'reviewing'] } }),
    Order.countDocuments({ 'issue.st': 'open' }),
    Order.countDocuments({ 'cancelRequest.status': 'pending' }),
    Ticket.countDocuments({ state: 'open' }),
    countBy(Post, 'status'),
    countBy(User, 'status'),
  ]);
  const orderTotal = Object.values(orderByState).reduce((a, b) => a + b, 0);
  const lost = (orderByState.cancelled || 0) + (orderByState.declined || 0);
  const t0 = totals[0] || { gmv: 0, n: 0 };
  return {
    days: keys,
    series: { newUsers, newOrders, doneOrders, revenue },
    todo: { verifications: pendingVer, reports: openRep, issues: openIssues, cancelRequests: cancelReq, tickets: openTickets },
    totals: {
      users: Object.values(userByStatus).reduce((a, b) => a + b, 0), lockedUsers: userByStatus.locked || 0,
      posts: Object.values(postByStatus).reduce((a, b) => a + b, 0), openPosts: postByStatus.open || 0, hiddenPosts: postByStatus.hidden || 0,
      orders: orderTotal, doneOrders: t0.n, gmv: t0.gmv,
      completionRate: orderTotal ? Math.round((t0.n / orderTotal) * 100) : 0,
      cancelRate: orderTotal ? Math.round((lost / orderTotal) * 100) : 0,
    },
    ordersByState: orderByState,
    topSellers: topRows.map((r) => ({ id: r._id, name: (r.u[0] && r.u[0].name) || '—', revenue: r.revenue, orders: r.orders })),
  };
}

/* ===================== Đơn & tranh chấp ===================== */

const orderRow = (o) => ({
  _id: o._id, code: o.code, state: o.state, total: o.total, payment: o.payment, createdAt: o.createdAt, updatedAt: o.updatedAt,
  title: o.snapshot && o.snapshot.title, type: o.snapshot && o.snapshot.type,
  buyer: o.buyer && o.buyer.name ? { _id: o.buyer._id, name: o.buyer.name, phone: o.buyer.phone } : o.buyer,
  seller: o.seller && o.seller.name ? { _id: o.seller._id, name: o.seller.name, phone: o.seller.phone } : o.seller,
  issue: o.issue && o.issue.st ? { st: o.issue.st, type: o.issue.type, at: o.issue.at } : undefined,
  cancelPending: !!(o.cancelRequest && o.cancelRequest.status === 'pending'),
});

async function listOrders(q) {
  const { page, limit, skip } = parsePaging(q);
  const filter = {};
  if (q.state) filter.state = q.state;
  if (q.issue === 'open') filter['issue.st'] = 'open';
  else if (q.issue === 'any') filter['issue.st'] = { $exists: true, $ne: null };
  if (q.q) filter.code = new RegExp(escapeRegex(q.q.trim()), 'i');
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('buyer', 'name phone').populate('seller', 'name phone'),
    Order.countDocuments(filter),
  ]);
  return { items: items.map(orderRow), meta: { page, limit, total } };
}

/** Chi tiết đơn cho admin; `chat=true` kèm tin nhắn của đơn (để phân xử) và ghi nhật ký vì đây là dữ liệu riêng tư */
async function getOrder(admin, id, { chat = false } = {}) {
  const o = await Order.findById(id).populate('buyer', person).populate('seller', person);
  if (!o) throw ApiError.notFound('Không tìm thấy đơn');
  const out = { ...orderRow(o), full: o.toJSON() };
  if (chat) {
    const conv = await Conversation.findOne({ 'context.type': 'order', 'context.id': o._id });
    const msgs = conv ? await Message.find({ conversation: conv._id }).sort({ createdAt: 1 }).limit(100).populate('sender', 'name') : [];
    out.messages = msgs.map((m) => ({ at: m.createdAt, sender: m.sender && m.sender.name, senderId: m.sender && m.sender._id, text: m.text, media: m.media && m.media.kind }));
    await audit(admin, 'order.view_chat', 'order', o._id, 'Xem tin nhắn để phân xử');
  }
  return out;
}

const ISSUE_DECISIONS = { refund: 'refund', redo: 'redo', reject: 'closed' };

/** Phân xử báo vấn đề: người bán chưa trả lời (open) hoặc đã từ chối (rejected) mà khách không đồng ý */
async function resolveIssue(admin, id, { decision, amount, note }) {
  const o = await Order.findById(id);
  if (!o) throw ApiError.notFound('Không tìm thấy đơn');
  if (!o.issue || !['open', 'rejected'].includes(o.issue.st)) throw ApiError.invalidState('Đơn này không có báo vấn đề nào cần phân xử');
  const next = ISSUE_DECISIONS[decision];
  if (decision === 'refund') {
    const money = amount == null ? o.total : amount;
    if (!(money >= 1000) || money > o.total) throw ApiError.validation('Số tiền hoàn không hợp lệ', [{ field: 'amount', message: 'Nhập số tiền từ 1.000đ tới tổng đơn' }]);
    o.issue.amount = money;
  }
  o.issue.st = next;
  o.issue.result = `AntGo quyết định: ${{ refund: 'hoàn tiền', redo: 'người bán làm lại', reject: 'không hoàn tiền' }[decision]}. ${note}`.trim();
  await o.save();
  if (decision === 'refund' && o.issue.amount >= o.total) await xu.revokeOrder(o.buyer, o._id, o.code);
  const body = o.issue.result;
  await notify(o.buyer, { type: 'order_issue_admin', title: `AntGo đã xử lý báo vấn đề của đơn ${o.code}`, body, link: { type: 'order', id: o._id } });
  await notify(o.seller, { type: 'order_issue_admin', title: `AntGo đã xử lý báo vấn đề của đơn ${o.code}`, body, link: { type: 'order', id: o._id } });
  await audit(admin, `order.issue_${decision}`, 'order', o._id, note);
  return o;
}

/** Hủy đơn đang xử lý khi có vi phạm (trả lại kho + voucher, báo cả hai bên) */
async function cancelOrder(admin, id, reason) {
  const o = await Order.findById(id);
  if (!o) throw ApiError.notFound('Không tìm thấy đơn');
  if (!Order.ACTIVE.includes(o.state)) throw ApiError.invalidState('Chỉ hủy được đơn đang xử lý');
  o.cancelInfo = { by: 'system', reason: `AntGo hủy: ${reason}`, late: false };
  await move(o, 'cancelled');
  await release(o);
  await notify(o.seller, { type: 'order_cancelled', title: `AntGo đã hủy đơn ${o.code}`, body: reason, link: { type: 'order', id: o._id } });
  await audit(admin, 'order.cancel', 'order', o._id, reason);
  return o;
}

/* ===================== Nhật ký ===================== */

async function listAudit(q) {
  const { page, limit, skip } = parsePaging(q, { limit: 30, max: 100 });
  const filter = {};
  if (q.action) filter.action = new RegExp('^' + escapeRegex(q.action));
  if (q.targetType) filter.targetType = q.targetType;
  if (q.actor && mongoose.isValidObjectId(q.actor)) filter.actor = q.actor;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ at: -1 }).skip(skip).limit(limit).populate('actor', 'name role'),
    AuditLog.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total } };
}

/* ===================== Báo cáo kèm bối cảnh ===================== */

/** Tóm tắt đối tượng bị báo cáo để admin không phải đi tìm */
async function reportContext(r) {
  const out = { targetType: r.targetType, targetId: r.targetId, found: false };
  const sameTarget = await Report.countDocuments({ targetType: r.targetType, targetId: r.targetId });
  out.reportsAboutTarget = sameTarget;
  if (r.targetType === 'post') {
    const p = await Post.findById(r.targetId).populate('seller', 'name phone status');
    if (p) Object.assign(out, { found: true, title: p.title, status: p.status, price: p.price, owner: p.seller && { _id: p.seller._id, name: p.seller.name, phone: p.seller.phone, status: p.seller.status }, image: (p.images || [])[0] });
  } else if (r.targetType === 'order') {
    const o = await Order.findById(r.targetId).populate('buyer', 'name phone status').populate('seller', 'name phone status');
    if (o) Object.assign(out, { found: true, title: `${o.code} · ${o.snapshot && o.snapshot.title}`, status: o.state, price: o.total, buyer: o.buyer, seller: o.seller, orderId: o._id });
  } else if (r.targetType === 'user') {
    const u = await User.findById(r.targetId);
    if (u) Object.assign(out, { found: true, title: u.name, status: u.status, owner: { _id: u._id, name: u.name, phone: u.phone, status: u.status } });
  } else if (r.targetType === 'job') {
    const j = await Job.findById(r.targetId).populate('poster', 'name phone status');
    if (j) Object.assign(out, { found: true, title: j.title, status: j.status, price: j.pay, owner: j.poster && { _id: j.poster._id, name: j.poster.name, phone: j.poster.phone, status: j.poster.status } });
  } else if (r.targetType === 'offer') {
    const of = await Offer.findById(r.targetId).populate('worker', 'name phone status');
    if (of) Object.assign(out, { found: true, title: 'Đề nghị nhận việc', status: of.state, owner: of.worker && { _id: of.worker._id, name: of.worker.name, phone: of.worker.phone, status: of.worker.status } });
  }
  return out;
}

/* ===================== Người dùng: hồ sơ đầy đủ + Xu ===================== */

async function userProfile(id) {
  const u = await User.findById(id);
  if (!u) throw ApiError.notFound('Không tìm thấy người dùng');
  const [placed, sold, posts, jobs, reportsAgainst, verification, balance, ledger, recent] = await Promise.all([
    Order.countDocuments({ buyer: u._id }),
    Order.countDocuments({ seller: u._id }),
    Post.countDocuments({ seller: u._id }),
    Job.countDocuments({ poster: u._id }),
    Report.countDocuments({ targetType: 'user', targetId: u._id }),
    SellerVerification.findOne({ user: u._id }).select('status submittedAt reviewedAt rejectReason body.shopName body.shopType'),
    xu.balance(u._id),
    XuEntry.find({ user: u._id }).sort({ createdAt: -1 }).limit(15),
    Order.find({ $or: [{ buyer: u._id }, { seller: u._id }] }).sort({ createdAt: -1 }).limit(5),
  ]);
  return {
    user: u.toJSON(),
    counts: { ordersPlaced: placed, ordersReceived: sold, posts, jobs, reportsAgainst },
    verification: verification ? verification.toJSON() : { status: 'none' },
    xu: { balance, ledger: ledger.map((e) => ({ id: e._id, delta: e.delta, title: e.title, kind: e.kind, at: e.createdAt })) },
    recentOrders: recent.map((o) => ({ _id: o._id, code: o.code, state: o.state, total: o.total, title: o.snapshot && o.snapshot.title, role: String(o.buyer) === String(u._id) ? 'buyer' : 'seller', createdAt: o.createdAt })),
  };
}

async function adjustXu(admin, id, { delta, reason }) {
  const u = await User.findById(id);
  if (!u) throw ApiError.notFound('Không tìm thấy người dùng');
  if (delta < 0 && (await xu.balance(u._id)) + delta < 0) throw ApiError.invalidState('Số dư Xu không đủ để trừ');
  await xu.adjust(u._id, delta, `${delta > 0 ? 'AntGo cộng' : 'AntGo trừ'} Xu: ${reason}`);
  await audit(admin, delta > 0 ? 'xu.grant' : 'xu.deduct', 'user', u._id, `${delta > 0 ? '+' : ''}${delta} · ${reason}`);
  await notify(u._id, { type: 'xu', title: `${delta > 0 ? 'Bạn được cộng' : 'Bạn bị trừ'} ${Math.abs(delta)} Xu`, body: reason });
  return { balance: await xu.balance(u._id) };
}

/* ===================== Voucher ===================== */

async function listVouchers() {
  // lần đầu chưa có dòng nào: nạp bộ mặc định để admin có cái để sửa
  if (!(await VoucherDefinition.exists({}))) await VoucherDefinition.insertMany(xu.CATALOG.map((c) => ({ ...c, amount: c.amount || 0, ship: !!c.ship })));
  const rows = await VoucherDefinition.find({}).sort({ cost: 1, createdAt: 1 });
  const { XuVoucher } = require('../buyer/xu/xu.model');
  const used = await XuVoucher.aggregate([{ $group: { _id: '$cid', n: { $sum: 1 } } }]);
  const map = new Map(used.map((x) => [x._id, x.n]));
  return rows.map((v) => ({ ...v.toJSON(), redeemed: map.get(v.cid) || 0 }));
}

async function createVoucher(admin, data) {
  await listVouchers(); // bảo đảm đã nạp bộ mặc định trước khi thêm
  if (await VoucherDefinition.exists({ cid: data.cid })) throw ApiError.duplicate('Mã voucher này đã tồn tại');
  if (!data.ship && !(data.amount > 0)) throw ApiError.validation('Cần số tiền giảm hoặc miễn phí giao', [{ field: 'amount', message: 'Nhập số tiền giảm (> 0) hoặc chọn miễn phí giao' }]);
  const v = await VoucherDefinition.create(data);
  await audit(admin, 'voucher.create', 'voucher', v._id, `${v.cid} · ${v.title}`);
  return v;
}

async function updateVoucher(admin, id, data) {
  const v = await VoucherDefinition.findById(id);
  if (!v) throw ApiError.notFound('Không tìm thấy voucher');
  v.set(data);
  await v.save();
  await audit(admin, data.active === false ? 'voucher.disable' : data.active === true ? 'voucher.enable' : 'voucher.update', 'voucher', v._id, `${v.cid} · ${v.title}`);
  return v;
}

/* ===================== Hộp thư hỗ trợ ===================== */

async function listTickets(q) {
  const { page, limit, skip } = parsePaging(q);
  const filter = {};
  if (q.state) filter.state = q.state;
  if (q.q) filter.code = new RegExp(escapeRegex(q.q.trim()), 'i');
  const [items, total] = await Promise.all([
    Ticket.find(filter).sort({ state: 1, updatedAt: -1 }).skip(skip).limit(limit).populate('user', person),
    Ticket.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total } };
}

async function getTicket(id) {
  const t = await Ticket.findById(id).populate('user', person);
  if (!t) throw ApiError.notFound('Không tìm thấy phiếu hỗ trợ');
  return t;
}

async function replyTicket(admin, id, text) {
  const t = await Ticket.findById(id);
  if (!t) throw ApiError.notFound('Không tìm thấy phiếu hỗ trợ');
  if (t.state === 'closed') throw ApiError.invalidState('Phiếu này đã đóng');
  t.messages.push({ by: 'staff', text, staff: admin._id });
  t.state = 'answered';
  await t.save();
  await notify(t.user, { type: 'support_reply', title: `AntGo đã trả lời phiếu ${t.code}`, body: text.slice(0, 120) });
  await audit(admin, 'ticket.reply', 'ticket', t._id, t.code);
  return t.populate('user', person);
}

async function closeTicket(admin, id) {
  const t = await Ticket.findById(id);
  if (!t) throw ApiError.notFound('Không tìm thấy phiếu hỗ trợ');
  if (t.state === 'closed') throw ApiError.invalidState('Phiếu này đã đóng');
  t.state = 'closed';
  await t.save();
  await audit(admin, 'ticket.close', 'ticket', t._id, t.code);
  return t.populate('user', person);
}

/* ===================== Thông báo hệ thống ===================== */

async function listAnnouncements() {
  return Announcement.find({}).sort({ at: -1 }).limit(50).populate('sentBy', 'name');
}

async function announce(admin, { title, body = '', area = 'all' }) {
  const filter = { status: 'active', ...(area === 'all' ? {} : { area }) };
  const ids = (await User.find(filter).select('_id')).map((u) => u._id);
  if (!ids.length) throw ApiError.invalidState('Không có người dùng nào ở khu vực này');
  await Notification.insertMany(ids.map((user) => ({ user, type: 'announcement', title, body })));
  const a = await Announcement.create({ title, body, area, sentBy: admin._id, recipients: ids.length });
  await audit(admin, 'announcement.send', 'announcement', a._id, `${title} → ${area === 'all' ? 'toàn khu' : 'khu ' + area} (${ids.length} người)`);
  return a;
}

/* ===================== Cài đặt ===================== */

// bỏ khoảng trắng thừa, bỏ trùng (không phân biệt hoa thường)
const clean = (arr, max, len) => {
  const seen = new Set();
  return arr.map((s) => String(s).trim().slice(0, len)).filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase())).slice(0, max);
};

async function getSettings() { return settings.getAll(); }

async function saveSettings(admin, data) {
  const out = {};
  if (data.bannedKeywords) out.bannedKeywords = clean(data.bannedKeywords, 200, 40);
  if (data.areas) { out.areas = clean(data.areas, 30, 20); if (!out.areas.length) throw ApiError.validation('Cần ít nhất một khu vực', [{ field: 'areas', message: 'Danh sách khu vực không được trống' }]); }
  if (data.categories) { out.categories = clean(data.categories, 40, 30); if (!out.categories.length) throw ApiError.validation('Cần ít nhất một danh mục', [{ field: 'categories', message: 'Danh sách danh mục không được trống' }]); }
  for (const [k, v] of Object.entries(out)) await settings.set(k, v);
  await audit(admin, 'settings.update', 'settings', new mongoose.Types.ObjectId(), Object.keys(out).join(', '));
  return settings.getAll();
}

/* ===================== Xuất CSV ===================== */

const cell = (v) => {
  let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // chống chèn công thức khi mở bằng Excel
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (head, rows) => '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

async function exportCsv(admin, what) {
  let csv;
  if (what === 'users') {
    const rows = await User.find({}).sort({ createdAt: -1 });
    csv = toCsv(['Tên', 'SĐT', 'Khu', 'Vai trò', 'Trạng thái', 'Ngày tạo'], rows.map((u) => [u.name, u.phone, u.area, u.role, u.status, u.createdAt]));
  } else if (what === 'orders') {
    const rows = await Order.find({}).sort({ createdAt: -1 }).limit(5000).populate('buyer', 'name').populate('seller', 'name');
    csv = toCsv(['Mã đơn', 'Món/dịch vụ', 'Người mua', 'Người bán', 'Thanh toán', 'Tổng tiền', 'Trạng thái', 'Ngày đặt'], rows.map((o) => [o.code, o.snapshot && o.snapshot.title, o.buyer && o.buyer.name, o.seller && o.seller.name, o.payment, o.total, o.state, o.createdAt]));
  } else if (what === 'reports') {
    const rows = await Report.find({}).sort({ createdAt: -1 }).populate('reporter', 'name');
    csv = toCsv(['Ngày', 'Người báo cáo', 'Đối tượng', 'Lý do', 'Mô tả', 'Trạng thái', 'Ghi chú xử lý'], rows.map((r) => [r.createdAt, r.reporter && r.reporter.name, r.targetType, r.reason, r.detail, r.state, r.adminNote]));
  } else throw ApiError.badRequest('Chỉ xuất được: users, orders, reports');
  await audit(admin, 'export.csv', 'export', new mongoose.Types.ObjectId(), what);
  return csv;
}

module.exports = {
  dashboard, listOrders, getOrder, resolveIssue, cancelOrder, listAudit, reportContext, userProfile, adjustXu,
  listVouchers, createVoucher, updateVoucher, listTickets, getTicket, replyTicket, closeTicket,
  listAnnouncements, announce, getSettings, saveSettings, exportCsv,
};
