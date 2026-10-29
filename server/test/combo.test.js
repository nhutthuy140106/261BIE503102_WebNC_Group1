process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
process.env.ASSISTANT_MODE = 'local'; // chatbot chỉ dùng bộ luật, không gọi AI thật
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Post = require('../src/modules/shared/post.model');
const User = require('../src/modules/shared/user.model');

let mongod; let server; let base; let cookie;
let lan; let com; let pho; let combo;
const EVERY = [0, 1, 2, 3, 4, 5, 6];
async function api(method, path, data) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const mk = (over) => ({
  type: 'food', category: 'Combo', title: 'Combo thử', description: 'Combo thử', unit: 'combo', seller: lan._id, area: 'B',
  fulfillmentModes: ['pickup'], ...over,
});
const order = (extra = {}) => api('POST', '/orders', { postId: String(combo._id), quantity: 1, fulfillment: 'pickup', payment: 'cash', selections: [], ...extra });

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '0900000001', password: 'Test@2026' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
  lan = await User.findOne({ phone: '0900000002' });
  com = await Post.findOne({ title: /Cơm nhà/ });
  pho = await Post.findOne({ title: /Phở bò/ });
  assert.ok(com && pho && String(com.seller) === String(lan._id) && String(pho.seller) === String(lan._id));
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('server kiểm combo: >= 2 món khác nhau, cùng người bán, giá thấp hơn tổng lẻ, không chứa hàng bán một lần', async () => {
  const items = [{ postId: com._id, qty: 1 }, { postId: pho._id, qty: 1 }]; // 35.000 + 45.000 = 80.000
  await assert.rejects(Post.create(mk({ combo: { items: [items[0]], comboPrice: 30000 } })), /ít nhất 2 món/);
  await assert.rejects(Post.create(mk({ combo: { items: [items[0], items[0]], comboPrice: 30000 } })), /ít nhất 2 món khác nhau/);
  await assert.rejects(Post.create(mk({ combo: { items, comboPrice: 80000 } })), /thấp hơn tổng giá lẻ/);
  await assert.rejects(Post.create(mk({ combo: { items, comboPrice: 90000 } })), /thấp hơn tổng giá lẻ/);
  const may = await Post.findOne({ title: /Trà sữa/ });
  await assert.rejects(Post.create(mk({ combo: { items: [items[0], { postId: may._id, qty: 1 }], comboPrice: 50000 } })), /không phải của người bán này/);
  const taiNghe = await Post.findOne({ oneTime: true });
  if (taiNghe && String(taiNghe.seller) === String(lan._id)) await assert.rejects(Post.create(mk({ combo: { items: [items[0], { postId: taiNghe._id, qty: 1 }], comboPrice: 10000 } })), /bán một lần/);
  await assert.rejects(Post.create(mk({ combo: { items: [items[0], { postId: new mongoose.Types.ObjectId(), qty: 1 }], comboPrice: 10000 } })), /không tồn tại/);

  combo = await Post.create(mk({ title: 'Combo cơm + phở', combo: { items, comboPrice: 70000 } }));
  assert.equal(combo.price, 70000); // price của bài = giá combo
  assert.equal(combo.combo.listPrice, 80000); // server tự tính
  await assert.rejects(Post.create(mk({ combo: { items: [{ postId: combo._id, qty: 1 }, items[0]], comboPrice: 10000 } })), /đã là combo/);
});

test('danh sách có listPrice; chi tiết liệt kê món + số tiền tiết kiệm', async () => {
  const list = (await api('GET', '/posts?q=Combo')).body.data;
  const hit = list.find((p) => p._id === String(combo._id));
  assert.equal(hit.price, 70000);
  assert.equal(hit.combo.listPrice, 80000);
  const d = (await api('GET', `/posts/${combo._id}`)).body.data;
  assert.equal(d.comboDetail.items.length, 2);
  assert.deepEqual(d.comboDetail.items.map((i) => [i.title.slice(0, 3), i.qty, i.unitPrice]).sort(), [['Cơm', 1, 35000], ['Phở', 1, 45000]].sort());
  assert.equal(d.comboDetail.saving, 10000);
  assert.equal(d.comboDetail.listPrice, 80000);
  // bài thường không có comboDetail
  assert.equal((await api('GET', `/posts/${com._id}`)).body.data.comboDetail, undefined);
});

test('đặt combo: một đơn có snapshot từng món, tính theo giá combo, Giờ vàng áp lên combo, trừ kho từng món', async () => {
  await Post.updateOne({ _id: com._id }, { stock: 5 });
  await Post.updateOne({ _id: pho._id }, { stock: 3 });
  const r = await order({ quantity: 2 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o = r.body.data;
  assert.equal(o.breakdown.items, 140000);
  assert.equal(o.total, 140000);
  assert.equal(o.snapshot.listPrice, 80000);
  assert.deepEqual(o.snapshot.combo.map((i) => [i.title.slice(0, 3), i.qty, i.unitPrice]).sort(), [['Cơm', 1, 35000], ['Phở', 1, 45000]].sort());
  assert.equal((await Post.findById(com._id)).stock, 3); // 5 - 2
  assert.equal((await Post.findById(pho._id)).stock, 1); // 3 - 2

  await Post.updateOne({ _id: combo._id }, { promo: { kind: 'percent', value: 10, from: '00:00', to: '23:59', days: EVERY, active: true } });
  const g = await order({ quantity: 1 });
  assert.equal(g.status, 201, JSON.stringify(g.body));
  assert.equal(g.body.data.total, 63000); // 70.000 giảm 10%
  assert.equal(g.body.data.snapshot.originalPrice, 70000);
  const d = (await api('GET', `/posts/${combo._id}`)).body.data;
  assert.equal(d.comboDetail.saving, 17000); // 80.000 - 63.000
});

test('thiếu số lượng một món hoặc món đã dừng bán thì 409 và không trừ kho món nào', async () => {
  await Post.updateOne({ _id: com._id }, { stock: 5 });
  await Post.updateOne({ _id: pho._id }, { stock: 1 });
  const r = await order({ quantity: 2 }); // phở chỉ còn 1
  assert.equal(r.status, 409);
  assert.match(r.body.error.message, /Phở/);
  assert.equal((await Post.findById(com._id)).stock, 5);
  assert.equal((await Post.findById(pho._id)).stock, 1);
  await Post.updateOne({ _id: pho._id }, { status: 'hidden' });
  const h = await order({ quantity: 1 });
  assert.equal(h.status, 409);
  assert.match(h.body.error.message, /không còn bán/);
});

test('chatbot: "combo dưới 80k" ra thẻ combo kèm giá lẻ để hiện tiết kiệm', async () => {
  await Post.updateOne({ _id: pho._id }, { status: 'open' });
  const res = await fetch(base + '/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ messages: [{ role: 'user', content: 'combo dưới 80k' }] }) });
  const cards = (await res.json()).data.cards;
  const c = cards.find((x) => x.id === String(combo._id));
  assert.ok(c, JSON.stringify(cards));
  assert.equal(c.combo, true);
  assert.equal(c.listPrice, 80000);
  assert.ok(c.price <= 80000);
});
