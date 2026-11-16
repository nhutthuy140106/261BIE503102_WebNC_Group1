// Khu Quản trị mở rộng: bảng điều khiển, đơn & tranh chấp, nhật ký, hỗ trợ, voucher, Xu, thông báo, cài đặt, CSV, vai trò kiểm duyệt.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
const tok = {}; const ids = {};

async function api(method, path, { body, token, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && token.c ? { Cookie: token.c } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (token && sc) token.c = sc.split(';')[0];
  if (raw) return { status: res.status, text: Buffer.from(await res.arrayBuffer()).toString('utf8'), type: res.headers.get('content-type') }; // Buffer giữ nguyên BOM
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const login = async (phone) => {
  const jar = { c: '' };
  await api('POST', '/auth/login', { body: { phone, password: 'Test@2026' }, token: jar });
  return jar;
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004'], ['admin', '0900000099']]) tok[k] = await login(p);
  const User = mongoose.model('User');
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004']]) ids[k] = String((await User.findOne({ phone: p }))._id);
  // Chị Hoa làm người kiểm duyệt
  await User.updateOne({ phone: '0900000004' }, { role: 'moderator' });
  tok.hoa = await login('0900000004');
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const mkOrder = async (extra = {}) => {
  const Order = require('../src/modules/buyer/order/order.model');
  const Post = require('../src/modules/shared/post.model');
  const post = await Post.findOne({});
  const n = (mkOrder.n = (mkOrder.n || 0) + 1);
  return Order.create({
    code: `AG-T${9000 + n}`, buyer: ids.thuy, seller: ids.lan, post: post._id, quantity: 1, fulfillment: 'pickup', payment: 'cash',
    total: 50000, snapshot: { title: 'Cơm thử nghiệm', type: 'food', unitPrice: 50000 }, ...extra,
  });
};

test('chỉ quản trị mới vào được; người dùng thường bị 403', async () => {
  assert.equal((await api('GET', '/admin/dashboard')).status, 401);
  assert.equal((await api('GET', '/admin/dashboard', { token: tok.thuy })).status, 403);
  assert.equal((await api('GET', '/admin/orders', { token: tok.thuy })).status, 403);
  assert.equal((await api('GET', '/admin/audit', { token: tok.lan })).status, 403);
});

test('bảng điều khiển: việc cần xử lý, chuỗi theo ngày, tỷ lệ', async () => {
  const done = await mkOrder({ state: 'done', total: 120000 });
  await mkOrder({ state: 'cancelled' });
  const r = await api('GET', '/admin/dashboard?days=7', { token: tok.admin });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const d = r.body.data;
  assert.equal(d.days.length, 7);
  for (const k of ['newUsers', 'newOrders', 'doneOrders', 'revenue']) assert.equal(d.series[k].length, 7);
  assert.ok(d.totals.gmv >= 120000 && d.totals.doneOrders >= 1);
  assert.ok(d.totals.cancelRate > 0);
  assert.ok(d.series.revenue.reduce((a, b) => a + b, 0) >= 120000, 'doanh số hôm nay nằm trong chuỗi');
  assert.ok(d.topSellers.some((s) => s.name === 'Bếp Cô Lan'));
  for (const k of ['verifications', 'reports', 'issues', 'cancelRequests', 'tickets']) assert.equal(typeof d.todo[k], 'number');
  assert.equal((await api('GET', '/admin/dashboard?days=3', { token: tok.admin })).status, 422);
  assert.ok(done);
});

test('đơn: lọc, xem chi tiết kèm chat (ghi nhật ký), hủy đơn đang xử lý', async () => {
  const o = await mkOrder({ state: 'preparing' });
  const list = await api('GET', '/admin/orders?state=preparing', { token: tok.admin });
  assert.ok(list.body.data.some((x) => x._id === String(o._id) && x.buyer.name === 'Ngọc Thủy'));
  assert.ok((await api('GET', `/admin/orders?q=${o.code}`, { token: tok.admin })).body.data.length === 1);

  const { Conversation, Message } = require('../src/modules/buyer/chat/chat.model');
  const conv = await Conversation.create({ participants: [ids.thuy, ids.lan], context: { type: 'order', id: o._id } });
  await Message.create({ conversation: conv._id, sender: ids.thuy, text: 'Cho mình đổi giờ nhé' });
  const det = await api('GET', `/admin/orders/${o._id}?chat=1`, { token: tok.admin });
  assert.equal(det.body.data.messages.length, 1);
  assert.equal(det.body.data.messages[0].text, 'Cho mình đổi giờ nhé');
  const audit = (await api('GET', '/admin/audit?action=order.view_chat', { token: tok.admin })).body.data;
  assert.ok(audit.length >= 1 && audit[0].actor.name === 'Quản trị viên', 'xem chat riêng tư phải để lại dấu vết');

  assert.equal((await api('POST', `/admin/orders/${o._id}/cancel`, { token: tok.admin, body: { reason: 'ab' } })).status, 422);
  const c = await api('POST', `/admin/orders/${o._id}/cancel`, { token: tok.admin, body: { reason: 'Người bán vi phạm quy định' } });
  assert.equal(c.status, 200);
  assert.equal(c.body.data.state, 'cancelled');
  assert.equal(c.body.data.cancelInfo.by, 'system');
  assert.equal((await api('POST', `/admin/orders/${o._id}/cancel`, { token: tok.admin, body: { reason: 'Hủy lần hai' } })).status, 409);
});

test('phân xử báo vấn đề: hoàn tiền, và 409 khi không có gì để phân xử', async () => {
  const none = await mkOrder({ state: 'done' });
  assert.equal((await api('POST', `/admin/orders/${none._id}/issue`, { token: tok.admin, body: { decision: 'refund', note: 'Không có báo vấn đề' } })).status, 409);

  const o = await mkOrder({ state: 'done', total: 80000, issue: { st: 'rejected', type: 'quality', text: 'Món nguội, thiếu phần', reply: 'Không đồng ý', at: new Date() } });
  assert.equal((await api('GET', '/admin/orders?issue=any', { token: tok.admin })).body.data.some((x) => x._id === String(o._id)), true);
  assert.equal((await api('POST', `/admin/orders/${o._id}/issue`, { token: tok.admin, body: { decision: 'refund', amount: 999999, note: 'Hoàn quá tổng' } })).status, 422);
  const ok = await api('POST', `/admin/orders/${o._id}/issue`, { token: tok.admin, body: { decision: 'refund', amount: 40000, note: 'Món thiếu phần, hoàn một nửa' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.data.issue.st, 'refund');
  assert.equal(ok.body.data.issue.amount, 40000);
  assert.match(ok.body.data.issue.result, /AntGo quyết định: hoàn tiền/);
  // đã giải quyết thì không phân xử lại
  assert.equal((await api('POST', `/admin/orders/${o._id}/issue`, { token: tok.admin, body: { decision: 'reject', note: 'Thử lại lần hai' } })).status, 409);
  // hai bên đều nhận thông báo
  for (const k of ['thuy', 'lan']) {
    const n = (await api('GET', '/notifications', { token: tok[k] })).body.data;
    assert.ok(n.some((x) => x.type === 'order_issue_admin'), `${k} phải được báo`);
  }
});

test('báo cáo trả kèm bối cảnh của đối tượng bị báo', async () => {
  const Post = require('../src/modules/shared/post.model');
  const post = await Post.findOne({}).populate('seller', 'name');
  const rep = await api('POST', '/reports', { token: tok.thuy, body: { targetType: 'post', targetId: String(post._id), reason: 'quality', detail: 'Ảnh không giống món thật nhận được' } });
  assert.equal(rep.status, 201, JSON.stringify(rep.body));
  const r = await api('GET', `/admin/reports/${rep.body.data._id || rep.body.data.id}`, { token: tok.admin });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.context.found, true);
  assert.equal(r.body.data.context.title, post.title);
  assert.equal(r.body.data.context.owner.name, post.seller.name);
  assert.equal(r.body.data.context.reportsAboutTarget, 1);
});

test('hộp thư hỗ trợ: người dùng gửi → admin trả lời → người dùng thấy → đóng phiếu', async () => {
  assert.equal((await api('POST', '/support/tickets', { token: tok.thuy, body: { topic: 'order', text: 'ngắn' } })).status, 422);
  const t = await api('POST', '/support/tickets', { token: tok.thuy, body: { topic: 'order', text: 'Đơn của mình bị giao trễ hơn một tiếng rồi' } });
  assert.equal(t.status, 201);
  assert.match(t.body.data.code, /^HT-\d+$/);
  const id = t.body.data.id;
  assert.equal((await api('GET', '/admin/support?state=open', { token: tok.admin })).body.data.some((x) => x._id === id), true);
  const rp = await api('POST', `/admin/support/${id}/reply`, { token: tok.admin, body: { text: 'AntGo đã nhắc người bán, bạn chờ thêm 15 phút nhé' } });
  assert.equal(rp.status, 200);
  assert.equal(rp.body.data.state, 'answered');
  const mine = (await api('GET', '/support/tickets', { token: tok.thuy })).body.data.find((x) => x.id === id);
  assert.equal(mine.messages.length, 2);
  assert.equal(mine.messages[1].by, 'staff');
  assert.ok((await api('GET', '/notifications', { token: tok.thuy })).body.data.some((n) => n.type === 'support_reply'));
  // người khác không nhắn vào phiếu này được
  assert.equal((await api('POST', `/support/tickets/${id}/reply`, { token: tok.lan, body: { text: 'Chen ngang phiếu người khác' } })).status, 404);
  assert.equal((await api('POST', `/admin/support/${id}/close`, { token: tok.admin })).body.data.state, 'closed');
  assert.equal((await api('POST', `/support/tickets/${id}/reply`, { token: tok.thuy, body: { text: 'Nhắn vào phiếu đã đóng' } })).status, 409);
  assert.equal((await api('POST', `/admin/support/${id}/reply`, { token: tok.admin, body: { text: 'Trả lời phiếu đã đóng' } })).status, 409);
});

test('voucher: admin tạo, tắt; người dùng chỉ thấy voucher đang bật', async () => {
  const before = (await api('GET', '/admin/vouchers', { token: tok.admin })).body.data;
  assert.ok(before.length >= 3, 'lần đầu nạp bộ mặc định');
  assert.equal((await api('POST', '/admin/vouchers', { token: tok.admin, body: { cid: 'v10', title: 'Trùng mã', cost: 5, amount: 1000 } })).status, 409);
  assert.equal((await api('POST', '/admin/vouchers', { token: tok.admin, body: { cid: 'khongco', title: 'Không giảm gì', cost: 5 } })).status, 422);
  const c = await api('POST', '/admin/vouchers', { token: tok.admin, body: { cid: 'tet30', title: 'Giảm 30.000đ dịp Tết', cond: 'Đơn từ 200.000đ', amount: 30000, min: 200000, cost: 5 } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const cat = (await api('GET', '/me/xu', { token: tok.thuy })).body.data.catalog;
  assert.ok(cat.some((v) => v.cid === 'tet30'));
  const redeemed = await api('POST', '/me/xu/redeem', { token: tok.thuy, body: { cid: 'tet30' } });
  assert.equal(redeemed.status, 201, JSON.stringify(redeemed.body));
  // tắt: không đổi mới được, voucher đã đổi vẫn còn nguyên tên
  assert.equal((await api('PATCH', `/admin/vouchers/${c.body.data._id}`, { token: tok.admin, body: { active: false } })).body.data.active, false);
  assert.equal((await api('POST', '/me/xu/redeem', { token: tok.thuy, body: { cid: 'tet30' } })).status, 404);
  const ov = (await api('GET', '/me/xu', { token: tok.thuy })).body.data;
  assert.ok(!ov.catalog.some((v) => v.cid === 'tet30'));
  assert.equal(ov.vouchers.find((v) => v.cid === 'tet30').title, 'Giảm 30.000đ dịp Tết');
});

test('Xu: admin cộng/trừ kèm lý do, không trừ quá số dư; người kiểm duyệt không được', async () => {
  const bal = async () => (await api('GET', `/admin/users/${ids.lan}/profile`, { token: tok.admin })).body.data.xu.balance;
  const b0 = await bal();
  assert.equal((await api('POST', `/admin/users/${ids.lan}/xu`, { token: tok.admin, body: { delta: 50, reason: 'x' } })).status, 422);
  const g = await api('POST', `/admin/users/${ids.lan}/xu`, { token: tok.admin, body: { delta: 50, reason: 'Thưởng người bán tích cực' } });
  assert.equal(g.status, 200, JSON.stringify(g.body));
  assert.equal(await bal(), b0 + 50);
  assert.equal((await api('POST', `/admin/users/${ids.lan}/xu`, { token: tok.admin, body: { delta: -100000, reason: 'Trừ quá tay' } })).status, 422);
  assert.equal((await api('POST', `/admin/users/${ids.lan}/xu`, { token: tok.admin, body: { delta: -(b0 + 51), reason: 'Trừ quá số dư' } })).status, 409);
  assert.equal((await api('POST', `/admin/users/${ids.lan}/xu`, { token: tok.hoa, body: { delta: 10, reason: 'Kiểm duyệt cộng thử' } })).status, 403);
  const p = (await api('GET', `/admin/users/${ids.lan}/profile`, { token: tok.admin })).body.data;
  assert.ok(p.xu.ledger[0].title.includes('Thưởng người bán tích cực'));
  assert.ok(p.counts.ordersReceived >= 1);
});

test('người kiểm duyệt: xử lý nội dung được nhưng không khóa tài khoản, voucher, thông báo, cài đặt, xuất CSV', async () => {
  const t = tok.hoa;
  assert.equal((await api('GET', '/admin/orders', { token: t })).status, 200);
  assert.equal((await api('GET', '/admin/audit', { token: t })).status, 200);
  assert.equal((await api('GET', '/admin/reports', { token: t })).status, 200);
  assert.equal((await api('POST', `/admin/users/${ids.thuy}/lock`, { token: t, body: { reason: 'Thử khóa người khác' } })).status, 403);
  assert.equal((await api('PATCH', `/admin/users/${ids.thuy}/role`, { token: t, body: { role: 'admin' } })).status, 403);
  assert.equal((await api('POST', '/admin/vouchers', { token: t, body: { cid: 'abc', title: 'Thử tạo', cost: 1, amount: 1000 } })).status, 403);
  assert.equal((await api('POST', '/admin/announcements', { token: t, body: { title: 'Thử gửi thông báo' } })).status, 403);
  assert.equal((await api('PUT', '/admin/settings', { token: t, body: { bannedKeywords: ['abc'] } })).status, 403);
  assert.equal((await api('GET', '/admin/export/users', { token: t })).status, 403);
  // admin cấp vai trò kiểm duyệt cho người khác
  assert.equal((await api('PATCH', `/admin/users/${ids.lan}/role`, { token: tok.admin, body: { role: 'moderator' } })).body.data.role, 'moderator');
  await api('PATCH', `/admin/users/${ids.lan}/role`, { token: tok.admin, body: { role: 'enduser' } });
});

test('thông báo hệ thống: gửi toàn khu hoặc theo khu, lưu lịch sử', async () => {
  assert.equal((await api('POST', '/admin/announcements', { token: tok.admin, body: { title: 'Bảo trì', area: 'Z' } })).status, 409, 'khu không có ai');
  const a = await api('POST', '/admin/announcements', { token: tok.admin, body: { title: 'Cuối tuần có mưa lớn', body: 'Người giao hàng có thể chậm hơn thường lệ.' } });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  assert.ok(a.body.data.recipients >= 3);
  for (const k of ['thuy', 'lan']) assert.ok((await api('GET', '/notifications', { token: tok[k] })).body.data.some((n) => n.type === 'announcement' && n.title === 'Cuối tuần có mưa lớn'));
  const hist = await api('GET', '/admin/announcements', { token: tok.admin });
  assert.equal(hist.body.data[0].title, 'Cuối tuần có mưa lớn');
  assert.equal(hist.body.data[0].sentBy.name, 'Quản trị viên');
});

test('cài đặt: từ khóa cấm chặn bài/việc; khu vực và danh mục công khai ở /meta', async () => {
  const s0 = (await api('GET', '/admin/settings', { token: tok.admin })).body.data;
  assert.deepEqual(s0.areas, ['A', 'B', 'C', 'D']);
  assert.equal((await api('PUT', '/admin/settings', { token: tok.admin, body: { areas: [] } })).status, 422);
  const s1 = await api('PUT', '/admin/settings', { token: tok.admin, body: { bannedKeywords: ['  Hàng Giả ', 'hàng giả', 'cờ bạc'], categories: ['Đồ ăn', 'Đồ dùng'] } });
  assert.equal(s1.status, 200);
  assert.deepEqual(s1.body.data.bannedKeywords, ['Hàng Giả', 'cờ bạc'], 'bỏ khoảng trắng và bỏ trùng không phân biệt hoa thường');
  const meta = await api('GET', '/meta');
  assert.deepEqual(meta.body.data.categories, ['Đồ ăn', 'Đồ dùng']);
  assert.equal(meta.body.data.bannedKeywords, undefined, 'không lộ từ khóa cấm');

  const post = (title) => ({ type: 'goods', category: 'Đồ dùng', title, description: 'Mô tả đủ dài để qua kiểm tra.', price: 20000, unit: 'cái', area: 'B', fulfillmentModes: ['pickup'], payMethods: ['cash'], areas: ['B'], priceType: 'fixed' });
  const User = mongoose.model('User');
  const Verification = require('../src/modules/seller/verification.model');
  const lan = await User.findOne({ phone: '0900000002' });
  await Verification.create({ user: lan._id, status: 'approved', body: { fullName: 'Lan', idNumber: '012345678901', idFront: 'a.jpg', idBack: 'b.jpg', selfie: 'c.jpg', shopName: 'Lan', shopType: 'food' } });
  const bad = await api('POST', '/seller/posts', { token: tok.lan, body: post('Bán HÀNG GIẢ giá rẻ') });
  assert.equal(bad.status, 422, JSON.stringify(bad.body));
  assert.match(bad.body.error.message || JSON.stringify(bad.body), /từ bị cấm|không được phép/);
  assert.equal((await api('POST', '/seller/posts', { token: tok.lan, body: post('Hang gia khong dau van bi chan') })).status, 422, 'so khớp không dấu');
  assert.equal((await api('POST', '/seller/posts', { token: tok.lan, body: post('Ấm đun nước inox sạch') })).status, 201);
  await api('PUT', '/admin/settings', { token: tok.admin, body: { bannedKeywords: [] } });
});

test('xuất CSV: có BOM, có dấu tiếng Việt, chống chèn công thức', async () => {
  await mongoose.model('User').updateOne({ phone: '0900000001' }, { name: '=HYPERLINK("x")' });
  const r = await api('GET', '/admin/export/users', { token: tok.admin, raw: true });
  assert.equal(r.status, 200);
  assert.match(r.type, /text\/csv/);
  assert.ok(r.text.startsWith('﻿Tên,SĐT'));
  assert.ok(r.text.includes("'=HYPERLINK"), 'ô bắt đầu bằng = phải được vô hiệu');
  assert.ok(r.text.includes('Bếp Cô Lan'));
  assert.equal((await api('GET', '/admin/export/orders', { token: tok.admin, raw: true })).status, 200);
  assert.equal((await api('GET', '/admin/export/passwords', { token: tok.admin })).status, 400);
  assert.ok((await api('GET', '/admin/audit?action=export', { token: tok.admin })).body.data.length >= 2, 'xuất dữ liệu để lại dấu vết');
  await mongoose.model('User').updateOne({ phone: '0900000001' }, { name: 'Ngọc Thủy' });
});

test('báo cáo về đơn: hủy đơn thì báo cáo tự đóng; xử lý thẳng từ Mới; hướng xử lý được ghi', async () => {
  const Report = mongoose.model('Report');
  const o = await mkOrder({ state: 'confirmed' });
  const rep = await Report.create({ reporter: ids.thuy, targetType: 'order', targetId: o._id, reason: 'quality', detail: 'Món không đúng mô tả' });
  const list = (await api('GET', '/admin/reports?state=open', { token: tok.admin })).body.data;
  const row = list.find((x) => String(x._id) === String(rep._id));
  assert.equal(row.target.status, 'confirmed', 'danh sách báo cáo kèm trạng thái đơn để chọn nút');
  const c = await api('POST', `/admin/orders/${o._id}/cancel`, { token: tok.admin, body: { reason: 'Vi phạm quy định giao hàng' } });
  assert.equal(c.status, 200);
  const after = await Report.findById(rep._id);
  assert.equal(after.state, 'resolved');
  assert.equal(after.action, 'cancel_order');

  // nhắc nhở thẳng từ trạng thái Mới (không cần "bắt đầu xem xét")
  const r2 = await Report.create({ reporter: ids.thuy, targetType: 'user', targetId: ids.lan, reason: 'abuse', detail: 'Nhắn tin thô tục' });
  const t = await api('POST', `/admin/reports/${r2._id}/transition`, { token: tok.admin, body: { to: 'resolved', note: 'Đã nhắc nhở', action: 'warn_owner' } });
  assert.equal(t.status, 200);
  assert.equal((await Report.findById(r2._id)).action, 'warn_owner');
  // đóng mà không chọn hướng xử lý thì bị từ chối
  const r3 = await Report.create({ reporter: ids.thuy, targetType: 'user', targetId: ids.lan, reason: 'abuse', detail: 'Lần hai' });
  assert.equal((await api('POST', `/admin/reports/${r3._id}/transition`, { token: tok.admin, body: { to: 'resolved', note: 'Xong rồi' } })).status, 422);
});
