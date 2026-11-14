// Gian hàng người bán: số liệu Hiệu quả tính từ dữ liệu thật, hồ sơ, giờ nhận đơn, đánh giá, lượt xem, theo dõi.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { buildStats, up } = require('../src/modules/seller/stats');

let mongod; let server; let base;
const tok = {};
async function api(method, path, { body, token } = {}) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && token.c ? { Cookie: token.c } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = res.headers.get('set-cookie');
  if (token && sc) token.c = sc.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const login = async (phone) => { const jar = { c: '' }; await api('POST', '/auth/login', { body: { phone, password: 'Test@2026' }, token: jar }); return jar; };

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004'], ['quoc', '0900000005']]) tok[k] = await login(p);
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

/* ------------------------------------------------------------------ thuần: buildStats */
const NOW = new Date(2026, 10, 14, 15, 0, 0); // 14/11/2026 15:00 (thứ Bảy)
const at = (d, h = 12) => new Date(2026, 10, d, h, 0, 0);
const order = (day, hour, total, type = 'food', state = 'done') => ({ state, total, snapshot: { type }, createdAt: at(day, hour), updatedAt: at(day, hour), history: [{ state: 'done', at: at(day, hour) }] });

test('buildStats: hôm nay — thu nhập, số đơn, biểu đồ theo giờ, so với hôm qua', () => {
  const s = buildStats({ orders: [order(14, 9, 50000), order(14, 11, 70000, 'service'), order(13, 10, 60000), order(14, 12, 99000, 'food', 'waiting')] }, NOW).today;
  assert.equal(s.income, 120000);
  assert.equal(s.done, 2);
  assert.equal(s.incomeUp, '+100%', 'hôm qua 60.000, hôm nay 120.000');
  assert.equal(s.unit, 'giờ');
  assert.equal(s.y[s.x.indexOf('9h')], 50000);
  assert.equal(s.y[s.x.indexOf('11h')], 70000);
  assert.deepEqual(s.mix, [50000, 0, 70000], 'đơn chờ xác nhận không tính');
});

test('buildStats: đơn xong ngoài 7–21 giờ thì biểu đồ ngày kéo rộng, tổng cột vẫn bằng thu nhập', () => {
  const s = buildStats({ orders: [order(14, 9, 50000), order(14, 5, 30000), order(14, 23, 20000)] }, NOW).today;
  assert.equal(s.income, 100000);
  assert.equal(s.y.reduce((a, b) => a + b, 0), 100000);
  assert.equal(s.x[0], '5h'); assert.equal(s.x.at(-1), '23h');
});

test('buildStats: 7 ngày — 7 cột, nhãn thứ, đơn ngoài khoảng không tính', () => {
  const s = buildStats({ orders: [order(14, 9, 10000), order(8, 9, 20000), order(7, 9, 40000), order(1, 9, 99999)] }, NOW)['7'];
  assert.equal(s.x.length, 7);
  assert.deepEqual(s.x, ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'], 'từ 8/11 (CN) đến 14/11 (T7)');
  assert.equal(s.income, 30000, '14/11 và 8/11 nằm trong 7 ngày, 7/11 và 1/11 thì không');
  assert.equal(s.y.reduce((a, b) => a + b, 0), s.income, 'tổng các cột = thu nhập');
  assert.equal(s.incomeUp, '−79%', 'kỳ trước (1–7/11) có 40.000 + 99.999 = 139.999, nay 30.000');
});

test('buildStats: 30, 90 ngày và năm — tổng các cột luôn bằng thu nhập', () => {
  const orders = [order(14, 9, 10000), order(10, 9, 20000), order(2, 9, 30000), { ...order(1, 9, 5000), createdAt: new Date(2026, 8, 5), updatedAt: new Date(2026, 8, 5), history: [{ state: 'done', at: new Date(2026, 8, 5) }] }];
  const out = buildStats({ orders }, NOW);
  for (const k of ['30', '90', 'year']) assert.equal(out[k].y.reduce((a, b) => a + b, 0), out[k].income, k);
  assert.equal(out['30'].income, 60000);
  assert.equal(out['30'].x.length, 5);
  assert.equal(out['30'].x.at(-1), 'Tuần này');
  assert.equal(out['90'].income, 65000, '5/9 còn trong 90 ngày');
  assert.deepEqual(out['90'].x, ['Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11'], '90 ngày bắt đầu từ 17/8');
  assert.equal(out.year.x.length, 11, 'T1 … T11');
});

test('buildStats: đánh giá, lượt xem, lượt lưu, việc đã thuê, tỉ lệ đặt', () => {
  const s = buildStats({
    orders: [order(14, 9, 10000), order(13, 9, 10000)],
    reviews: [{ rating: 5, createdAt: at(14) }, { rating: 4, createdAt: at(13) }, { rating: 1, createdAt: at(1) }],
    views: [{ date: '2026-11-14', count: 30 }, { date: '2026-11-13', count: 10 }, { date: '2026-11-01', count: 500 }],
    saves: [at(14), at(12), at(2)], hires: [{ pay: 80000, at: at(13) }, { pay: 50000, at: at(3) }],
  }, NOW)['7'];
  assert.equal(s.rating, '4,5'); assert.equal(s.ratingCount, 2, 'đánh giá 1 sao ngày 1/11 nằm ngoài 7 ngày');
  assert.equal(s.views, 40);
  assert.equal(s.saves, 2);
  assert.equal(s.paid, 80000); assert.equal(s.hired, 1);
});

test('buildStats: chưa có gì thì ra số 0 chứ không lỗi; kỳ trước = 0 mà có thì +100%', () => {
  const s = buildStats({}, NOW);
  assert.equal(s['7'].income, 0); assert.equal(s['7'].rating, '—'); assert.equal(s['7'].incomeUp, '0%');
  assert.equal(up(5, 0), '+100%'); assert.equal(up(0, 0), '0%'); assert.equal(up(150, 100), '+50%'); assert.equal(up(50, 100), '−50%');
});

/* ------------------------------------------------------------------ API */
const approve = async () => {
  const User = mongoose.model('User');
  const V = require('../src/modules/seller/verification.model');
  for (const phone of ['0900000002', '0900000004']) {
    const u = await User.findOne({ phone });
    await V.updateOne({ user: u._id }, { $setOnInsert: { user: u._id, status: 'approved', body: { fullName: u.name, idNumber: '012345678901', idFront: 'a', idBack: 'b', selfie: 'c', shopName: u.name, shopType: 'food' } } }, { upsert: true });
  }
};

test('hồ sơ gian hàng: có sẵn bản mặc định, sửa được, sai dữ liệu bị từ chối, người khác không thấy của mình', async () => {
  const t = tok.lan;
  assert.equal((await api('GET', '/seller/shop')).status, 401);
  const first = (await api('GET', '/seller/shop', { token: t })).body.data;
  assert.equal(first.shop.name, 'Bếp Cô Lan');
  assert.equal(first.hours.length, 7);
  assert.equal(first.pause, null);
  assert.equal(first.shop.reviewCount, 0);

  const upd = await api('PUT', '/seller/shop', { token: t, body: { name: 'Bếp Cô Lan - nhà làm', kind: 'Bếp nhà làm', bio: 'Nấu cơm nhà mỗi ngày', address: 'Block B, tầng 5', replyTime: 'Thường trả lời trong 10 phút' } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.shop.name, 'Bếp Cô Lan - nhà làm');
  assert.equal(upd.body.data.shop.kind, 'Bếp nhà làm');
  assert.equal((await api('PUT', '/seller/shop', { token: t, body: { name: 'a' } })).status, 422);
  assert.equal((await api('GET', '/seller/shop', { token: tok.hoa })).body.data.shop.name, 'Chị Hoa', 'mỗi người một gian hàng');
});

test('giờ nhận đơn, ngày nghỉ, tạm ngưng', async () => {
  const t = tok.lan;
  const hours = Array.from({ length: 7 }, (_, i) => ({ on: i !== 6, from: '09:00', to: '13:00' }));
  const h = (await api('PUT', '/seller/shop/hours', { token: t, body: { hours } })).body.data.hours;
  assert.equal(h[6].on, false); assert.equal(h[0].from, '09:00');
  assert.equal((await api('PUT', '/seller/shop/hours', { token: t, body: { hours: hours.slice(0, 6) } })).status, 422, 'phải đủ 7 ngày');
  assert.equal((await api('PUT', '/seller/shop/hours', { token: t, body: { hours: hours.map((x) => ({ ...x, from: '25:00' })) } })).status, 422, 'giờ sai');

  const off = (await api('PUT', '/seller/shop/offs', { token: t, body: { date: '2026-11-20', note: 'Đi chợ xa' } })).body.data.offs;
  assert.deepEqual(off, [{ date: '2026-11-20', note: 'Đi chợ xa' }]);
  await api('PUT', '/seller/shop/offs', { token: t, body: { date: '2026-11-18', note: '' } });
  assert.deepEqual((await api('GET', '/seller/shop', { token: t })).body.data.offs.map((o) => o.date), ['2026-11-18', '2026-11-20'], 'xếp theo ngày');
  assert.deepEqual((await api('DELETE', '/seller/shop/offs/2026-11-18', { token: t })).body.data.offs.map((o) => o.date), ['2026-11-20']);
  assert.equal((await api('PUT', '/seller/shop/offs', { token: t, body: { date: '20/11', note: '' } })).status, 422);

  assert.deepEqual((await api('PUT', '/seller/shop/pause', { token: t, body: { until: '2026-11-25' } })).body.data.pause, { until: '2026-11-25' });
  assert.equal((await api('DELETE', '/seller/shop/pause', { token: t })).body.data.pause, null);
});

test('đơn → đánh giá → số liệu thật: shop, thống kê, bài (đã bán, lượt xem, lượt lưu) và phản hồi đánh giá', async () => {
  await approve();
  const lan = tok.lan; const thuy = tok.thuy;
  const posts = (await api('GET', '/posts?limit=100')).body.data;
  const post = posts.find((p) => p.title.startsWith('Phở bò tái'));
  const viewsBefore = (await api('GET', '/seller/posts', { token: lan })).body.data.find((p) => p._id === post._id).views;

  // người mua mở bài (tính 1 lượt xem), lưu bài, đặt 2 phần; người bán làm tới hoàn thành; người mua đánh giá 5 sao
  await api('GET', `/posts/${post._id}`, { token: thuy });
  await api('GET', `/posts/${post._id}`, { token: lan }); // chủ bài tự xem: không tính
  await api('PUT', `/me/saved/${post._id}`, { token: thuy });
  const addr = (await api('POST', '/me/addresses', { token: thuy, body: { name: 'Thủy', phone: '0901234567', block: 'B', unit: 'B-1' } })).body.data;
  const o = (await api('POST', '/orders', { token: thuy, body: { postId: post._id, quantity: 2, fulfillment: 'delivery', addressId: addr._id, payment: 'cash' } })).body.data;
  for (const a of ['confirm', 'prepare', 'deliver', 'complete']) await api('POST', `/seller/orders/${o._id}/${a}`, { token: lan });
  const rv = await api('POST', '/reviews', { token: thuy, body: { targetType: 'order', targetId: o._id, rating: 5, comment: 'Phở ngon' } });
  assert.equal(rv.status, 201, JSON.stringify(rv.body));

  const mine = (await api('GET', '/seller/posts', { token: lan })).body.data.find((p) => p._id === post._id);
  assert.equal(mine.views, viewsBefore + 1, 'chủ bài tự xem không tính, người khác xem tính 1');
  assert.equal(mine.sold, 2, 'đã bán = tổng số lượng các đơn đã hoàn thành');
  assert.equal(mine.saves, 1);

  const shop = (await api('GET', '/seller/shop', { token: lan })).body.data.shop;
  assert.equal(shop.reviewCount, 1); assert.equal(shop.rating, '5,0'); assert.equal(shop.doneCount, 1);

  const st = (await api('GET', '/seller/stats', { token: lan })).body.data;
  assert.deepEqual(Object.keys(st).sort(), ['30', '7', '90', 'today', 'year']);
  assert.equal(st.today.done, 1); assert.equal(st.today.income, o.total);
  assert.equal(st['7'].rating, '5,0'); assert.equal(st['7'].ratingCount, 1);
  assert.ok(st['7'].views >= 1); assert.equal(st['7'].saves, 1);
  assert.equal(st.year.y.reduce((a, b) => a + b, 0), st.year.income);
  assert.equal((await api('GET', '/seller/stats', { token: tok.hoa })).body.data.today.done, 0, 'số liệu của người khác không lẫn vào');

  const reviews = (await api('GET', '/seller/reviews', { token: lan })).body.data;
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].reviewer.name, 'Ngọc Thủy'); assert.match(reviews[0].post.title, /Phở bò tái/);
  const id = reviews[0]._id;
  assert.equal((await api('POST', `/seller/reviews/${id}/reply`, { token: tok.hoa, body: { text: 'Cảm ơn bạn nhé' } })).status, 403);
  assert.equal((await api('POST', `/seller/reviews/${id}/reply`, { token: lan, body: { text: 'x' } })).status, 422);
  assert.equal((await api('POST', `/seller/reviews/${id}/reply`, { token: lan, body: { text: 'Cảm ơn bạn nhé' } })).body.data.reply.text, 'Cảm ơn bạn nhé');
  assert.equal((await api('POST', `/seller/reviews/${id}/reply`, { token: lan, body: { text: 'Lần nữa' } })).status, 409, 'phản hồi một lần');
  assert.equal((await api('GET', `/reviews?postId=${post._id}`)).body.data.items[0].reply.text, 'Cảm ơn bạn nhé', 'khách thấy phản hồi ở trang bài');
});

test('theo dõi gian hàng: theo dõi, bỏ theo dõi, đếm người theo dõi; không tự theo dõi mình', async () => {
  const lanId = (await api('GET', '/auth/profile', { token: tok.lan })).body.data._id;
  assert.equal((await api('POST', `/shops/${lanId}/follow`)).status, 401);
  assert.equal((await api('POST', `/shops/${lanId}/follow`, { token: tok.lan })).status, 409);
  assert.deepEqual((await api('POST', `/shops/${lanId}/follow`, { token: tok.thuy })).body.data, { following: true, followers: 1 });
  assert.equal((await api('POST', `/shops/${lanId}/follow`, { token: tok.thuy })).body.data.followers, 1, 'theo dõi lại không đếm đôi');
  await api('POST', `/shops/${lanId}/follow`, { token: tok.hoa });
  assert.equal((await api('GET', '/seller/shop', { token: tok.lan })).body.data.shop.followers, 2);
  assert.deepEqual((await api('DELETE', `/shops/${lanId}/follow`, { token: tok.thuy })).body.data, { following: false, followers: 1 });
  assert.equal((await api('POST', `/shops/${'a'.repeat(24)}/follow`, { token: tok.thuy })).status, 404);
});
