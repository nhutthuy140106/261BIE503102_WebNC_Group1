process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base; let cookie = '';
async function api(method, path, data, withCookie = true) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(withCookie && cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
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

test('chưa đăng nhập thì 401', async () => {
  assert.equal((await api('GET', '/me/xu', null, false)).status, 401);
});

test('lần đầu có 30 Xu chào mừng, gọi lại không cộng thêm', async () => {
  assert.equal((await api('GET', '/me/xu')).body.data.balance, 30);
  const again = (await api('GET', '/me/xu')).body.data;
  assert.equal(again.balance, 30);
  assert.equal(again.ledger.length, 1);
});

test('điểm vượt 80, game lạ hoặc điểm âm bị từ chối', async () => {
  assert.equal((await api('POST', '/me/xu/game', { game: 'hai-xu', score: 81 })).status, 422);
  assert.equal((await api('POST', '/me/xu/game', { game: 'abc', score: 10 })).status, 422);
  assert.equal((await api('POST', '/me/xu/game', { game: 'hai-xu', score: -1 })).status, 422);
});

test('tối đa 3 lượt/ngày, mỗi lượt cộng floor(điểm/8) Xu, lượt thứ 4 bị 429 GAME_LIMIT', async () => {
  const a = await api('POST', '/me/xu/game', { game: 'hai-xu', score: 80 });
  assert.equal(a.body.data.granted, 10);
  assert.equal(a.body.data.playsLeft, 2);
  assert.equal(a.body.data.capLeft, 20);
  assert.equal((await api('POST', '/me/xu/game', { game: 'hai-xu', score: 15 })).body.data.granted, 1);
  const c = await api('POST', '/me/xu/game', { game: 'hai-xu', score: 80 });
  assert.equal(c.body.data.playsLeft, 0);
  const d = await api('POST', '/me/xu/game', { game: 'hai-xu', score: 80 });
  assert.equal(d.status, 429);
  assert.equal(d.body.error.code, 'GAME_LIMIT');
  assert.equal((await api('GET', '/me/xu')).body.data.balance, 30 + 10 + 1 + 10);
});

test('đổi voucher trừ Xu; không đủ Xu thì 409; mã lạ thì 404', async () => {
  const ok = await api('POST', '/me/xu/redeem', { cid: 'v10' });
  assert.equal(ok.status, 201);
  assert.match(ok.body.data.code, /^XU-[0-9A-F]{6}$/);
  assert.equal(ok.body.data.balance, 51 - 20);
  assert.equal((await api('POST', '/me/xu/redeem', { cid: 'v20' })).status, 409);
  assert.equal((await api('POST', '/me/xu/redeem', { cid: 'zzz' })).status, 404);
  const o = (await api('GET', '/me/xu')).body.data;
  assert.equal(o.vouchers.length, 1);
  assert.equal(o.vouchers[0].status, 'active');
});
