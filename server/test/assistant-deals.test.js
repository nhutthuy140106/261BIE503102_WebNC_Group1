process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Post = require('../src/modules/shared/post.model');
const tools = require('../src/modules/buyer/assistant/assistant.tools');
const assistant = require('../src/modules/buyer/assistant/assistant.service');

let mongod; let server; let base; let cookie;
const EVERY = [0, 1, 2, 3, 4, 5, 6];
async function ask(content) {
  const res = await fetch(base + '/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ messages: [{ role: 'user', content }] }) });
  return { status: res.status, body: await res.json() };
}
before(async () => {
  process.env.ASSISTANT_MODE = 'local'; // chỉ dùng bộ luật, không gọi AI thật dù .env có khóa
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '0900000001', password: 'Test@2026' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const setPromo = (title, promo) => Post.updateOne({ title: new RegExp(title) }, { promo });
const ALL_DAY = { kind: 'percent', value: 20, from: '00:00', to: '23:59', days: EVERY, active: true };

test('chưa có bài giảm thì trả lời thật thà, không có thẻ', async () => {
  const r = await ask('đang giảm giá gì');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.cards, []);
  assert.match(r.body.data.reply, /chưa có/i);
});

test('"đang giảm giá / khuyến mãi / giờ vàng" → thẻ giá thực trả + giá gốc + nhãn + giờ hết', async () => {
  await setPromo('Cơm nhà', ALL_DAY);
  for (const q of ['đang giảm giá gì vậy', 'có khuyến mãi không', 'giờ vàng hôm nay', 'có ưu đãi gì']) {
    const r = await ask(q);
    assert.equal(r.status, 200, q);
    const c = r.body.data.cards.find((x) => /Cơm nhà/.test(x.title));
    assert.ok(c, q);
    assert.equal(c.price, 28000, q);        // 35.000 giảm 20%
    assert.equal(c.originalPrice, 35000);
    assert.equal(c.dealLabel, 'Giảm 20%');
    assert.ok(c.dealEndsAt);
    assert.match(r.body.data.reply, /còn \d+/);
  }
});

test('công cụ deals_now (cho Gemini/Groq): lọc theo loại; có trong TOOLS', async () => {
  assert.ok(assistant.TOOLS.some((t) => t.name === 'deals_now'));
  const food = await tools.dealsNow({ type: 'food' });
  assert.equal(food.cards.length, 1);
  assert.equal((await tools.dealsNow({ type: 'service' })).cards.length, 0);
  assert.equal(food.cards[0].originalPrice, 35000);
});

test('tìm kiếm thường hiện giá đã giảm; pick_dish ưu tiên món đang giảm nhưng vẫn trong ngân sách', async () => {
  const r = await ask('cơm nhà');
  const c = r.body.data.cards.find((x) => /Cơm nhà/.test(x.title));
  assert.equal(c.price, 28000);
  let onSale = 0;
  for (let i = 0; i < 60; i++) {
    const p = await tools.pickDish({ max_price: 100000 });
    assert.equal(p.cards.length, 1);
    if (p.cards[0].dealLabel) onSale++;
  }
  assert.ok(onSale >= 30, `chỉ ${onSale}/60 lần chọn món đang giảm`); // kỳ vọng ~70%+
});

test('hết khung giờ thì không còn là bài giảm trong deals_now', async () => {
  await setPromo('Cơm nhà', { ...ALL_DAY, active: false });
  assert.equal((await tools.dealsNow({})).cards.length, 0);
});
