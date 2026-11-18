process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Otp = require('../src/modules/auth/otp.model');
const User = require('../src/modules/shared/user.model');

let mongod; let server; let base;
async function api(method, path, data) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const send = (phone, purpose) => api('POST', '/auth/otp/send', { phone, purpose });
const verify = (phone, purpose, code) => api('POST', '/auth/otp/verify', { phone, purpose, code });
const reg = (phone) => api('POST', '/auth/register', { name: 'Người mới', phone, password: 'matkhau123' });
// bỏ cooldown 60 giây để test không phải chờ
const skipCooldown = (phone, purpose) => Otp.updateOne({ phone, purpose }, { lastSentAt: new Date(Date.now() - 61000) });

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('đăng ký: không có mã xác minh thì bị từ chối; có mã đúng thì tạo tài khoản đã xác minh SĐT', async () => {
  const phone = '0911000001';
  assert.equal((await reg(phone)).status, 403); // chưa xác minh
  const s = await send(phone, 'register');
  assert.equal(s.status, 200, JSON.stringify(s.body));
  assert.match(s.body.data.devCode, /^\d{6}$/);
  assert.equal(s.body.data.expiresInSec, 300);
  assert.equal((await reg(phone)).status, 403); // đã gửi mã nhưng chưa nhập
  assert.equal((await verify(phone, 'register', s.body.data.devCode)).status, 200);
  const r = await reg(phone);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok((await User.findOne({ phone })).phoneVerifiedAt);
  assert.equal((await reg(phone)).status, 409); // số đã có tài khoản
});

test('mã chỉ lưu dạng băm, dùng được một lần', async () => {
  const phone = '0911000002';
  const code = (await send(phone, 'register')).body.data.devCode;
  const row = await Otp.findOne({ phone, purpose: 'register' });
  assert.ok(row.codeHash && !row.codeHash.includes(code), 'không được lưu mã gốc');
  assert.equal((await verify(phone, 'register', code)).status, 200);
  assert.equal((await verify(phone, 'register', code)).status, 409); // mã đã dùng
  assert.equal((await reg(phone)).status, 201);
  assert.equal((await reg('0911000002')).status, 409);
  // xác minh chỉ dùng cho MỘT lần đăng ký
  assert.equal(await Otp.countDocuments({ phone, purpose: 'register' }), 0);
});

test('nhập sai: báo còn bao nhiêu lần, quá 5 lần thì khóa mã dù sau đó nhập đúng', async () => {
  const phone = '0911000003';
  const code = (await send(phone, 'register')).body.data.devCode;
  const wrong = code === '000000' ? '111111' : '000000';
  const first = await verify(phone, 'register', wrong);
  assert.equal(first.status, 422);
  assert.match(first.body.error.message, /còn 4 lần/);
  for (let i = 0; i < 4; i += 1) await verify(phone, 'register', wrong);
  assert.equal((await verify(phone, 'register', code)).status, 429); // đã khóa
  assert.equal((await reg(phone)).status, 403);
  // xin mã mới thì dùng lại được
  await skipCooldown(phone, 'register');
  const again = await send(phone, 'register');
  assert.equal((await verify(phone, 'register', again.body.data.devCode)).status, 200);
});

test('gửi lại quá sớm bị từ chối (429); tối đa 5 lần mỗi giờ', async () => {
  const phone = '0911000004';
  assert.equal((await send(phone, 'register')).status, 200);
  const early = await send(phone, 'register');
  assert.equal(early.status, 429);
  assert.match(early.body.error.message, /giây/);
  for (let i = 0; i < 4; i += 1) { await skipCooldown(phone, 'register'); assert.equal((await send(phone, 'register')).status, 200); }
  await skipCooldown(phone, 'register');
  const sixth = await send(phone, 'register');
  assert.equal(sixth.status, 429);
  assert.match(sixth.body.error.message, /1 giờ/);
});

test('mã hết hạn thì không dùng được', async () => {
  const phone = '0911000005';
  const code = (await send(phone, 'register')).body.data.devCode;
  await Otp.updateOne({ phone, purpose: 'register' }, { expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await verify(phone, 'register', code)).status, 409);
});

test('đăng ký bằng số đã có tài khoản: không gửi mã', async () => {
  assert.equal((await send('0900000001', 'register')).status, 409);
});

test('quên mật khẩu: đặt mật khẩu mới sau khi nhập đúng mã, đăng nhập được bằng mật khẩu mới', async () => {
  const phone = '0900000001';
  assert.equal((await api('POST', '/auth/password/reset', { phone, password: 'MatKhauMoi99' })).status, 403); // chưa xác minh
  const s = await send(phone, 'reset');
  assert.equal(s.status, 200);
  assert.match(s.body.data.devCode, /^\d{6}$/);
  assert.equal((await api('POST', '/auth/password/reset', { phone, password: 'MatKhauMoi99' })).status, 403); // gửi mã chưa nhập
  assert.equal((await verify(phone, 'reset', s.body.data.devCode)).status, 200);
  assert.equal((await api('POST', '/auth/password/reset', { phone, password: 'MatKhauMoi99' })).status, 204);
  assert.equal((await api('POST', '/auth/login', { phone, password: 'Test@2026' })).status, 401); // mật khẩu cũ hết dùng
  assert.equal((await api('POST', '/auth/login', { phone, password: 'MatKhauMoi99' })).status, 200);
  // xác minh chỉ dùng một lần
  assert.equal((await api('POST', '/auth/password/reset', { phone, password: 'LanHai12345' })).status, 403);
});

test('quên mật khẩu không lộ số nào đã đăng ký: số lạ vẫn trả như đã gửi nhưng không có mã', async () => {
  const known = await send('0900000002', 'reset');
  const unknown = await send('0911999999', 'reset');
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.data.sent, true);
  assert.equal(unknown.body.data.devCode, undefined);
  assert.equal(await Otp.countDocuments({ phone: '0911999999' }), 0);
  // không đặt lại được mật khẩu cho số lạ
  assert.equal((await api('POST', '/auth/password/reset', { phone: '0911999999', password: 'MatKhauMoi99' })).status, 403);
});

test('mã xác minh để đăng ký không dùng được để đặt lại mật khẩu (và ngược lại)', async () => {
  const phone = '0900000003';
  const s = await send(phone, 'reset');
  await verify(phone, 'reset', s.body.data.devCode);
  assert.equal((await api('POST', '/auth/password/reset', { phone, password: 'MatKhauMoi99' })).status, 204);
  assert.equal((await verify(phone, 'register', '123456')).status, 409); // chưa xin mã đăng ký cho số này
});

test('dữ liệu gửi lên sai định dạng thì 422', async () => {
  assert.equal((await send('123', 'register')).status, 422);
  assert.equal((await send('0911000009', 'xoa-tat-ca')).status, 422);
  assert.equal((await verify('0911000009', 'register', 'abc')).status, 422);
});
