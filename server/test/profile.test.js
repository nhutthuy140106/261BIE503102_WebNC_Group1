// Sửa hồ sơ + đổi mật khẩu khi đang đăng nhập.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
async function api(method, p, { body, token } = {}) {
  const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token && token.c ? { Cookie: token.c } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = res.headers.get('set-cookie');
  if (token && sc) token.c = sc.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('sửa hồ sơ: chỉ trường gửi lên mới đổi, rỗng = xóa, ảnh chỉ nhận ảnh của AntGo', async () => {
  const jar = { c: '' };
  await api('POST', '/auth/login', { body: { phone: '0900000005', password: 'Test@2026' }, token: jar });
  assert.equal((await api('PATCH', '/auth/profile', { body: { name: 'X' } })).status, 401, 'cần đăng nhập');

  const r = (await api('PATCH', '/auth/profile', { token: jar, body: { name: 'Quốc Anh Mới', email: 'Quoc@Example.com', gender: 'male', birthday: '2000-05-20', bio: 'Thích sửa đồ điện', avatar: '/images/uploads/chat/a.jpg' } })).body.data;
  assert.deepEqual({ name: r.name, email: r.email, gender: r.gender, birthday: r.birthday, bio: r.bio, avatar: r.avatar }, { name: 'Quốc Anh Mới', email: 'quoc@example.com', gender: 'male', birthday: '2000-05-20', bio: 'Thích sửa đồ điện', avatar: '/images/uploads/chat/a.jpg' });

  const part = (await api('PATCH', '/auth/profile', { token: jar, body: { bio: '' } })).body.data;
  assert.equal(part.bio, undefined, 'rỗng = xóa');
  assert.equal(part.name, 'Quốc Anh Mới', 'trường không gửi giữ nguyên');
  assert.equal((await api('GET', '/auth/profile', { token: jar })).body.data.email, 'quoc@example.com', 'lưu thật');

  assert.equal((await api('PATCH', '/auth/profile', { token: jar, body: { avatar: 'data:image/png;base64,AAAA' } })).status, 422, 'không nhận base64');
  assert.equal((await api('PATCH', '/auth/profile', { token: jar, body: { email: 'khong-phai-email' } })).status, 422);
  assert.equal((await api('PATCH', '/auth/profile', { token: jar, body: { name: 'A' } })).status, 422);
  assert.equal((await api('PATCH', '/auth/profile', { token: jar, body: { role: 'admin' } })).body.data.role, 'enduser', 'không tự đổi vai trò');
});

test('đổi mật khẩu: cần đúng mật khẩu hiện tại, mật khẩu mới ≥ 8 ký tự và khác cũ; đăng nhập lại bằng mật khẩu mới', async () => {
  const jar = { c: '' };
  await api('POST', '/auth/login', { body: { phone: '0900000003', password: 'Test@2026' }, token: jar });
  assert.equal((await api('POST', '/auth/password/change', { token: jar, body: { current: 'Sai@2026x', next: 'Moi@2026ok' } })).status, 422, 'sai mật khẩu hiện tại');
  assert.equal((await api('POST', '/auth/password/change', { token: jar, body: { current: 'Test@2026', next: 'ngan' } })).status, 422, 'quá ngắn');
  assert.equal((await api('POST', '/auth/password/change', { token: jar, body: { current: 'Test@2026', next: 'Test@2026' } })).status, 422, 'trùng mật khẩu cũ');
  assert.equal((await api('POST', '/auth/password/change', { token: jar, body: { current: 'Test@2026', next: 'Moi@2026ok' } })).status, 204);
  assert.equal((await api('POST', '/auth/login', { body: { phone: '0900000003', password: 'Test@2026' } })).status, 401, 'mật khẩu cũ hết dùng');
  assert.equal((await api('POST', '/auth/login', { body: { phone: '0900000003', password: 'Moi@2026ok' } })).status, 200);
});
