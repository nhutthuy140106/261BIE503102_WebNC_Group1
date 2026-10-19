// Kiểm tra bộ dữ liệu mẫu ĐẦY ĐỦ (npm run seed): đủ loại dữ liệu, chạy lại không nhân đôi, không đụng người dùng thật,
// và dùng được qua API thật.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seed = require('../src/seeds/seed');

let mongod; let server; let base;
const M = (n) => mongoose.model(n);

async function api(method, path, jar, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(jar && jar.c ? { Cookie: jar.c } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (jar && sc) jar.c = sc.split(';')[0];
  const t = await res.text();
  return { status: res.status, body: t ? JSON.parse(t) : null };
}
const login = async (phone) => {
  const jar = { c: '' };
  await api('POST', '/auth/login', jar, { phone, password: 'Test@2026' });
  return jar;
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const MODELS = ['User', 'Post', 'Job', 'Order', 'Offer', 'Review', 'Question', 'Conversation', 'Message', 'Notification', 'Report', 'Address', 'Saved', 'AuditLog'];
const snapshot = async () => Object.fromEntries(await Promise.all(MODELS.map(async (n) => [n, await M(n).countDocuments()])));

test('seed đầy đủ: đủ vai trò, nhiều bài/việc, có dữ liệu giao dịch', async () => {
  const r = await seed();
  assert.ok(r.posts >= 20 && r.jobs >= 10 && r.users >= 15);
  const User = M('User');
  assert.equal(await User.countDocuments({ role: 'admin' }), 1);
  assert.ok((await User.countDocuments({ role: 'enduser' })) >= 10);
  assert.equal(await User.countDocuments({ status: 'locked' }), 1);
  const Post = M('Post');
  for (const t of ['food', 'goods', 'service']) assert.ok((await Post.countDocuments({ type: t, status: 'open' })) >= 5, `thiếu bài ${t}`);
  assert.equal(await Post.countDocuments({ status: 'hidden' }), 1);
  const Order = M('Order');
  for (const s of ['waiting', 'confirmed', 'delivering', 'done', 'cancelled']) assert.ok(await Order.countDocuments({ state: s }), `thiếu đơn ${s}`);
  const Offer = M('Offer');
  for (const s of ['offered', 'working', 'reported', 'done', 'rejected', 'withdrawn']) assert.ok(await Offer.countDocuments({ state: s }), `thiếu đề nghị ${s}`);
  for (const s of ['open', 'reviewing', 'resolved']) assert.ok(await M('Report').countDocuments({ state: s }), `thiếu báo cáo ${s}`);
});

test('seed chạy lại: không nhân đôi, không đụng người dùng thật, mã đơn không trùng', async () => {
  const real = await M('User').create({ name: 'Người thật', phone: '0988888888', password: 'x'.repeat(20) });
  const realOrder = await M('Order').create({
    code: 'AG-O9999', buyer: real._id, seller: real._id, post: new mongoose.Types.ObjectId(),
    quantity: 1, fulfillment: 'pickup', payment: 'cash', total: 1, snapshot: { title: 'x' },
  });
  const a = await snapshot();
  await seed();
  const b = await snapshot();
  assert.deepEqual(b, a, 'chạy lại không đổi số lượng bản ghi nào');
  assert.ok(await M('User').exists({ _id: real._id }), 'người dùng thật còn nguyên');
  assert.ok(await M('Order').exists({ _id: realOrder._id }), 'đơn của người dùng thật còn nguyên');
  const codes = (await M('Order').find().select('code').lean()).map((o) => o.code);
  assert.equal(new Set(codes).size, codes.length, 'mã đơn không trùng');
  await M('Order').deleteOne({ _id: realOrder._id });
  await M('User').deleteOne({ _id: real._id });
  await seed();
});

test('seed dùng được qua API: Thủy thấy đơn, việc, đánh giá; bài có điểm; thống kê admin khớp', async () => {
  const jar = await login('0900000001');
  assert.ok((await api('GET', '/orders?state=active', jar)).body.meta.total >= 4);
  assert.ok((await api('GET', '/orders?state=history', jar)).body.meta.total >= 3);
  const offers = (await api('GET', '/offers?state=active', jar)).body.data;
  assert.ok(offers.some((o) => o.state === 'offered') && offers.some((o) => o.state === 'working'));
  assert.ok(offers.find((o) => o.state === 'working').job.exactAddress, 'đã được chọn thì thấy địa chỉ chính xác');
  assert.equal(offers.find((o) => o.state === 'offered').job.exactAddress, undefined);
  assert.ok((await api('GET', '/notifications/unread-count', jar)).body.data.count >= 2);
  const conv = (await api('GET', '/conversations', jar)).body.data;
  assert.equal(conv.length, 2);
  assert.equal(conv.filter((c) => c.unread).length, 1);
  assert.equal(conv.find((c) => c.unread).unread, 1);
  assert.ok((await api('GET', '/me/saved', jar)).body.data.length >= 5);
  assert.equal((await api('GET', '/me/addresses', jar)).body.data.length, 2);
  assert.ok((await api('GET', '/me/recommendations', jar)).body.data.length > 0);

  const com = (await api('GET', '/posts?q=com nha')).body.data[0];
  const rv = (await api('GET', `/reviews?postId=${com._id}`)).body.data;
  assert.ok(rv.count >= 3 && rv.average >= 4 && rv.items.some((i) => i.reply));
  assert.equal((await api('GET', '/posts?limit=100')).body.data.length, 24); // 25 bài, trừ bài đã bị ẩn
  const jobs = (await api('GET', '/jobs?limit=100')).body.data;
  assert.ok(jobs.every((j) => j.exactAddress === undefined));
  assert.equal(jobs.find((j) => j.title.startsWith('Lấy giúp')).offerCount, 2, 'thẻ việc đếm đúng số đề nghị đang chờ');

  const admin = await login('0900000099');
  const stats = (await api('GET', '/admin/stats', admin)).body.data;
  assert.equal(stats.posts.hidden, 1);
  assert.equal(stats.users.locked, 1);
  assert.equal(stats.reports.pending, 2);
  assert.equal((await api('GET', '/admin/reports?state=open', admin)).body.meta.total, 1);
  assert.equal((await api('POST', '/auth/login', { c: '' }, { phone: '0900000030', password: 'Test@2026' })).status, 403);
});

test('đơn mẫu có tiền đúng; phụ thu và đánh giá hoạt động trên dữ liệu seed', async () => {
  const jar = await login('0900000001');
  const list = (await api('GET', '/orders?limit=50', jar)).body.data;
  const wait = list.find((o) => o.state === 'waiting' && o.snapshot.title.startsWith('Cơm'));
  assert.equal(wait.total, 35000 + 10000 + 5000 + 7000); // cơm + sườn + trứng + phí giao
  const tra = list.find((o) => o.snapshot.title.startsWith('Trà sữa'));
  assert.equal(tra.total, 30000 + 6000 + 5000 + 5000 - 10000); // size L + trân châu + phí giao - voucher
  const sur = list.find((o) => o.surcharge && o.surcharge.status === 'pending');
  const ok = await api('POST', `/orders/${sur._id}/approve-surcharge`, jar);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.total, sur.total + 15000);
  const pho = list.find((o) => o.state === 'done' && o.snapshot.title.startsWith('Phở'));
  assert.equal(pho.reviewed, false);
  assert.equal((await api('POST', '/reviews', jar, { targetType: 'order', targetId: pho._id, rating: 4, comment: 'Ngon' })).status, 201);
  assert.equal((await api('POST', `/orders/${pho._id}/return-request`, jar, { reason: 'Muốn trả hàng' })).status, 409); // đồ ăn không trả hàng
});

test('avatar: mọi tài khoản mẫu có ảnh; các API trả người kèm avatar (URL hoặc null)', async () => {
  const URL = /^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?.*crop=faces/;
  const users = await M('User').find().lean();
  assert.equal(users.length, 18);
  assert.ok(users.every((u) => URL.test(u.avatar)), 'tài khoản mẫu nào cũng có avatar');
  assert.equal(new Set(users.map((u) => u.avatar)).size, users.length, 'không trùng ảnh');

  const jar = await login('0900000001');
  assert.match((await api('GET', '/auth/profile', jar)).body.data.avatar, URL);
  const posts = (await api('GET', '/posts?limit=100')).body.data;
  assert.ok(posts.every((p) => URL.test(p.seller.avatar)));
  assert.match((await api('GET', `/posts/${posts[0]._id}`)).body.data.seller.avatar, URL);
  const jobs = (await api('GET', '/jobs?limit=100')).body.data;
  assert.ok(jobs.every((j) => URL.test(j.poster.avatar)));
  assert.match((await api('GET', `/jobs/${jobs[0]._id}`)).body.data.poster.avatar, URL);
  const orders = (await api('GET', '/orders?limit=50', jar)).body.data;
  assert.ok(orders.every((o) => URL.test(o.snapshot.sellerAvatar)));
  assert.ok((await api('GET', '/conversations', jar)).body.data.every((c) => URL.test(c.with.avatar)));
  assert.ok((await api('GET', '/offers?limit=50', jar)).body.data.every((o) => URL.test(o.job.poster.avatar)));
  const rv = (await api('GET', `/reviews?postId=${posts.find((p) => p.title.startsWith('Cơm'))._id}`)).body.data;
  assert.ok(rv.items.every((i) => URL.test(i.reviewer.avatar)));
  const qs = (await api('GET', `/jobs/${jobs.find((j) => j.title.startsWith('Lấy giúp'))._id}/questions`)).body.data;
  assert.ok(qs.length && qs.every((q) => URL.test(q.author.avatar)));
  assert.ok((await api('GET', `/posts/${posts[0]._id}/similar`)).body.data.every((p) => URL.test(p.seller.avatar)));

  // chưa có ảnh => null (không phải chuỗi rỗng), ở cả hồ sơ lẫn khi được nhúng trong bài
  const bare = await M('User').create({ name: 'Chưa có ảnh', phone: '0977777777', password: 'x'.repeat(20) });
  const post = await M('Post').create({ type: 'goods', title: 'Bàn học cũ', price: 1000, seller: bare._id, area: 'B' });
  assert.equal((await api('GET', `/posts/${post._id}`)).body.data.seller.avatar, null);
  await M('User').collection.updateOne({ _id: bare._id }, { $set: { avatar: '' } });
  assert.equal((await api('GET', `/posts/${post._id}`)).body.data.seller.avatar, null, 'chuỗi rỗng cũ cũng thành null');
  await M('Post').deleteOne({ _id: post._id });
  await M('User').deleteOne({ _id: bare._id });
});
