process.env.NODE_ENV = 'test';
process.env.FORCE_RATE_LIMIT = '1'; // bật giới hạn tốc độ (mặc định tắt khi test)
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('đăng ký: quá 20 lần/giờ/IP thì 429 TOO_MANY_REQUESTS', async () => {
  for (let i = 0; i < 20; i++) {
    const r = await post('/auth/register', { name: `Người ${i}`, phone: `09100000${String(i).padStart(2, '0')}`, password: 'Matkhau@123' });
    assert.equal(r.status, 201, `lần ${i + 1}`);
  }
  const r = await post('/auth/register', { name: 'Người 21', phone: '0910000099', password: 'Matkhau@123' });
  assert.equal(r.status, 429);
  assert.equal((await r.json()).error.code, 'TOO_MANY_REQUESTS');
});

test('đăng nhập: quá 10 lần/15 phút/IP thì 429', async () => {
  let last;
  for (let i = 0; i < 11; i++) last = await post('/auth/login', { phone: '0910000000', password: 'sai-mat-khau' });
  assert.equal(last.status, 429);
});
