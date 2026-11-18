// Đơn có bước báo giá: giặt sấy (lấy đồ → cân → báo giá) và sửa chữa (kiểm tra → báo giá); người mua đồng ý hoặc từ chối giá cuối.
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
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004'], ['linh', '0900000006']]) tok[k] = await login(p);
  const User = mongoose.model('User');
  const V = require('../src/modules/seller/verification.model');
  for (const phone of ['0900000002', '0900000006']) {
    const u = await User.findOne({ phone });
    await V.updateOne({ user: u._id }, { $setOnInsert: { user: u._id, status: 'approved', body: { fullName: u.name, idNumber: '012345678901', idFront: 'a', idBack: 'b', selfie: 'c', shopName: u.name, shopType: 'service' } } }, { upsert: true });
  }
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const addr = async () => (await api('POST', '/me/addresses', { token: tok.thuy, body: { name: 'Thủy', phone: '0901234567', block: 'B', unit: 'B-1' } })).body.data;
const act = (token, id, a, body) => api('POST', `/seller/orders/${id}/${a}`, { token, body });
const tomorrow = () => new Date(Date.now() + 86400000).toISOString();
const KG = [{ question: 'Khối lượng ước tính (kg)', value: '4' }]; // câu hỏi bắt buộc của bài giặt sấy mẫu

test('giặt sấy: lấy đồ → báo giá → khách đồng ý → trả đồ; tổng tiền đổi sang giá cuối', async () => {
  const post = (await api('GET', '/posts?limit=100')).body.data.find((p) => p.title.startsWith('Giặt sấy gấp'));
  const a = await addr();
  const placed = (await api('POST', '/orders', { token: tok.thuy, body: { postId: post._id, quantity: 3, fulfillment: 'delivery', addressId: a._id, payment: 'cash', scheduledAt: tomorrow(), answers: KG } })).body.data;
  assert.equal(placed.flow, 'laundry', 'bài giặt sấy → đơn có bước báo giá');
  const ship = placed.breakdown.deliveryFee || 0;
  const id = placed._id;

  assert.equal((await act(tok.linh, id, 'pickUp')).status, 409, 'chưa xác nhận đơn');
  assert.equal((await act(tok.linh, id, 'confirm')).body.data.state, 'confirmed');
  assert.equal((await act(tok.linh, id, 'prepare')).status, 409, 'đơn có báo giá không đi bước chuẩn bị thường');
  assert.equal((await act(tok.linh, id, 'quote', { lines: [{ name: 'Giặt sấy', qty: 4, price: 18000 }] })).status, 409, 'phải lấy đồ trước');
  assert.equal((await act(tok.linh, id, 'pickUp')).body.data.state, 'picked');

  assert.equal((await act(tok.linh, id, 'quote', { lines: [] })).status, 422, 'báo giá phải có dòng giá');
  assert.equal((await act(tok.linh, id, 'quote', { lines: [{ name: 'Giặt', qty: 0, price: 1000 }] })).status, 422);
  const q = (await act(tok.linh, id, 'quote', { lines: [{ name: 'Giặt sấy 4,5 kg', qty: 4.5, price: 18000 }, { name: 'Giặt chăn', qty: 1, price: 40000 }] })).body.data;
  assert.equal(q.state, 'pricing');
  assert.equal(q.quote.total, 121000, '4,5 × 18.000 + 40.000');
  assert.equal(q.quote.status, 'pending');

  const seen = (await api('GET', `/orders/${id}`, { token: tok.thuy })).body.data;
  assert.equal(seen.state, 'pricing'); assert.equal(seen.quote.lines.length, 2, 'người mua thấy giá cuối chờ duyệt');
  assert.equal((await api('POST', `/orders/${id}/approve-quote`, { token: tok.hoa })).status, 403, 'người khác không duyệt giúp được');
  assert.equal((await act(tok.linh, id, 'returned')).status, 409, 'chưa duyệt giá thì chưa trả đồ');

  const ok = (await api('POST', `/orders/${id}/approve-quote`, { token: tok.thuy })).body.data;
  assert.equal(ok.state, 'preparing'); assert.equal(ok.oldTotal, placed.total);
  assert.equal(ok.total, 121000 + ship, 'tổng = giá cuối + phí giao');
  assert.equal(ok.quote.status, 'approved');
  assert.equal((await api('POST', `/orders/${id}/approve-quote`, { token: tok.thuy })).status, 409, 'duyệt hai lần');

  const done = (await act(tok.linh, id, 'returned')).body.data;
  assert.equal(done.state, 'done');
  assert.deepEqual(done.history.map((h) => h.state), ['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'done']);
  const mine = (await api('GET', '/seller/orders', { token: tok.linh })).body.data.find((o) => o._id === id);
  assert.equal(mine.total, 121000 + ship, 'người bán thấy tổng mới');
});

test('sửa chữa báo giá sau: khách từ chối giá → đơn hủy, tổng giữ nguyên (chỉ phí kiểm tra), có lý do', async () => {
  const lan = tok.lan;
  const made = await api('POST', '/seller/posts', { token: lan, body: { type: 'service', category: 'Dịch vụ', title: 'Sửa máy lạnh tận nhà', description: 'Thợ đến nhà kiểm tra, báo giá sau khi xem máy.', price: 50000, unit: 'lần', area: 'B', areas: ['Bcons'], priceType: 'quote', inspectFee: 50000, fulfillmentModes: ['delivery'], payMethods: ['cash'], needSchedule: true } });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const a = await addr();
  const placed = await api('POST', '/orders', { token: tok.thuy, body: { postId: made.body.data._id, quantity: 1, fulfillment: 'delivery', addressId: a._id, payment: 'cash', scheduledAt: tomorrow() } });
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const id = placed.body.data._id;
  assert.equal(placed.body.data.flow, 'repair');
  await act(lan, id, 'confirm'); await act(lan, id, 'pickUp');
  const q = (await act(lan, id, 'quote', { lines: [{ name: 'Nạp gas + vệ sinh dàn', qty: 1, price: 450000 }] })).body.data;
  assert.equal(q.state, 'pricing');
  const rej = (await api('POST', `/orders/${id}/reject-quote`, { token: tok.thuy, body: { reason: 'Giá cao hơn nơi khác' } })).body.data;
  assert.equal(rej.state, 'cancelled'); assert.equal(rej.quote.status, 'rejected'); assert.equal(rej.quote.rejectReason, 'Giá cao hơn nơi khác');
  assert.equal(rej.total, placed.body.data.total, 'từ chối giá: tổng giữ nguyên = chỉ phí kiểm tra đã tính lúc đặt');
  assert.equal((await api('POST', `/orders/${id}/reject-quote`, { token: tok.thuy })).status, 409);
  assert.equal((await act(lan, id, 'returned')).status, 409, 'đơn đã hủy');
});

test('đơn thường không có bước báo giá; khách xin hủy thì chưa báo giá được nhưng vẫn hủy được', async () => {
  const food = (await api('GET', '/posts?limit=100')).body.data.find((p) => p.title.startsWith('Phở bò tái'));
  const a = await addr();
  const o = (await api('POST', '/orders', { token: tok.thuy, body: { postId: food._id, quantity: 1, fulfillment: 'pickup', payment: 'cash' } })).body.data;
  assert.equal(o.flow, undefined, 'đồ ăn không có luồng báo giá');
  assert.equal((await act(tok.lan, o._id, 'pickUp')).status, 409);
  assert.equal((await act(tok.lan, o._id, 'quote', { lines: [{ name: 'x', qty: 1, price: 1 }] })).status, 409);
  assert.equal((await api('POST', `/orders/${o._id}/approve-quote`, { token: tok.thuy })).status, 409);

  const post = (await api('GET', '/posts?limit=100')).body.data.find((p) => p.title.startsWith('Giặt sấy gấp'));
  const l = (await api('POST', '/orders', { token: tok.thuy, body: { postId: post._id, quantity: 1, fulfillment: 'delivery', addressId: a._id, payment: 'cash', scheduledAt: tomorrow(), answers: KG } })).body.data;
  await act(tok.linh, l._id, 'confirm'); await act(tok.linh, l._id, 'pickUp');
  await api('POST', `/orders/${l._id}/cancel-request`, { token: tok.thuy, body: { reason: 'Đổi ý' } });
  assert.equal((await act(tok.linh, l._id, 'quote', { lines: [{ name: 'Giặt', qty: 1, price: 20000 }] })).status, 409, 'phải trả lời yêu cầu hủy trước');
  assert.equal((await act(tok.linh, l._id, 'approveCancel')).body.data.state, 'cancelled', 'đã lấy đồ vẫn hủy được');
});
