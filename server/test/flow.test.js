// Chạy: npm test (dùng MongoDB trong bộ nhớ, không cần cài MongoDB)
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
const tok = {}; const users = {};

// "token" ở các test là một jar cookie: { c: 'connect.sid=...' } — api() tự cập nhật khi server đặt cookie mới
const newJar = () => ({ c: '' });
async function api(method, path, { body, token, raw, headers } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(raw ? {} : { 'Content-Type': 'application/json' }), ...(token && token.c ? { Cookie: token.c } : {}), ...headers },
    body: raw || (body ? JSON.stringify(body) : undefined),
  });
  const sc = res.headers.get('set-cookie');
  if (token && sc) token.c = sc.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, setCookie: sc };
}
const PW = 'Test@2026';
const login = async (phone) => {
  const jar = newJar();
  const r = await api('POST', '/auth/login', { body: { phone, password: PW }, token: jar });
  return { token: jar, user: r.body.data };
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004'], ['quoc', '0900000005'], ['admin', '0900000099']]) {
    const d = await login(p); tok[k] = d.token; users[k] = d.user;
  }
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('health, 404, 401, id sai', async () => {
  assert.deepEqual((await api('GET', '/health')).body, { ok: true });
  const nf = await api('GET', '/khong-ton-tai');
  assert.equal(nf.status, 404); assert.equal(nf.body.error.code, 'NOT_FOUND');
  assert.equal((await api('GET', '/me/addresses')).status, 401);
  assert.equal((await api('GET', '/posts/abc')).status, 400);
  assert.equal((await api('GET', '/posts/aaaaaaaaaaaaaaaaaaaaaaaa')).status, 404);
});

test('địa chỉ: 1 mặc định, xóa mặc định 409, SĐT sai 422', async () => {
  const t = tok.thuy;
  const a1 = (await api('POST', '/me/addresses', { token: t, body: { name: 'Ngọc Thủy', phone: '0901234567', block: 'B', unit: 'B-1204' } })).body.data;
  assert.equal(a1.isDefault, true);
  const a2 = (await api('POST', '/me/addresses', { token: t, body: { name: 'Mẹ', phone: '0907654321', block: 'A', label: 'family' } })).body.data;
  assert.equal(a2.isDefault, false);
  assert.equal((await api('DELETE', `/me/addresses/${a1._id}`, { token: t })).status, 409);
  await api('PATCH', `/me/addresses/${a2._id}/default`, { token: t });
  const list = (await api('GET', '/me/addresses', { token: t })).body.data;
  assert.equal(list.filter((x) => x.isDefault).length, 1);
  assert.equal((await api('DELETE', `/me/addresses/${a1._id}`, { token: t })).status, 204);
  assert.equal((await api('POST', '/me/addresses', { token: t, body: { name: 'X', phone: '123', block: 'B' } })).status, 422);
  assert.equal((await api('PUT', `/me/addresses/${a2._id}`, { token: tok.lan, body: { name: 'Hack' } })).status, 403);
});

test('đã lưu: idempotent, lọc theo loại', async () => {
  const t = tok.thuy;
  const food = (await api('GET', '/posts?type=food')).body.data[0];
  await api('PUT', `/me/saved/${food._id}`, { token: t });
  await api('PUT', `/me/saved/${food._id}`, { token: t });
  const all = (await api('GET', '/me/saved', { token: t })).body.data;
  assert.equal(all.length, 1);
  assert.equal((await api('GET', '/me/saved?type=job', { token: t })).body.data.length, 0);
  assert.equal((await api('PUT', '/me/saved/aaaaaaaaaaaaaaaaaaaaaaaa', { token: t })).status, 404);
});

test('khám phá: lọc, sắp xếp, phân trang, 422', async () => {
  const r = await api('GET', '/posts?type=food&sort=-price&limit=2');
  assert.equal(r.body.data.length, 2); assert.equal(r.body.meta.total, 3);
  assert.ok(r.body.data[0].price >= r.body.data[1].price);
  assert.equal((await api('GET', '/posts?minPrice=500&maxPrice=100')).status, 422);
  assert.ok((await api('GET', '/posts?q=trà')).body.data.length >= 1);
  const jobs = (await api('GET', '/jobs')).body.data;
  assert.equal(jobs[0].exactAddress, undefined);
  assert.equal(r.body.data[0].seller.avatar, null, 'chưa có ảnh thì avatar là null');
  assert.equal(jobs[0].poster.avatar, null);
});

test('đặt đơn: tính tiền ở server, snapshot, hủy, thông báo', async () => {
  const t = tok.thuy;
  const post = (await api('GET', '/posts?q=Cơm nhà')).body.data[0];
  const addr = (await api('GET', '/me/addresses', { token: t })).body.data[0];
  const bad = await api('POST', '/orders', { token: t, body: { postId: post._id, quantity: 1, fulfillment: 'delivery', payment: 'cash', selections: [] } });
  assert.equal(bad.status, 422); // thiếu món mặn + thiếu địa chỉ
  const ok = await api('POST', '/orders', { token: t, body: {
    postId: post._id, quantity: 2, fulfillment: 'delivery', addressId: addr._id, payment: 'cash', total: 1, voucherCode: 'XU10',
    selections: [{ group: 'Món mặn', choices: ['Sườn rim'] }, { group: 'Thêm', choices: ['Trứng'] }],
  } });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const o = ok.body.data;
  // (35000 + 10000 + 5000) * 2 = 100000, ship 7000, giảm 10000 => 97000 (total=1 từ client bị bỏ qua)
  assert.equal(o.total, 97000);
  assert.match(o.code, /^AG-O\d+$/);
  assert.equal(o.snapshot.title, post.title);
  assert.equal((await api('GET', `/orders/${o._id}`, { token: tok.hoa })).status, 403);
  assert.equal((await api('GET', '/orders?state=active', { token: t })).body.meta.total, 1);
  assert.equal((await api('POST', `/orders/${o._id}/cancel-request`, { token: t, body: { reason: 'Đặt nhầm món' } })).status, 200);
  assert.equal((await api('POST', `/orders/${o._id}/cancel-request`, { token: t, body: { reason: 'Đặt nhầm món' } })).status, 409);
  const bell = (await api('GET', '/notifications/unread-count', { token: tok.lan })).body.data.count;
  assert.ok(bell >= 2);
  await api('POST', '/notifications/read', { token: tok.lan });
  assert.equal((await api('GET', '/notifications/unread-count', { token: tok.lan })).body.data.count, 0);
  // người bán đẩy đơn tới done -> đánh giá
  const o2 = (await api('POST', '/orders', { token: t, body: { postId: post._id, quantity: 1, fulfillment: 'pickup', payment: 'transfer', selections: [{ group: 'Món mặn', choices: ['Gà kho gừng'] }] } })).body.data;
  assert.equal((await api('POST', '/reviews', { token: t, body: { targetType: 'order', targetId: o2._id, rating: 5 } })).status, 409); // chưa xong
  for (let i = 0; i < 4; i++) await api('POST', `/dev/orders/${o2._id}/advance`, { token: tok.lan });
  assert.equal((await api('GET', `/orders/${o2._id}`, { token: t })).body.data.state, 'done');
  assert.equal((await api('POST', '/reviews', { token: t, body: { targetType: 'order', targetId: o2._id, rating: 6 } })).status, 422);
  assert.equal((await api('POST', '/reviews', { token: tok.hoa, body: { targetType: 'order', targetId: o2._id, rating: 5 } })).status, 403);
  assert.equal((await api('POST', '/reviews', { token: t, body: { targetType: 'order', targetId: o2._id, rating: 4, comment: 'Ngon' } })).status, 201);
  assert.equal((await api('POST', '/reviews', { token: t, body: { targetType: 'order', targetId: o2._id, rating: 5 } })).status, 409);
  const rv = (await api('GET', `/reviews?postId=${post._id}`)).body.data;
  assert.equal(rv.count, 1); assert.equal(rv.average, 4);
});

test('nhận việc: máy trạng thái, địa chỉ chính xác, hỏi đáp', async () => {
  const jobs = (await api('GET', '/jobs')).body.data;
  const job = jobs.find((j) => j.title.startsWith('Lấy giúp'));       // do Chị Hoa đăng
  const w = tok.thuy;

  // hỏi đáp
  assert.equal((await api('POST', `/jobs/${job._id}/questions`, { token: w, body: { text: 'Gọi mình 0901 234 567 nhé' } })).status, 422);
  const q = await api('POST', `/jobs/${job._id}/questions`, { token: w, body: { text: 'Cổng sau có bảo vệ không?' } });
  assert.equal(q.status, 201);
  await api('POST', `/dev/questions/${q.body.data._id}/answer`, { token: tok.hoa, body: { text: 'Có nhé' } });
  assert.equal((await api('GET', `/jobs/${job._id}/questions`)).body.data[0].answer.text, 'Có nhé');

  // gửi đề nghị
  assert.equal((await api('POST', `/jobs/${job._id}/offers`, { token: tok.hoa, body: { intro: 'Tự nhận việc mình' } })).status, 403);
  assert.equal((await api('POST', `/jobs/${job._id}/offers`, { token: w, body: { intro: 'ab' } })).status, 422);
  const o = (await api('POST', `/jobs/${job._id}/offers`, { token: w, body: { intro: 'Mình ở cùng block, rảnh sáng mai.' } })).body.data;
  assert.equal(o.state, 'offered');
  assert.equal(o.job.exactAddress, undefined);
  assert.equal((await api('POST', `/jobs/${job._id}/offers`, { token: w, body: { intro: 'Gửi lần hai nè' } })).status, 409);
  assert.equal((await api('GET', `/jobs/${job._id}`, { token: w })).body.data.myOffer.state, 'offered');
  assert.equal((await api('GET', `/jobs/${job._id}`)).body.data.offerCount, 1);

  // chuyển sai trạng thái
  for (const a of ['start', 'confirm-paid']) assert.equal((await api('POST', `/offers/${o._id}/${a}`, { token: w })).status, 409);
  assert.equal((await api('PATCH', `/offers/${o._id}`, { token: w, body: { intro: 'Đã sửa lời giới thiệu' } })).status, 200);
  assert.equal((await api('GET', `/offers/${o._id}`, { token: tok.quoc })).status, 403);

  // được chọn -> thấy địa chỉ
  await api('POST', `/dev/jobs/${job._id}/offers/${o._id}/choose`, { token: tok.hoa });
  const chosen = (await api('GET', `/offers/${o._id}`, { token: w })).body.data;
  assert.equal(chosen.state, 'chosen');
  assert.ok(chosen.job.exactAddress);
  assert.equal((await api('POST', `/jobs/${job._id}/questions`, { token: tok.quoc, body: { text: 'Còn nhận người không?' } })).status, 409);
  assert.equal((await api('POST', `/jobs/${job._id}/offers`, { token: tok.quoc, body: { intro: 'Mình cũng muốn làm' } })).status, 409);

  assert.equal((await api('POST', `/offers/${o._id}/start`, { token: w })).body.data.state, 'working');
  assert.equal((await api('POST', `/offers/${o._id}/report-done`, { token: w, body: { note: '' } })).status, 422);
  assert.equal((await api('POST', `/offers/${o._id}/report-done`, { token: w, body: { note: 'Đã mang cơm lên', images: [] } })).body.data.state, 'reported');
  assert.equal((await api('POST', `/offers/${o._id}/cancel-request`, { token: w, body: { reason: 'busy' } })).status, 409);
  await api('POST', `/dev/offers/${o._id}/confirm-done`, { token: tok.hoa });
  assert.equal((await api('POST', `/offers/${o._id}/confirm-paid`, { token: w })).status, 200);
  assert.equal((await api('POST', `/offers/${o._id}/confirm-paid`, { token: w })).status, 409);
  assert.equal((await api('POST', '/reviews', { token: w, body: { targetType: 'offer', targetId: o._id, rating: 5 } })).status, 201);
  assert.equal((await api('GET', '/offers?state=history', { token: w })).body.meta.total, 1);
});

test('tự hoàn thành sau 24 giờ + rút đề nghị', async () => {
  const Offer = require('../src/modules/buyer/offer/offer.model');
  const job = (await api('GET', '/jobs')).body.data.find((j) => j.title.startsWith('Cho mèo'));
  const o = (await api('POST', `/jobs/${job._id}/offers`, { token: tok.thuy, body: { intro: 'Mình yêu mèo lắm' } })).body.data;
  await api('POST', `/dev/jobs/${job._id}/offers/${o._id}/choose`, { token: tok.hoa });
  await api('POST', `/offers/${o._id}/start`, { token: tok.thuy });
  await api('POST', `/offers/${o._id}/report-done`, { token: tok.thuy, body: { note: 'Xong rồi ạ' } });
  await Offer.updateOne({ _id: o._id }, { $set: { 'history.$[h].at': new Date(Date.now() - 25 * 3600 * 1000) } }, { arrayFilters: [{ 'h.state': 'reported' }] });
  assert.equal((await api('GET', `/offers/${o._id}`, { token: tok.thuy })).body.data.state, 'done');

  const job2 = (await api('GET', '/jobs')).body.data.find((j) => j.title.startsWith('Dọn phòng'));
  const o2 = (await api('POST', `/jobs/${job2._id}/offers`, { token: tok.thuy, body: { intro: 'Mình dọn nhanh gọn' } })).body.data;
  assert.equal((await api('POST', `/offers/${o2._id}/withdraw`, { token: tok.thuy })).body.data.state, 'withdrawn');
  assert.equal((await api('GET', `/jobs/${job2._id}`)).body.data.offerCount, 0);
  // rút xong gửi lại được
  assert.equal((await api('POST', `/jobs/${job2._id}/offers`, { token: tok.thuy, body: { intro: 'Mình dọn nhanh gọn' } })).status, 201);
});

test('hội thoại + báo cáo', async () => {
  const c = await api('POST', '/conversations', { token: tok.thuy, body: { withUser: users.lan._id } });
  assert.equal(c.status, 201);
  assert.equal((await api('POST', '/conversations', { token: tok.thuy, body: { withUser: users.lan._id } })).status, 200);
  assert.equal((await api('POST', '/conversations', { token: tok.thuy, body: { withUser: users.thuy._id } })).status, 409);
  const id = c.body.data._id;
  assert.equal((await api('POST', `/conversations/${id}/messages`, { token: tok.thuy, body: { text: '  ' } })).status, 422);
  await api('POST', `/conversations/${id}/messages`, { token: tok.thuy, body: { text: 'Chào cô ạ' } });
  assert.equal((await api('POST', `/conversations/${id}/messages`, { token: tok.quoc, body: { text: 'chen ngang' } })).status, 403);
  assert.equal((await api('GET', '/conversations', { token: tok.lan })).body.data[0].unread, 1);
  await api('POST', `/conversations/${id}/read`, { token: tok.lan });
  assert.equal((await api('GET', '/conversations', { token: tok.lan })).body.data[0].unread, 0);

  const order = (await api('GET', '/orders', { token: tok.thuy })).body.data[0];
  const rp = await api('POST', '/reports', { token: tok.thuy, body: { targetType: 'order', targetId: order._id, reason: 'quality', detail: 'Món bị nguội khi tới nơi' } });
  assert.equal(rp.status, 201); assert.equal(rp.body.data.state, 'open');
  assert.equal((await api('POST', '/reports', { token: tok.quoc, body: { targetType: 'order', targetId: order._id, reason: 'quality', detail: 'Báo cáo đơn của người khác' } })).status, 403);
  assert.equal((await api('POST', '/reports', { token: tok.thuy, body: { targetType: 'order', targetId: order._id, reason: 'quality', detail: 'ngắn' } })).status, 422);
  assert.equal((await api('GET', '/reports?mine=true', { token: tok.quoc })).body.data.length, 0);
});
