// Phiên đăng nhập, slug/tìm không dấu, giỏ nháp, upload, gợi ý, admin
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base;
const PW = 'Test@2026';
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
async function login(phone) {
  const jar = newJar();
  const r = await api('POST', '/auth/login', { body: { phone, password: PW }, token: jar });
  return { jar, user: r.body.data, res: r };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('phiên: login đặt cookie httpOnly, profile 200/401, logout hủy phiên, đổi Session ID', async () => {
  const jar = newJar();
  assert.equal((await api('GET', '/auth/profile', { token: jar })).status, 401);
  await api('GET', '/health', { token: jar }); // khách có phiên (cookie) nhưng chưa đăng nhập
  const before = jar.c;
  const r = await api('POST', '/auth/login', { body: { phone: '0900000001', password: PW }, token: jar });
  assert.equal(r.status, 200);
  assert.match(r.setCookie, /HttpOnly/i);
  assert.match(r.setCookie, /SameSite=Lax/i);
  assert.notEqual(jar.c, before, 'Session ID phải đổi sau khi đăng nhập');
  assert.equal(r.body.data.password, undefined);
  assert.equal((await api('GET', '/auth/profile', { token: jar })).body.data.phone, '0900000001');
  assert.equal((await api('POST', '/auth/logout', { token: jar })).status, 204);
  assert.equal((await api('GET', '/auth/profile', { token: jar })).status, 401);
});

test('đăng nhập: thông báo chung, chặn NoSQL injection, đăng ký luôn là enduser', async () => {
  const wrongPw = await api('POST', '/auth/login', { body: { phone: '0900000001', password: 'sai-mat-khau' } });
  const wrongPhone = await api('POST', '/auth/login', { body: { phone: '0911111119', password: 'sai-mat-khau' } });
  assert.equal(wrongPw.status, 401); assert.equal(wrongPhone.status, 401);
  assert.equal(wrongPw.body.error.message, wrongPhone.body.error.message);
  const inj = await api('POST', '/auth/login', { body: { phone: { $ne: null }, password: { $ne: null } } });
  assert.equal(inj.status, 422);
  const jar = newJar();
  const reg = await api('POST', '/auth/register', { token: jar, body: { name: 'Hacker', phone: '0911111111', password: 'abcdef', role: 'admin' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.data.role, 'enduser');
  assert.equal((await api('GET', '/admin/stats', { token: jar })).status, 403);
  assert.equal((await api('POST', '/auth/register', { body: { name: 'Trùng', phone: '0911111111', password: 'abcdef' } })).status, 409);
});

test('slug + tìm không dấu', async () => {
  const list = (await api('GET', '/posts?limit=100')).body.data;
  const pho = list.find((p) => p.title.startsWith('Phở'));
  assert.match(pho.slug, new RegExp(`^pho-bo-tai-nuoc-dung-ham-xuong-${pho._id}$`));
  assert.equal((await api('GET', `/posts/${pho.slug}`)).body.data._id, pho._id);
  assert.equal((await api('GET', `/posts/${pho._id}`)).status, 200);
  assert.equal((await api('GET', '/posts/khong-co-id-hop-le')).status, 400);
  assert.equal((await api('GET', '/posts?q=pho bo')).body.data[0]._id, pho._id);
  assert.ok((await api('GET', '/posts?q=TRA SUA')).body.data.length >= 1);
  assert.equal((await api('GET', '/jobs?q=meo')).body.data.length, 1); // "mèo"
  assert.ok((await api('GET', '/posts?q=...(')).status === 200); // ký tự regex không làm sập
});

test('giỏ nháp: khách thêm món, đăng nhập vẫn giữ, checkout tạo đơn đúng người/tổng', async () => {
  const jar = newJar();
  const food = (await api('GET', '/posts?type=food&q=com nha')).body.data[0];
  const tea = (await api('GET', '/posts?q=tra sua')).body.data[0];
  const add = await api('POST', '/cart', { token: jar, body: { postId: food._id, quantity: 2, selections: [{ group: 'Món mặn', choices: ['Sườn rim'] }], price: 1, userId: 'x' } });
  assert.equal(add.status, 200);
  assert.equal(add.body.data.estimate, (35000 + 10000) * 2); // giá lấy từ DB, bỏ qua price gửi lên
  await api('POST', '/cart', { token: jar, body: { postId: tea._id, quantity: 1, selections: [{ group: 'Size', choices: ['L'] }, { group: 'Độ ngọt', choices: ['50%'] }] } });
  assert.equal((await api('GET', '/cart', { token: jar })).body.data.items.length, 2);
  assert.equal((await api('POST', '/cart/checkout', { token: jar, body: { fulfillment: 'pickup', payment: 'cash' } })).status, 401);
  assert.equal((await api('GET', '/cart', { token: jar })).body.data.items.length, 2, 'chưa đăng nhập thì giỏ vẫn còn');

  await api('POST', '/auth/login', { body: { phone: '0900000001', password: PW }, token: jar });
  assert.equal((await api('GET', '/cart', { token: jar })).body.data.items.length, 2, 'đăng nhập (đổi Session ID) không mất giỏ');
  assert.equal((await api('DELETE', `/cart/${tea._id}`, { token: jar })).body.data.items.length, 1);
  await api('POST', '/cart', { token: jar, body: { postId: tea._id, quantity: 1, selections: [] } });

  // thiếu lựa chọn bắt buộc => không tạo đơn nào, giỏ giữ nguyên
  const bad = await api('POST', '/cart/checkout', { token: jar, body: { fulfillment: 'pickup', payment: 'cash' } });
  assert.equal(bad.status, 422);
  assert.equal((await api('GET', '/orders', { token: jar })).body.meta.total, 0);
  assert.equal((await api('GET', '/cart', { token: jar })).body.data.items.length, 2);

  await api('POST', '/cart', { token: jar, body: { postId: tea._id, quantity: 1, selections: [{ group: 'Size', choices: ['M'] }, { group: 'Độ ngọt', choices: ['100%'] }] } });
  const ok = await api('POST', '/cart/checkout', { token: jar, body: { fulfillment: 'pickup', payment: 'cash' } });
  assert.equal(ok.status, 201);
  assert.deepEqual(ok.body.data.map((o) => o.total).sort((a, b) => a - b), [30000, 90000]);
  assert.equal((await api('GET', '/cart', { token: jar })).body.data.items.length, 0);
  assert.equal((await api('GET', '/orders', { token: jar })).body.meta.total, 2);
});

test('upload: chỉ png/jpg/webp ≤ 2MB, tên do server sinh', async () => {
  const { jar } = await login('0900000001');
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  const form = (parts) => { const f = new FormData(); for (const [n, buf, name] of parts) f.append(n, new Blob([buf]), name); return f; };
  const post = (f, token) => fetch(`${base}/uploads`, { method: 'POST', body: f, headers: token && token.c ? { Cookie: token.c } : {} });

  assert.equal((await post(form([['images', png, 'a.png']]))).status, 401);
  const ok = await post(form([['images', png, '../../evil.png']]), jar);
  assert.equal(ok.status, 201);
  const url = (await ok.json()).data[0].url;
  assert.match(url, /^\/images\/uploads\/[0-9a-f-]{36}\.png$/);
  assert.equal((await fetch(base.replace('/api', '') + url)).status, 200);
  assert.equal((await post(form([['images', Buffer.from('<?php echo 1;'), 'x.png']]), jar)).status, 422);
  assert.equal((await post(form([['images', Buffer.alloc(2 * 1024 * 1024 + 10, 1), 'big.png']]), jar)).status, 413);
  assert.equal((await post(form([1, 2, 3, 4, 5].map((i) => ['images', png, `${i}.png`])), jar)).status, 413);
  // ảnh trong báo cáo/đánh giá phải là ảnh do server cấp
  const order = (await api('POST', '/orders', { token: jar, body: { postId: (await api('GET', '/posts?q=noi chien')).body.data[0]._id, quantity: 1, fulfillment: 'pickup', payment: 'cash' } })).body.data;
  const rp = (images) => api('POST', '/reports', { token: jar, body: { targetType: 'order', targetId: order._id, reason: 'quality', detail: 'Hàng không đúng mô tả', images } });
  assert.equal((await rp(['http://evil.com/x.png'])).status, 422);
  assert.equal((await rp([url])).status, 201);
});

test('gợi ý: bài tương tự hợp lý, gợi ý cho bạn theo lịch sử', async () => {
  const list = (await api('GET', '/posts?limit=100')).body.data;
  const pho = list.find((p) => p.title.startsWith('Phở'));
  const sim = (await api('GET', `/posts/${pho.slug}/similar?limit=7`)).body.data;
  assert.ok(sim.every((p) => p._id !== pho._id) && sim.every((p) => typeof p.score === 'number'));
  const rank = (name) => sim.findIndex((p) => p.title.includes(name));
  assert.ok(rank('Cơm nhà') >= 0 && rank('Cơm nhà') < rank('Xe đạp'), 'món ăn xếp trên xe đạp');
  assert.ok(rank('Cơm nhà') < rank('Tai nghe'));
  assert.equal(sim[0].type, 'food');
  assert.equal((await api('GET', '/posts/aaaaaaaaaaaaaaaaaaaaaaaa/similar')).status, 404);

  const { jar } = await login('0900000005'); // Quốc Anh, chưa có lịch sử
  const cold = (await api('GET', '/me/recommendations', { token: jar })).body.data;
  assert.ok(cold.every((p) => p.reason === 'new_in_area'));
  await api('PUT', `/me/saved/${pho._id}`, { token: jar });
  const rec = (await api('GET', '/me/recommendations', { token: jar })).body.data;
  assert.ok(rec.every((p) => p._id !== pho._id), 'không gợi ý lại bài đã lưu');
  assert.equal(rec[0].type, 'food');
  assert.equal(rec[0].reason, 'based_on_history');
  assert.equal((await api('GET', '/me/recommendations')).status, 401);
});

test('admin: 401/403, khóa/mở khóa, ẩn bài, báo cáo, thống kê, audit', async () => {
  const guest = newJar();
  assert.equal((await api('GET', '/admin/users', { token: guest })).status, 401);
  const user = await login('0900000001');
  for (const p of ['/admin/users', '/admin/posts', '/admin/reports', '/admin/stats']) assert.equal((await api('GET', p, { token: user.jar })).status, 403);
  const admin = await login('0900000099');

  // người dùng
  const users = (await api('GET', '/admin/users?role=enduser&q=Lan', { token: admin.jar })).body;
  assert.equal(users.data.length, 1); assert.equal(users.data[0].name, 'Bếp Cô Lan');
  const lan = users.data[0];
  assert.equal((await api('POST', `/admin/users/${admin.user._id}/lock`, { token: admin.jar, body: { reason: 'tự khóa thử' } })).status, 409);
  assert.equal((await api('POST', `/admin/users/${lan._id}/lock`, { token: admin.jar, body: { reason: 'x' } })).status, 422);
  const lanSession = await login('0900000002');
  assert.equal((await api('GET', '/auth/profile', { token: lanSession.jar })).status, 200);
  assert.equal((await api('POST', `/admin/users/${lan._id}/lock`, { token: admin.jar, body: { reason: 'Vi phạm quy định' } })).body.data.status, 'locked');
  assert.equal((await api('GET', '/auth/profile', { token: lanSession.jar })).status, 403, 'phiên đang có bị vô hiệu');
  const relog = await api('POST', '/auth/login', { body: { phone: '0900000002', password: PW } });
  assert.equal(relog.status, 403); assert.equal(relog.body.error.code, 'ACCOUNT_LOCKED');
  assert.equal((await api('POST', `/admin/users/${lan._id}/lock`, { token: admin.jar, body: { reason: 'khóa lần hai' } })).status, 409);
  assert.equal((await api('POST', `/admin/users/${lan._id}/unlock`, { token: admin.jar })).body.data.status, 'active');
  assert.equal((await login('0900000002')).res.status, 200);
  assert.equal((await api('PATCH', `/admin/users/${admin.user._id}/role`, { token: admin.jar, body: { role: 'enduser' } })).status, 409);
  assert.equal((await api('GET', `/admin/users/${lan._id}`, { token: admin.jar })).body.data.name, 'Bếp Cô Lan');
  // admin cuối cùng không bị khóa: tạo admin thứ hai rồi để họ thử khóa admin đầu tiên, sau đó khóa lại
  const quoc = (await api('GET', '/admin/users?q=Quốc', { token: admin.jar })).body.data[0];
  await api('PATCH', `/admin/users/${quoc._id}/role`, { token: admin.jar, body: { role: 'admin' } });
  const admin2 = await login('0900000005');
  assert.equal((await api('POST', `/admin/users/${admin.user._id}/lock`, { token: admin2.jar, body: { reason: 'Thử khóa admin' } })).status, 200);
  assert.equal((await api('POST', `/admin/users/${admin2.user._id}/lock`, { token: admin2.jar, body: { reason: 'tự khóa' } })).status, 409);
  await api('POST', `/admin/users/${admin.user._id}/unlock`, { token: admin2.jar });

  // bài viết
  const post = (await api('GET', '/posts?q=sofa')).body.data[0] || (await api('GET', '/posts?q=xe dap')).body.data[0];
  const hide = await api('POST', `/admin/posts/${post._id}/hide`, { token: admin.jar, body: { reason: 'Bài có dấu hiệu lừa đảo' } });
  assert.equal(hide.body.data.status, 'hidden');
  assert.equal((await api('POST', `/admin/posts/${post._id}/hide`, { token: admin.jar, body: { reason: 'ẩn lần hai nè' } })).status, 409);
  assert.equal((await api('GET', `/posts/${post._id}`)).status, 404);
  assert.equal((await api('GET', `/posts/${post._id}`, { token: admin.jar })).status, 200);
  assert.ok(!(await api('GET', '/posts?limit=100')).body.data.some((p) => p._id === post._id));
  assert.equal((await api('POST', '/orders', { token: user.jar, body: { postId: post._id, quantity: 1, fulfillment: 'pickup', payment: 'cash' } })).status, 409);
  assert.equal((await api('GET', '/admin/posts?status=hidden', { token: admin.jar })).body.meta.total, 1);
  assert.equal((await api('POST', `/admin/posts/${post._id}/unhide`, { token: admin.jar })).body.data.status, 'open');

  // báo cáo
  const food = (await api('GET', '/posts?q=com nha')).body.data[0];
  const o = (await api('POST', '/orders', { token: user.jar, body: { postId: food._id, quantity: 1, fulfillment: 'pickup', payment: 'cash', selections: [{ group: 'Món mặn', choices: ['Gà kho gừng'] }] } })).body.data;
  const rep = (await api('POST', '/reports', { token: user.jar, body: { targetType: 'order', targetId: o._id, reason: 'quality', detail: 'Món bị nguội khi tới nơi' } })).body.data;
  const q = (await api('GET', '/admin/reports?state=open', { token: admin.jar })).body;
  assert.ok(q.data.some((r) => r._id === rep._id), 'báo cáo mới nằm trong hàng đợi');
  assert.ok(q.data[0].createdAt <= q.data[q.data.length - 1].createdAt, 'cũ nhất trước');
  const t = (to, note) => api('POST', `/admin/reports/${rep._id}/transition`, { token: admin.jar, body: { to, note } });
  assert.equal((await t('resolved', 'chưa xem')).status, 409); // open -> resolved không hợp lệ
  assert.equal((await t('reviewing')).body.data.state, 'reviewing');
  assert.equal((await t('resolved')).status, 422); // kết thúc phải có ghi chú
  assert.equal((await t('resolved', 'Đã liên hệ người bán hoàn tiền')).body.data.state, 'resolved');
  assert.equal((await t('rejected', 'thử lại')).status, 409);
  const mine = (await api('GET', '/reports?mine=true', { token: user.jar })).body.data[0];
  assert.equal(mine.state, 'resolved'); assert.equal(mine.adminNote, 'Đã liên hệ người bán hoàn tiền'); assert.equal(mine.handledBy, undefined);

  // thống kê khớp DB
  const s = (await api('GET', '/admin/stats', { token: admin.jar })).body.data;
  assert.equal(s.users.total, await mongoose.model('User').countDocuments());
  assert.equal(s.posts.open, await mongoose.model('Post').countDocuments({ status: 'open' }));
  assert.equal(s.orders.total, await mongoose.model('Order').countDocuments());
  assert.equal(s.orders.byState.waiting, await mongoose.model('Order').countDocuments({ state: 'waiting' }));
  assert.equal(s.reports.byState.resolved, 1);
  assert.equal(s.reports.pending, await mongoose.model('Report').countDocuments({ state: { $in: ['open', 'reviewing'] } }));

  // mọi hành động admin đều có audit log
  const actions = (await mongoose.model('AuditLog').find().lean()).map((a) => a.action);
  for (const a of ['user.lock', 'user.unlock', 'user.role', 'post.hide', 'post.unhide', 'report.reviewing', 'report.resolved']) assert.ok(actions.includes(a), `thiếu audit ${a}`);
});
