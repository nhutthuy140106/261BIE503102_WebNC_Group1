process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
process.env.ASSISTANT_MODE = 'local';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Post = require('../src/modules/shared/post.model');

let mongod; let server; let base; let cookie; let pho;
async function api(method, path, data, withCookie = true) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(withCookie && cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const BANK = { bankName: 'MBBank', no: '0123456789', holder: 'BEP CO LAN (MAU)' };
const order = (payment) => api('POST', '/orders', { postId: String(pho._id), quantity: 1, fulfillment: 'pickup', payment, selections: [] });

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '0900000001', password: 'Test@2026' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
  pho = await Post.findOne({ title: /Phở bò/ });
  await Post.updateOne({ _id: pho._id }, { bank: BANK, payMethods: ['cash', 'transfer'] });
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('tài khoản nhận tiền không lộ ở API bài công khai (danh sách, chi tiết, kể cả khi không đăng nhập)', async () => {
  const list = (await api('GET', '/posts?limit=100', null, false)).body.data;
  assert.ok(list.length > 0);
  assert.ok(list.every((p) => !('bank' in p)), 'danh sách không được có bank');
  const one = (await api('GET', `/posts/${pho._id}`, null, false)).body.data;
  assert.equal(one._id, String(pho._id));
  assert.ok(!('bank' in one), 'chi tiết không được có bank');
});

test('đơn chuyển khoản chụp tài khoản người bán vào đơn; đơn tiền mặt thì không', async () => {
  const t = await order('transfer');
  assert.equal(t.status, 201, JSON.stringify(t.body));
  assert.deepEqual(t.body.data.snapshot.bank, BANK);
  const c = await order('cash');
  assert.equal(c.status, 201, JSON.stringify(c.body));
  assert.equal(c.body.data.snapshot.bank, undefined);
});

test('người mua xem lại đơn của mình vẫn thấy tài khoản; đổi tài khoản của bài sau đó không làm đổi đơn đã đặt', async () => {
  const t = (await order('transfer')).body.data;
  await Post.updateOne({ _id: pho._id }, { bank: { ...BANK, no: '9999999999' } });
  const got = (await api('GET', `/orders/${t._id}`)).body.data;
  assert.equal(got.snapshot.bank.no, '0123456789');
  assert.equal(got.snapshot.bank.holder, BANK.holder);
});
