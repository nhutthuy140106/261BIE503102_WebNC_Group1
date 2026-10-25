process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base; let cookie = '';
async function api(method, path, withCookie = true) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(withCookie && cookie ? { Cookie: cookie } : {}) } });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, res };
}
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '0900000001', password: 'Test@2026' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('chưa đăng nhập thì 401; thiếu tham số thì 422', async () => {
  assert.equal((await api('GET', '/pricing/suggest?kind=food&title=com%20ga', false)).status, 401);
  assert.equal((await api('GET', '/pricing/suggest?kind=food')).status, 422);
  assert.equal((await api('GET', '/pricing/suggest?kind=xyz&title=abc')).status, 422);
});

test('trả khoảng giá hợp lý: low ≤ suggested ≤ high, có mẫu và cơ sở', async () => {
  const r = await api('GET', '/pricing/suggest?kind=food&title=' + encodeURIComponent('Cơm gà xối mỡ'));
  assert.equal(r.status, 200);
  const d = r.body.data;
  assert.ok(d, 'cần có gợi ý khi kho có bài đồ ăn');
  assert.ok(d.low <= d.suggested && d.suggested <= d.high);
  assert.ok(d.samples >= 1 && Array.isArray(d.basis));
  assert.ok(['high', 'medium', 'low'].includes(d.confidence));
});

test('việc làm dùng tiền công', async () => {
  const r = await api('GET', '/pricing/suggest?kind=job&title=' + encodeURIComponent('Dọn nhà theo giờ'));
  assert.equal(r.status, 200);
  if (r.body.data) assert.ok(r.body.data.suggested > 0);
});
