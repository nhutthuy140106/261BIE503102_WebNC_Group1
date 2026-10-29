process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Order = require('../src/modules/buyer/order/order.model');
const { compute } = require('../src/modules/buyer/order/tracking');

let mongod; let server; let base;
const cookies = {};
async function login(phone) {
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password: 'Test@2026' }) });
  return r.headers.get('set-cookie').split(';')[0];
}
async function api(method, path, who, data) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Cookie: cookies[who] } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  cookies.thuy = await login('0900000001');
  cookies.lan = await login('0900000002');
  cookies.hoa = await login('0900000004');
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const fake = (state, startedMinAgo) => ({
  state, code: 'AG-O1', seller: 'abc', address: { block: 'C' }, fulfillment: 'delivery',
  history: state === 'delivering' ? [{ state: 'delivering', at: new Date(Date.now() - startedMinAgo * 60000) }] : [],
});

test('4 giai đoạn: waiting, preparing, delivering (xe giữa đường), delivered', () => {
  const w = compute(fake('confirmed'), { area: 'B' });
  const p = compute(fake('preparing'), { area: 'B' });
  assert.equal(w.courier.phase, 'waiting');
  assert.equal(p.courier.phase, 'preparing');
  assert.equal(p.courier.lat, p.shop.lat); // xe còn ở quán
  const d = compute(fake('delivering', 1), { area: 'B' });
  assert.equal(d.courier.phase, 'delivering');
  assert.ok(d.courier.etaMin >= 1);
  assert.ok(d.courier.distanceKm > 0 && d.courier.distanceKm < compute(fake('preparing'), { area: 'B' }).courier.distanceKm);
  const late = compute(fake('delivering', 999), { area: 'B' });
  assert.equal(late.courier.phase, 'delivered');
  assert.equal(late.courier.lat, late.home.lat);
  const done = compute(fake('done'), { area: 'B' });
  assert.equal(done.courier.phase, 'delivered');
  assert.equal(done.courier.distanceKm, 0);
  assert.equal(done.simulated, true);
});

test('cùng thời điểm thì hai lần gọi ra cùng vị trí; Block khác thì toạ độ khác', () => {
  const now = Date.now();
  const o = fake('delivering', 1);
  assert.deepEqual(compute(o, { area: 'B' }, now), compute(o, { area: 'B' }, now));
  assert.notEqual(compute(o, { area: 'A' }).shop.lat, compute(o, { area: 'D' }).shop.lat);
});

test('API: chủ đơn và người bán xem được; người ngoài 403; tự lấy/dịch vụ 404 NO_TRACKING; id sai 400', async () => {
  const post = (await api('GET', '/posts?q=Cơm nhà', 'thuy')).body.data[0];
  const addr = (await api('POST', '/me/addresses', 'thuy', { name: 'Ngọc Thủy', phone: '0901234567', block: 'C', unit: 'C-0912' })).body.data;
  const o = (await api('POST', '/orders', 'thuy', {
    postId: post._id, quantity: 1, fulfillment: 'delivery', addressId: addr._id, payment: 'cash',
    selections: [{ group: 'Món mặn', choices: ['Gà kho gừng'] }],
  })).body.data;
  assert.equal((await api('GET', `/orders/${o._id}/tracking`)).status, 401);
  const r = await api('GET', `/orders/${o._id}/tracking`, 'thuy');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.courier.phase, 'waiting');
  assert.deepEqual((await api('GET', `/orders/${o._id}/tracking`, 'lan')).body.data, r.body.data); // người bán thấy y hệt
  assert.equal((await api('GET', `/orders/${o._id}/tracking`, 'hoa')).status, 403);
  assert.equal((await api('GET', '/orders/xyz/tracking', 'thuy')).status, 400);

  await Order.updateOne({ _id: o._id }, { state: 'delivering', $push: { history: { state: 'delivering', at: new Date() } } });
  assert.equal((await api('GET', `/orders/${o._id}/tracking`, 'thuy')).body.data.courier.phase, 'delivering');

  const pick = (await api('POST', '/orders', 'thuy', {
    postId: post._id, quantity: 1, fulfillment: 'pickup', payment: 'cash', selections: [{ group: 'Món mặn', choices: ['Gà kho gừng'] }],
  })).body.data;
  const nt = await api('GET', `/orders/${pick._id}/tracking`, 'thuy');
  assert.equal(nt.status, 404);
  assert.equal(nt.body.error.code, 'NO_TRACKING');
});
