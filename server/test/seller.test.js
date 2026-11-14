// API phía Bán & Đăng việc (/api/seller): bài của tôi, việc của tôi, xử lý đơn khách đặt, chọn người nhận việc.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
const tok = {};

async function api(method, path, { body, token } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && token.c ? { Cookie: token.c } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (token && sc) token.c = sc.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const login = async (phone) => {
  const jar = { c: '' };
  await api('POST', '/auth/login', { body: { phone, password: 'Test@2026' }, token: jar });
  return jar;
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  for (const [k, p] of [['thuy', '0900000001'], ['lan', '0900000002'], ['hoa', '0900000004'], ['quoc', '0900000005']]) tok[k] = await login(p);
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const newPost = (extra = {}) => ({
  type: 'food', category: 'Đồ ăn', title: 'Bánh mì trứng nhà làm', description: 'Bánh mì nướng giòn, trứng ốp la, đồ ăn sáng.', price: 20000, unit: 'cái', area: 'B',
  fulfillmentModes: ['pickup'], payMethods: ['cash'], areas: ['Bcons'], priceType: 'fixed', ...extra,
});

test('cần đăng nhập mới vào được khu Bán', async () => {
  assert.equal((await api('GET', '/seller/posts')).status, 401);
  assert.equal((await api('GET', '/seller/orders')).status, 401);
  assert.equal((await api('GET', '/seller/offers')).status, 401);
});

test('bài của tôi: đăng, sửa, đóng/mở, đổi giá, xóa; không đụng được bài người khác', async () => {
  const t = tok.lan;
  const created = await api('POST', '/seller/posts', { token: t, body: newPost({ promoted: true, hiddenReason: 'x', seller: '000000000000000000000000' }) });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const p = created.body.data;
  assert.equal(p.promoted, false, 'không tự bật quảng bá');
  assert.equal(p.hiddenReason, '', 'không tự đặt lý do gỡ');
  assert.equal(p.status, 'open');

  const mine = (await api('GET', '/seller/posts', { token: t })).body.data;
  assert.ok(mine.some((x) => x._id === p._id));
  assert.ok(mine.every((x) => x.title), 'chỉ thấy bài của mình');
  assert.ok(!(await api('GET', '/seller/posts', { token: tok.thuy })).body.data.some((x) => x._id === p._id), 'người khác không thấy bài này');

  assert.equal((await api('PUT', `/seller/posts/${p._id}`, { token: t, body: newPost({ title: 'Bánh mì trứng sốt me', price: 22000 }) })).body.data.price, 22000);
  assert.equal((await api('PUT', `/seller/posts/${p._id}`, { token: tok.hoa, body: newPost() })).status, 404, 'người khác không sửa được');

  assert.equal((await api('PATCH', `/seller/posts/${p._id}`, { token: t, body: { closed: true } })).body.data.status, 'closed');
  assert.ok(!(await api('GET', '/posts?limit=100')).body.data.some((x) => x._id === p._id), 'bài đóng không hiện ở phía Mua');
  assert.equal((await api('PATCH', `/seller/posts/${p._id}`, { token: t, body: { closed: false, price: 25000 } })).body.data.status, 'open');
  assert.equal((await api('PATCH', `/seller/posts/${p._id}`, { token: t, body: {} })).status, 422);
  assert.equal((await api('PATCH', `/seller/posts/${p._id}`, { token: t, body: { stockLeft: 3 } })).status, 409, 'bài không giới hạn số lượng');

  assert.equal((await api('POST', '/seller/posts', { token: t, body: newPost({ status: 'hidden' }) })).status, 422, 'không tự đặt hidden');
  assert.equal((await api('POST', '/seller/posts', { token: t, body: newPost({ price: -5 }) })).status, 422);
  assert.equal((await api('DELETE', `/seller/posts/${p._id}`, { token: tok.hoa })).status, 404);
  assert.equal((await api('DELETE', `/seller/posts/${p._id}`, { token: t })).status, 204);
});

test('bài giới hạn số lượng: sửa số còn lại, về 0 thì hết hàng', async () => {
  const t = tok.lan;
  const p = (await api('POST', '/seller/posts', { token: t, body: newPost({ title: 'Bánh flan hộp', stock: { mode: 'limit', left: 5 } }) })).body.data;
  const r0 = (await api('PATCH', `/seller/posts/${p._id}`, { token: t, body: { stockLeft: 0 } })).body.data;
  assert.equal(r0.status, 'soldout');
  const r1 = (await api('PATCH', `/seller/posts/${p._id}`, { token: t, body: { stockLeft: 4 } })).body.data;
  assert.equal(r1.status, 'open'); assert.equal(r1.stock.left, 4);
});

test('đơn khách đặt: xác nhận → chuẩn bị → giao → hoàn thành; sai bước 409; người khác 403', async () => {
  const posts = (await api('GET', '/posts?limit=100')).body.data;
  const food = posts.find((p) => p.title.startsWith('Phở bò tái'));      // của Bếp Cô Lan, giao + tự lấy
  const addr = (await api('POST', '/me/addresses', { token: tok.thuy, body: { name: 'Ngọc Thủy', phone: '0901234567', block: 'B', unit: 'B-1204' } })).body.data;
  const placed = await api('POST', '/orders', { token: tok.thuy, body: { postId: food._id, quantity: 1, fulfillment: 'delivery', addressId: addr._id, payment: 'cash' } });
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const id = placed.body.data._id;

  const incoming = (await api('GET', '/seller/orders', { token: tok.lan })).body.data;
  const mine = incoming.find((o) => o._id === id);
  assert.ok(mine, 'người bán thấy đơn mới');
  assert.equal(mine.buyer.name, 'Ngọc Thủy', 'kèm thông tin người mua');
  assert.ok(!(await api('GET', '/seller/orders', { token: tok.hoa })).body.data.some((o) => o._id === id), 'người bán khác không thấy');

  assert.equal((await api('POST', `/seller/orders/${id}/confirm`, { token: tok.hoa })).status, 403);
  assert.equal((await api('POST', `/seller/orders/${id}/complete`, { token: tok.lan })).status, 409, 'chưa tới bước hoàn thành');
  assert.equal((await api('POST', `/seller/orders/${id}/confirm`, { token: tok.lan })).body.data.state, 'confirmed');
  assert.equal((await api('POST', `/seller/orders/${id}/prepare`, { token: tok.lan })).body.data.state, 'preparing');
  assert.equal((await api('POST', `/seller/orders/${id}/deliver`, { token: tok.lan })).body.data.state, 'delivering', 'đơn giao tận nơi → đang giao');
  const done = (await api('POST', `/seller/orders/${id}/complete`, { token: tok.lan })).body.data;
  assert.equal(done.state, 'done');
  assert.deepEqual(done.history.map((h) => h.state), ['waiting', 'confirmed', 'preparing', 'delivering', 'done']);
  assert.equal((await api('GET', `/orders/${id}`, { token: tok.thuy })).body.data.state, 'done', 'người mua thấy đơn đã xong');
  assert.equal((await api('POST', `/seller/orders/${id}/khong-co`, { token: tok.lan })).status, 400);
});

test('đơn tự lấy: giao xong là "sẵn sàng"; từ chối đơn trả lại số lượng', async () => {
  const lan = tok.lan;
  const p = (await api('POST', '/seller/posts', { token: lan, body: newPost({ title: 'Xôi lá chuối', stock: { mode: 'limit', left: 2 } }) })).body.data;
  const o1 = (await api('POST', '/orders', { token: tok.thuy, body: { postId: p._id, quantity: 2, fulfillment: 'pickup', payment: 'cash' } })).body.data;
  const after1 = (await api('GET', '/seller/posts', { token: lan })).body.data.find((x) => x._id === p._id);
  assert.equal(after1.stock.left, 0); assert.equal(after1.status, 'soldout');

  const declined = (await api('POST', `/seller/orders/${o1._id}/decline`, { token: lan })).body.data;
  assert.equal(declined.state, 'declined');
  const back = (await api('GET', '/seller/posts', { token: lan })).body.data.find((x) => x._id === p._id);
  assert.equal(back.stock.left, 2, 'từ chối đơn thì trả lại số lượng'); assert.equal(back.status, 'open');

  const o2 = (await api('POST', '/orders', { token: tok.thuy, body: { postId: p._id, quantity: 1, fulfillment: 'pickup', payment: 'cash' } })).body.data;
  await api('POST', `/seller/orders/${o2._id}/confirm`, { token: lan });
  await api('POST', `/seller/orders/${o2._id}/prepare`, { token: lan });
  assert.equal((await api('POST', `/seller/orders/${o2._id}/deliver`, { token: lan })).body.data.state, 'ready', 'tự lấy → sẵn sàng');
  assert.equal((await api('POST', `/seller/orders/${o2._id}/complete`, { token: lan })).body.data.state, 'done');
});

test('khách xin hủy: người bán đồng ý (trả số lượng) hoặc giữ đơn', async () => {
  const lan = tok.lan;
  const p = (await api('POST', '/seller/posts', { token: lan, body: newPost({ title: 'Chè bưởi', stock: { mode: 'limit', left: 5 } }) })).body.data;
  const a = (await api('POST', '/orders', { token: tok.thuy, body: { postId: p._id, quantity: 2, fulfillment: 'pickup', payment: 'cash' } })).body.data;
  const b = (await api('POST', '/orders', { token: tok.thuy, body: { postId: p._id, quantity: 1, fulfillment: 'pickup', payment: 'cash' } })).body.data;
  assert.equal((await api('POST', `/seller/orders/${a._id}/approveCancel`, { token: lan })).status, 409, 'chưa có yêu cầu hủy');
  await api('POST', `/orders/${a._id}/cancel-request`, { token: tok.thuy, body: { reason: 'Đổi ý' } });
  await api('POST', `/orders/${b._id}/cancel-request`, { token: tok.thuy, body: { reason: 'Đặt nhầm' } });
  assert.equal((await api('POST', `/seller/orders/${a._id}/confirm`, { token: lan })).status, 409, 'phải trả lời yêu cầu hủy trước');

  const ok = (await api('POST', `/seller/orders/${a._id}/approveCancel`, { token: lan })).body.data;
  assert.equal(ok.state, 'cancelled'); assert.equal(ok.cancelRequest.status, 'accepted');
  const kept = (await api('POST', `/seller/orders/${b._id}/keepOrder`, { token: lan })).body.data;
  assert.equal(kept.state, 'waiting'); assert.equal(kept.cancelRequest.status, 'rejected');
  const left = (await api('GET', '/seller/posts', { token: lan })).body.data.find((x) => x._id === p._id).stock.left;
  assert.equal(left, 4, 'chỉ đơn đã hủy được trả số lượng (5 - 2 - 1 + 2)');
});

test('phụ thu: người bán báo, khách đồng ý; thiếu lý do 422; báo hai lần 409', async () => {
  const lan = tok.lan;
  const p = (await api('POST', '/seller/posts', { token: lan, body: newPost({ title: 'Giao nhận hộ A→B' }) })).body.data;
  const o = (await api('POST', '/orders', { token: tok.thuy, body: { postId: p._id, quantity: 1, fulfillment: 'pickup', payment: 'cash' } })).body.data;
  await api('POST', `/seller/orders/${o._id}/confirm`, { token: lan });
  assert.equal((await api('POST', `/seller/orders/${o._id}/surcharge`, { token: lan, body: { amount: 15000 } })).status, 422);
  const s = (await api('POST', `/seller/orders/${o._id}/surcharge`, { token: lan, body: { amount: 15000, reason: 'Đồ nặng hơn khai báo' } })).body.data;
  assert.equal(s.surcharge.status, 'pending');
  assert.equal((await api('POST', `/seller/orders/${o._id}/surcharge`, { token: lan, body: { amount: 5000, reason: 'Thêm nữa' } })).status, 409);
  await api('POST', `/orders/${o._id}/approve-surcharge`, { token: tok.thuy });
  assert.equal((await api('GET', `/orders/${o._id}`, { token: tok.thuy })).body.data.total, o.total + 15000);
});

test('việc làm: đăng, đề nghị đến, chọn người (các đề nghị khác bị loại), xác nhận hoàn thành', async () => {
  const hoa = tok.hoa;
  const created = await api('POST', '/seller/jobs', { token: hoa, body: { title: 'Tưới cây ban công 2 ngày', desc: 'Tưới sáng và chiều', pay: 80000, unit: 'việc', workTime: 'Cuối tuần', area: 'B', exactAddress: 'B-0801', headcount: 1 } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const job = created.body.data;
  assert.ok((await api('GET', '/seller/jobs', { token: hoa })).body.data.some((j) => j._id === job._id));
  assert.equal((await api('PUT', `/seller/jobs/${job._id}`, { token: tok.lan, body: { title: 'x', pay: 1, area: 'B' } })).status, 403);

  const o1 = (await api('POST', `/jobs/${job._id}/offers`, { token: tok.thuy, body: { intro: 'Mình ở cùng block, tưới được cả hai buổi.', slots: [] } })).body.data;
  const o2 = (await api('POST', `/jobs/${job._id}/offers`, { token: tok.quoc, body: { intro: 'Mình rảnh cuối tuần, có kinh nghiệm chăm cây.', slots: [] } })).body.data;
  const inbox = (await api('GET', '/seller/offers', { token: hoa })).body.data;
  const got = inbox.find((o) => o._id === o1._id);
  assert.ok(got && inbox.some((o) => o._id === o2._id));
  assert.equal(got.worker.name, 'Ngọc Thủy', 'kèm thông tin người làm');
  assert.ok(!(await api('GET', '/seller/offers', { token: tok.lan })).body.data.some((o) => o._id === o1._id), 'người khác không thấy');

  assert.equal((await api('POST', `/seller/offers/${o1._id}/choose`, { token: tok.lan })).status, 403);
  assert.equal((await api('POST', `/seller/offers/${o1._id}/confirmDone`, { token: hoa })).status, 409, 'chưa báo xong');
  assert.equal((await api('POST', `/seller/offers/${o1._id}/choose`, { token: hoa })).body.data.state, 'chosen');
  assert.equal((await api('GET', `/offers/${o2._id}`, { token: tok.quoc })).body.data.state, 'rejected', 'đủ người thì đề nghị khác bị loại');
  assert.equal((await api('GET', `/jobs/${job._id}`)).body.data.status, 'closed');

  await api('POST', `/offers/${o1._id}/start`, { token: tok.thuy });
  await api('POST', `/offers/${o1._id}/report-done`, { token: tok.thuy, body: { note: 'Đã tưới xong cả hai buổi', images: [] } });
  assert.equal((await api('POST', `/seller/offers/${o1._id}/confirmDone`, { token: hoa })).body.data.state, 'done');
  assert.equal((await api('GET', `/seller/jobs`, { token: hoa })).body.data.find((j) => j._id === job._id).status, 'done');
});

test('người đăng việc từ chối một đề nghị; đóng/mở việc; hỏi đáp; xóa việc', async () => {
  const hoa = tok.hoa;
  const job = (await api('POST', '/seller/jobs', { token: hoa, body: { title: 'Đẩy xe nôi đi dạo', pay: 50000, area: 'B', headcount: 2 } })).body.data;
  const o = (await api('POST', `/jobs/${job._id}/offers`, { token: tok.thuy, body: { intro: 'Mình rảnh buổi chiều mỗi ngày.', slots: [] } })).body.data;
  const rej = (await api('POST', `/seller/offers/${o._id}/reject`, { token: hoa })).body.data;
  assert.equal(rej.state, 'rejected');
  assert.equal((await api('GET', `/jobs/${job._id}`)).body.data.offerCount, 0);

  assert.equal((await api('PATCH', `/seller/jobs/${job._id}`, { token: hoa, body: { closed: true } })).body.data.status, 'closed');
  assert.equal((await api('PATCH', `/seller/jobs/${job._id}`, { token: hoa, body: { closed: false } })).body.data.status, 'open');

  const q = (await api('POST', `/jobs/${job._id}/questions`, { token: tok.quoc, body: { text: 'Bé mấy tháng tuổi vậy ạ?' } })).body.data;
  assert.equal((await api('POST', `/seller/questions/${q._id}/answer`, { token: tok.lan, body: { text: 'Bé 8 tháng nhé' } })).status, 403);
  assert.equal((await api('POST', `/seller/questions/${q._id}/answer`, { token: hoa, body: { text: 'Bé 8 tháng nhé' } })).body.data.answer.text, 'Bé 8 tháng nhé');

  assert.equal((await api('DELETE', `/seller/jobs/${job._id}`, { token: hoa })).status, 204);
});
