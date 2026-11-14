// Các bước người mua tự bấm sau khi đặt: hủy ngay, xác nhận đã nhận, báo vấn đề (người bán trả lời, người mua đóng),
// đơn quá hạn xác nhận tự hủy, người đăng việc đánh giá người làm.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
const tok = {};
async function api(method, p, { body, token } = {}) {
  const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token && token.c ? { Cookie: token.c } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = res.headers.get('set-cookie');
  if (token && sc) token.c = sc.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const login = async (phone) => { const jar = { c: '' }; await api('POST', '/auth/login', { body: { phone, password: 'Test@2026' }, token: jar }); return jar; };

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004'], ['quoc', '0900000005']]) tok[k] = await login(p);
  const User = mongoose.model('User');
  const V = require('../src/modules/seller/verification.model');
  for (const phone of ['0900000002', '0900000004']) {
    const u = await User.findOne({ phone });
    await V.updateOne({ user: u._id }, { $setOnInsert: { user: u._id, status: 'approved', body: { fullName: u.name, idNumber: '012345678901', idFront: 'a', idBack: 'b', selfie: 'c', shopName: u.name, shopType: 'food' } } }, { upsert: true });
  }
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const act = (token, id, a, body) => api('POST', `/seller/orders/${id}/${a}`, { token, body });
const pho = async () => (await api('GET', '/posts?limit=100')).body.data.find((p) => p.title.startsWith('Phở bò tái'));
const order = async (extra = {}) => (await api('POST', '/orders', { token: tok.thuy, body: { postId: (await pho())._id, quantity: 1, fulfillment: 'pickup', payment: 'cash', ...extra } })).body.data;
const Order = () => mongoose.model('Order');

test('hủy ngay: chờ xác nhận hủy được, ghi ai hủy + lý do, trả lại kho; đã chuẩn bị thì phải xin hủy', async () => {
  const o = await order();
  assert.equal((await api('POST', `/orders/${o._id}/cancel`, { token: tok.thuy, body: {} })).status, 422, 'cần lý do');
  assert.equal((await api('POST', `/orders/${o._id}/cancel`, { token: tok.quoc, body: { reason: 'Không phải của tôi' } })).status, 403);
  const c = (await api('POST', `/orders/${o._id}/cancel`, { token: tok.thuy, body: { reason: 'Đặt nhầm món' } })).body.data;
  assert.equal(c.state, 'cancelled');
  assert.deepEqual({ by: c.cancelInfo.by, reason: c.cancelInfo.reason }, { by: 'buyer', reason: 'Đặt nhầm món' });
  assert.equal((await api('POST', `/orders/${o._id}/cancel`, { token: tok.thuy, body: { reason: 'Hủy lần nữa' } })).status, 409);

  const o2 = await order();
  await act(tok.lan, o2._id, 'confirm'); await act(tok.lan, o2._id, 'prepare');
  assert.equal((await api('POST', `/orders/${o2._id}/cancel`, { token: tok.thuy, body: { reason: 'Muốn hủy' } })).status, 409, 'đã chuẩn bị: chỉ xin hủy');
});

test('người bán từ chối đơn: người mua thấy lý do', async () => {
  const o = await order();
  const d = (await act(tok.lan, o._id, 'decline', { reason: 'Hết nguyên liệu hôm nay' })).body.data;
  assert.equal(d.state, 'declined');
  const seen = (await api('GET', `/orders/${o._id}`, { token: tok.thuy })).body.data;
  assert.deepEqual({ by: seen.cancelInfo.by, reason: seen.cancelInfo.reason }, { by: 'seller', reason: 'Hết nguyên liệu hôm nay' });
});

test('xác nhận đã nhận → hoàn thành; báo vấn đề → người bán hoàn tiền → người mua đóng', async () => {
  const o = await order();
  assert.equal((await api('POST', `/orders/${o._id}/confirm-received`, { token: tok.thuy })).status, 409, 'chưa tới bước nhận');
  await act(tok.lan, o._id, 'confirm'); await act(tok.lan, o._id, 'prepare'); await act(tok.lan, o._id, 'ready');
  assert.equal((await api('POST', `/orders/${o._id}/confirm-received`, { token: tok.quoc })).status, 403);
  const done = (await api('POST', `/orders/${o._id}/confirm-received`, { token: tok.thuy })).body.data;
  assert.equal(done.state, 'done');
  assert.equal((await api('POST', `/orders/${o._id}/confirm-received`, { token: tok.thuy })).status, 409, 'xác nhận hai lần');

  assert.equal((await api('POST', `/orders/${o._id}/issue`, { token: tok.thuy, body: { type: 'Món bị nguội', photos: 0 } })).status, 422, 'đồ ăn cần ảnh');
  const issR = await api('POST', `/orders/${o._id}/issue`, { token: tok.thuy, body: { type: 'Món bị nguội', text: 'Giao tới đã nguội ngắt', photos: 1 } });
  assert.equal(issR.status, 201, JSON.stringify(issR.body));
  const iss = issR.body.data;
  assert.equal(iss.issue.st, 'open');
  assert.equal((await api('POST', `/orders/${o._id}/issue`, { token: tok.thuy, body: { type: 'Lần hai', photos: 1 } })).status, 409, 'chỉ một yêu cầu');
  assert.equal((await api('POST', `/orders/${o._id}/issue/close`, { token: tok.thuy, body: {} })).body.data.issue.st, 'closed', 'đóng khi chưa ai trả lời cũng được');

  // vòng đầy đủ trên đơn khác
  const o2 = await order();
  for (const a of ['confirm', 'prepare', 'ready']) await act(tok.lan, o2._id, a);
  await api('POST', `/orders/${o2._id}/confirm-received`, { token: tok.thuy });
  assert.equal((await act(tok.lan, o2._id, 'issueRefund', { amount: 10000 })).status, 409, 'chưa có yêu cầu');
  await api('POST', `/orders/${o2._id}/issue`, { token: tok.thuy, body: { type: 'Thiếu món', photos: 2 } });
  assert.equal((await act(tok.lan, o2._id, 'issueRefund', { amount: 999999 })).status, 422, 'hoàn quá tổng đơn');
  const r = (await act(tok.lan, o2._id, 'issueRefund', { amount: 20000, reply: 'Xin lỗi bạn, mình hoàn 20.000đ' })).body.data;
  assert.equal(r.issue.st, 'refund'); assert.equal(r.issue.amount, 20000);
  const closed = (await api('POST', `/orders/${o2._id}/issue/close`, { token: tok.thuy, body: {} })).body.data;
  assert.equal(closed.issue.st, 'closed');
  assert.match(closed.issue.result, /đã nhận tiền hoàn 20\.000đ/);
});

test('báo vấn đề quá 2 giờ sau khi xong đồ ăn bị từ chối; đánh giá hiện kèm đơn', async () => {
  const o = await order();
  for (const a of ['confirm', 'prepare', 'ready']) await act(tok.lan, o._id, a);
  await api('POST', `/orders/${o._id}/confirm-received`, { token: tok.thuy });
  const old = new Date(Date.now() - 3 * 3600 * 1000);
  await Order().collection.updateOne({ _id: new mongoose.Types.ObjectId(o._id) }, { $set: { 'history.$[h].at': old } }, { arrayFilters: [{ 'h.state': 'done' }] });
  assert.equal((await api('POST', `/orders/${o._id}/issue`, { token: tok.thuy, body: { type: 'Muộn rồi', photos: 1 } })).status, 409);

  assert.equal((await api('POST', '/reviews', { token: tok.thuy, body: { targetType: 'order', targetId: o._id, rating: 4, comment: 'Phở ngon, giao hơi chậm' } })).status, 201);
  const seen = (await api('GET', `/orders/${o._id}`, { token: tok.thuy })).body.data;
  assert.deepEqual(seen.review, { rating: 4, comment: 'Phở ngon, giao hơi chậm' });
});

test('đơn chờ xác nhận quá hạn tự hủy (đồ ăn 10 phút); xin hủy im lặng quá 12 giờ coi như đồng ý', async () => {
  const o = await order();
  const past = new Date(Date.now() - 20 * 60 * 1000);
  await Order().collection.updateOne({ _id: new mongoose.Types.ObjectId(o._id) }, { $set: { createdAt: past } });
  const seen = (await api('GET', `/orders/${o._id}`, { token: tok.thuy })).body.data;
  assert.equal(seen.state, 'cancelled');
  assert.equal(seen.cancelInfo.by, 'system');
  const mine = (await api('GET', '/seller/orders', { token: tok.lan })).body.data.find((x) => x._id === o._id);
  assert.equal(mine.state, 'cancelled', 'người bán thấy cùng kết quả');

  const o2 = await order();
  await act(tok.lan, o2._id, 'confirm'); await act(tok.lan, o2._id, 'prepare');
  await api('POST', `/orders/${o2._id}/cancel-request`, { token: tok.thuy, body: { reason: 'Có việc đột xuất' } });
  await Order().collection.updateOne({ _id: new mongoose.Types.ObjectId(o2._id) }, { $set: { 'cancelRequest.at': new Date(Date.now() - 13 * 3600 * 1000) } });
  const list = (await api('GET', '/orders?limit=100', { token: tok.thuy })).body.data;
  assert.equal(list.find((x) => x._id === o2._id).state, 'cancelled');

  const fresh = await order();
  assert.equal((await api('GET', `/orders/${fresh._id}`, { token: tok.thuy })).body.data.state, 'waiting', 'đơn mới chưa quá hạn');
});

test('người đăng việc đánh giá người làm sau khi xong; người làm thấy đã nhận tiền / đã đánh giá', async () => {
  const hoa = tok.hoa;
  const job = (await api('POST', '/seller/jobs', { token: hoa, body: { title: 'Lau cửa kính ban công', desc: 'Lau hai mặt kính', pay: 90000, unit: 'việc', workTime: 'Chiều nay', area: 'B', exactAddress: 'B-0902', headcount: 1 } })).body.data;
  const of = (await api('POST', `/jobs/${job._id}/offers`, { token: tok.thuy, body: { intro: 'Mình lau kính nhanh và sạch.', slots: [] } })).body.data;
  assert.equal((await api('POST', `/seller/offers/${of._id}/rate`, { token: hoa, body: { stars: 5 } })).status, 409, 'chưa xong');
  await api('POST', `/seller/offers/${of._id}/choose`, { token: hoa });
  await api('POST', `/offers/${of._id}/start`, { token: tok.thuy });
  await api('POST', `/offers/${of._id}/report-done`, { token: tok.thuy, body: { note: 'Đã lau xong', images: [] } });
  await api('POST', `/seller/offers/${of._id}/confirmDone`, { token: hoa });
  assert.equal((await api('POST', `/seller/offers/${of._id}/rate`, { token: tok.quoc, body: { stars: 5 } })).status, 403);
  assert.equal((await api('POST', `/seller/offers/${of._id}/rate`, { token: hoa, body: { stars: 9 } })).status, 422);
  const rated = (await api('POST', `/seller/offers/${of._id}/rate`, { token: hoa, body: { stars: 5, text: 'Làm kỹ, đúng giờ' } })).body.data;
  assert.equal(rated.posterRating.stars, 5);
  assert.equal((await api('POST', `/seller/offers/${of._id}/rate`, { token: hoa, body: { stars: 4 } })).status, 409, 'chỉ một lần');

  assert.equal((await api('POST', `/offers/${of._id}/confirm-paid`, { token: tok.thuy })).body.data.paidAt !== undefined, true);
  await api('POST', '/reviews', { token: tok.thuy, body: { targetType: 'offer', targetId: of._id, rating: 5, comment: 'Chị Hoa trả công đúng hẹn' } });
  const mine = (await api('GET', `/offers/${of._id}`, { token: tok.thuy })).body.data;
  assert.deepEqual(mine.review, { rating: 5, comment: 'Chị Hoa trả công đúng hẹn' });
  assert.equal(mine.posterRating.stars, 5, 'người làm thấy cả đánh giá của người đăng');
});

test('hoàn tiền hết cho đơn thì thu lại Xu đã cộng; hoàn một phần thì giữ Xu', async () => {
  const XuEntry = require('../src/modules/buyer/xu/xu.model').XuEntry;
  const run = async (amount) => {
    // người mua riêng (Xu cộng tối đa 3 đơn/ngày, Thủy đã hết lượt ở các test trên)
    const o = (await api('POST', '/orders', { token: tok.quoc, body: { postId: (await pho())._id, quantity: 1, fulfillment: 'pickup', payment: 'cash' } })).body.data;
    for (const a of ['confirm', 'prepare', 'ready']) await act(tok.lan, o._id, a);
    await api('POST', `/orders/${o._id}/confirm-received`, { token: tok.quoc });
    await api('POST', `/orders/${o._id}/issue`, { token: tok.quoc, body: { type: 'Thiếu món', photos: 1 } });
    await act(tok.lan, o._id, 'issueRefund', { amount: amount ?? o.total });
    await api('POST', `/orders/${o._id}/issue/close`, { token: tok.quoc, body: {} });
    return { id: o._id, got: await XuEntry.findOne({ key: `order:${o._id}` }), revoked: await XuEntry.findOne({ key: `revoke:order:${o._id}` }) };
  };
  const part = await run(10000);
  assert.ok(part.got && !part.revoked, 'hoàn một phần: giữ Xu');
  const full = await run();
  assert.ok(full.got && full.revoked && full.revoked.delta === -full.got.delta, 'hoàn hết: thu lại đúng số Xu đã cộng');
});
