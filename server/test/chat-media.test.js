// Tệp đính kèm tin nhắn (ảnh / video / ghi âm / tệp), ảnh đại diện riêng của gian hàng, trang gian hàng công khai + theo dõi.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const fs = require('fs');
const path = require('path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
const tok = {}; const made = [];
async function api(method, p, { body, token } = {}) {
  const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token && token.c ? { Cookie: token.c } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = res.headers.get('set-cookie');
  if (token && sc) token.c = sc.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const login = async (phone) => { const jar = { c: '' }; await api('POST', '/auth/login', { body: { phone, password: 'Test@2026' }, token: jar }); return jar; };
/** Tải một tệp lên /uploads/media */
async function upload(bytes, name, token, hint) {
  const f = new FormData();
  if (hint) f.append('hint', hint);
  f.append('file', new Blob([bytes]), name);
  const res = await fetch(`${base}/uploads/media`, { method: 'POST', body: f, headers: token && token.c ? { Cookie: token.c } : {} });
  const body = await res.json();
  if (body.data && body.data.url) made.push(body.data.url);
  return { status: res.status, body };
}
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(40)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(40)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(40)]);
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(40)]);

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004']]) tok[k] = await login(p);
});
after(async () => {
  for (const u of made) fs.promises.unlink(path.join(__dirname, '../public', u)).catch(() => undefined); // dọn tệp test đã ghi vào public/images/uploads/chat
  server.close(); await mongoose.disconnect(); await mongod.stop();
});

test('tải tệp đính kèm: nhận dạng bằng chữ ký đầu file, không tin đuôi tên', async () => {
  const t = tok.thuy;
  assert.equal((await upload(PNG, 'a.png')).status, 401, 'cần đăng nhập');
  const img = await upload(PNG, 'anh.png', t);
  assert.equal(img.status, 201);
  assert.equal(img.body.data.kind, 'image'); assert.match(img.body.data.url, /^\/images\/uploads\/chat\/[0-9a-f-]{36}\.png$/); assert.equal(img.body.data.name, 'anh.png');
  assert.equal((await upload(PDF, 'hop-dong.pdf', t)).body.data.kind, 'file');
  assert.equal((await upload(MP4, 'clip.mp4', t)).body.data.kind, 'video');
  assert.equal((await upload(WEBM, 'x.webm', t)).body.data.kind, 'video', 'webm mặc định là video');
  assert.equal((await upload(WEBM, 'ghi-am.webm', t, 'audio')).body.data.kind, 'audio', 'webm kèm hint=audio là ghi âm');
  const docx = await upload(DOCX, 'bao-gia.docx', t);
  assert.equal(docx.body.data.kind, 'file'); assert.match(docx.body.data.url, /\.docx$/);
  // đuôi giả: nội dung là ảnh nhưng tên .exe → vẫn là ảnh, tên server tự sinh
  const fake = await upload(PNG, 'virus.exe', t);
  assert.equal(fake.body.data.kind, 'image'); assert.match(fake.body.data.url, /\.png$/);
  // nội dung không nhận dạng được → từ chối dù tên là .png
  const bad = await upload(Buffer.from('#!/bin/sh\necho hi\n'), 'script.png', t);
  assert.equal(bad.status, 422);
  assert.equal((await upload(Buffer.from('MZ\x90\x00 chuong trinh'), 'a.exe', t)).status, 422);
  // ảnh quá 5 MB
  assert.equal((await upload(Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]), 'lon.png', t)).status, 413);
  // không gửi tệp
  const none = await fetch(`${base}/uploads/media`, { method: 'POST', body: new FormData(), headers: { Cookie: t.c } });
  assert.equal(none.status, 422);
});

test('tin nhắn kèm tệp: gửi, đọc lại, nhãn xem trước, chặn link ngoài, chặn tin rỗng', async () => {
  const { thuy, lan } = tok;
  const lanId = (await api('GET', '/auth/profile', { token: lan })).body.data._id;
  const conv = (await api('POST', '/conversations', { token: thuy, body: { withUser: lanId } })).body.data;
  const file = (await upload(PDF, 'thuc-don.pdf', thuy)).body.data;

  const sent = await api('POST', `/conversations/${conv._id}/messages`, { token: thuy, body: { text: '', media: file } });
  assert.equal(sent.status, 201, JSON.stringify(sent.body));
  assert.deepEqual(sent.body.data.media, { kind: 'file', url: file.url, name: 'thuc-don.pdf', size: file.size });
  const withText = await api('POST', `/conversations/${conv._id}/messages`, { token: thuy, body: { text: 'Cô xem giúp con thực đơn nhé', media: file } });
  assert.equal(withText.body.data.text, 'Cô xem giúp con thực đơn nhé');

  const list = (await api('GET', `/conversations/${conv._id}/messages`, { token: lan })).body.data;
  assert.equal(list[0].media.kind, 'file', 'người nhận thấy tệp');
  assert.equal((await api('GET', '/conversations', { token: lan })).body.data[0].lastMessage.text, 'Cô xem giúp con thực đơn nhé');
  await api('POST', `/conversations/${conv._id}/messages`, { token: thuy, body: { media: (await upload(PNG, 'a.png', thuy)).body.data } });
  assert.equal((await api('GET', '/conversations', { token: lan })).body.data[0].lastMessage.text, 'Đã gửi một ảnh', 'tin chỉ có ảnh: xem trước ghi "Đã gửi một ảnh"');

  assert.equal((await api('POST', `/conversations/${conv._id}/messages`, { token: thuy, body: { text: '', media: { kind: 'image', url: 'https://evil.example/x.png' } } })).status, 422, 'không nhận link ngoài');
  assert.equal((await api('POST', `/conversations/${conv._id}/messages`, { token: thuy, body: { text: '' } })).status, 422, 'tin rỗng');
  assert.equal((await api('POST', `/conversations/${conv._id}/messages`, { token: thuy, body: { text: 'Xin chào' } })).status, 201, 'tin chữ vẫn gửi như cũ');
});

test('ảnh đại diện / ảnh bìa riêng của gian hàng: chỉ nhận ảnh do server cấp hoặc link https', async () => {
  const lan = tok.lan;
  const before = (await api('GET', '/seller/shop', { token: lan })).body.data.shop;
  assert.equal(before.avatar, '', 'chưa đặt thì dùng ảnh tài khoản (fixture chưa có ảnh)');
  const up = (await upload(PNG, 'dai-dien.png', lan)).body.data.url;

  const ok = await api('PUT', '/seller/shop', { token: lan, body: { avatar: up, cover: up } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.data.shop.avatar, up); assert.equal(ok.body.data.shop.cover, up);
  assert.equal((await api('PUT', '/seller/shop', { token: lan, body: { avatar: 'data:image/png;base64,AAAA' } })).status, 422, 'không nhận ảnh nhúng base64');
  assert.equal((await api('PUT', '/seller/shop', { token: lan, body: { avatar: 'javascript:alert(1)' } })).status, 422);
  assert.equal((await api('PUT', '/seller/shop', { token: lan, body: { avatar: 'http://khong-bao-mat.example/a.png' } })).status, 422, 'chỉ https');
  assert.equal((await api('PUT', '/seller/shop', { token: lan, body: { avatar: 'https://images.unsplash.com/photo-1?w=200' } })).body.data.shop.avatar, 'https://images.unsplash.com/photo-1?w=200');
  assert.equal((await api('PUT', '/seller/shop', { token: lan, body: { avatar: null } })).body.data.shop.avatar, '', 'xóa ảnh riêng thì quay về ảnh tài khoản');
});

test('trang gian hàng công khai: ai cũng xem được, người đăng nhập thấy đã theo dõi chưa; theo dõi đổi số ngay', async () => {
  const lanId = (await api('GET', '/auth/profile', { token: tok.lan })).body.data._id;
  const anon = await api('GET', `/shops/${lanId}`);
  assert.equal(anon.status, 200);
  assert.equal(anon.body.data.shop.name, 'Bếp Cô Lan'); assert.equal(anon.body.data.following, false);
  assert.equal(anon.body.data.hours.length, 7);
  assert.ok(!('offs' in anon.body.data), 'không lộ danh sách ngày nghỉ riêng');
  assert.equal(anon.body.data.shop.followers, 0);

  assert.equal((await api('GET', `/shops/${lanId}`, { token: tok.thuy })).body.data.following, false);
  await api('POST', `/shops/${lanId}/follow`, { token: tok.thuy });
  const after = (await api('GET', `/shops/${lanId}`, { token: tok.thuy })).body.data;
  assert.equal(after.following, true); assert.equal(after.shop.followers, 1);
  assert.equal((await api('GET', `/shops/${lanId}`, { token: tok.hoa })).body.data.following, false, 'mỗi người một trạng thái');
  assert.equal((await api('GET', `/shops/${'a'.repeat(24)}`)).status, 404);
  assert.equal((await api('GET', '/shops/abc')).status, 400);
});
