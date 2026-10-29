process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const xu = require('../src/modules/buyer/xu/xu.service');

let mongod; let server; let base; const cookies = {};
async function login(phone) {
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password: 'Test@2026' }) });
  return r.headers.get('set-cookie').split(';')[0];
}
async function api(method, path, who, data) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Cookie: cookies[who] } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const balance = async () => (await api('GET', '/me/xu', 'thuy')).body.data.balance;
let post;
const order = async (extra = {}) => (await api('POST', '/orders', 'thuy', {
  postId: post._id, quantity: 1, fulfillment: 'pickup', payment: 'cash', selections: [{ group: 'Món mặn', choices: ['Gà kho gừng'] }], ...extra,
}));
const finish = async (id) => { for (let i = 0; i < 4; i++) await api('POST', `/dev/orders/${id}/advance`, 'lan'); };

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  cookies.thuy = await login('0900000001');
  cookies.lan = await login('0900000002');
  post = (await api('GET', '/posts?q=Cơm nhà', 'thuy')).body.data[0];
  assert.equal(await balance(), 30); // Xu chào mừng
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('đơn từ 30.000đ hoàn thành → +10 Xu một lần; đánh giá có chữ → +5, không chữ thì không', async () => {
  const o = (await order()).body.data;
  await finish(o._id);
  assert.equal(await balance(), 40);
  await api('POST', `/dev/orders/${o._id}/advance`, 'lan'); // gọi thêm không cộng lần nữa (đã ở bước cuối → 409)
  assert.equal(await balance(), 40);
  assert.equal((await api('POST', '/reviews', 'thuy', { targetType: 'order', targetId: o._id, rating: 5, comment: 'Ngon' })).status, 201);
  assert.equal(await balance(), 45);
  const o2 = (await order()).body.data;
  await finish(o2._id);
  assert.equal(await balance(), 55);
  await api('POST', '/reviews', 'thuy', { targetType: 'order', targetId: o2._id, rating: 4 });
  assert.equal(await balance(), 55); // đánh giá không viết gì: không có Xu
});

test('việc hoàn thành +15 Xu một lần cho mỗi đề nghị', async () => {
  const user = (await api('GET', '/auth/profile', 'thuy')).body.data;
  const id = new mongoose.Types.ObjectId();
  assert.ok(await xu.award(user._id, 'job', id));
  assert.equal(await xu.award(user._id, 'job', id), null);
  assert.equal(await balance(), 70);
});

test('đơn dưới 30.000đ không có Xu; tối đa 3 đơn/ngày được cộng', async () => {
  const user = (await api('GET', '/auth/profile', 'thuy')).body.data;
  assert.equal(await xu.award(user._id, 'order', new mongoose.Types.ObjectId(), { total: 29000 }), null);
  // đã có 2 đơn trong ngày ở test đầu → thêm 1 đơn nữa được, đơn thứ 4 bị bỏ qua
  assert.ok(await xu.award(user._id, 'order', new mongoose.Types.ObjectId(), { total: 50000 }));
  assert.equal(await xu.award(user._id, 'order', new mongoose.Types.ObjectId(), { total: 50000 }), null);
});

test('voucher XU-… đổi từ Xu: dùng được một lần, sai chủ/đã dùng bị từ chối, hủy đơn thì trả lại', async () => {
  const v = (await api('POST', '/me/xu/redeem', 'thuy', { cid: 'v10' })).body.data; // đơn từ 50.000đ giảm 10.000đ
  const small = await order({ voucherCode: v.code });
  assert.equal(small.status, 422); // 35.000đ chưa đủ điều kiện
  const ok = await order({ quantity: 2, voucherCode: v.code });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.data.breakdown.discount, 10000);
  assert.equal(ok.body.data.total, 70000 - 10000);
  const again = await order({ quantity: 2, voucherCode: v.code });
  assert.equal(again.status, 422); // đã dùng
  assert.equal((await api('GET', '/me/xu', 'thuy')).body.data.vouchers.length, 1);
  assert.equal((await order({ quantity: 2, voucherCode: 'XU-ABCDEF' })).status, 422); // không phải của mình / không tồn tại

  await api('POST', `/dev/orders/${ok.body.data._id}/advance`, 'lan', { to: 'cancelled' });
  const back = await order({ quantity: 2, voucherCode: v.code });
  assert.equal(back.status, 201); // voucher đã được trả lại
  assert.equal(back.body.data.total, 60000);
});

test('mã cũ XU10 vẫn dùng được', async () => {
  const r = await order({ quantity: 2, voucherCode: 'XU10' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.breakdown.discount, 10000);
});
