process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Post = require('../src/modules/shared/post.model');
const { effectivePrice, activePromo, upcomingPromo, promoSchema } = require('../src/utils/promo');
const { priceOrder } = require('../src/modules/buyer/order/order.service');

const at = (iso) => new Date(iso); // luôn ghi múi giờ +07:00 để đọc test theo giờ Việt Nam
const EVERY = [0, 1, 2, 3, 4, 5, 6];
const post = (promo, price = 40000) => ({ price, promo });

test('trong/ngoài khung giờ: phần trăm và số tiền; ngoài khung về giá gốc', () => {
  const p = post({ kind: 'percent', value: 20, from: '14:00', to: '17:00', days: EVERY, active: true });
  const inside = effectivePrice(p, at('2026-10-29T15:00:00+07:00'));
  assert.equal(inside.price, 32000);
  assert.equal(inside.original, 40000);
  assert.equal(inside.promo.label, 'Giảm 20%');
  assert.equal(inside.promo.endsAt.toISOString(), at('2026-10-29T17:00:00+07:00').toISOString());
  assert.equal(effectivePrice(p, at('2026-10-29T13:59:59+07:00')).promo, null);
  assert.equal(effectivePrice(p, at('2026-10-29T17:00:00+07:00')).promo, null); // 17:00 đã hết, về giá gốc ngay
  assert.equal(effectivePrice(p, at('2026-10-29T17:00:00+07:00')).price, 40000);
  assert.equal(effectivePrice(post({ kind: 'amount', value: 5000, from: '00:00', to: '23:59', days: EVERY, active: true }), at('2026-10-29T12:00:00+07:00')).price, 35000);
  assert.equal(effectivePrice(post({ kind: 'amount', value: 99000, from: '00:00', to: '23:59', days: EVERY, active: true }, 40000), at('2026-10-29T12:00:00+07:00')).price, 0); // không âm
});

test('đúng múi giờ Việt Nam, không phải UTC', () => {
  const p = post({ kind: 'percent', value: 50, from: '06:00', to: '10:00', days: EVERY, active: true });
  assert.ok(activePromo(p, at('2026-10-29T08:00:00+07:00'))); // 01:00 UTC
  assert.equal(activePromo(p, at('2026-10-29T08:00:00Z')), null); // 15:00 giờ VN
});

test('khung vắt qua nửa đêm: 21:00–02:00, ngày tính theo ngày BẮT ĐẦU', () => {
  const p = post({ kind: 'percent', value: 25, from: '21:00', to: '02:00', days: [4], active: true }); // chỉ thứ Năm
  assert.ok(activePromo(p, at('2026-10-29T23:30:00+07:00'))); // thứ Năm 23:30
  const next = activePromo(p, at('2026-10-30T01:00:00+07:00')); // thứ Sáu 01:00 vẫn thuộc khung bắt đầu từ thứ Năm
  assert.ok(next);
  assert.equal(next.endsAt.toISOString(), at('2026-10-30T02:00:00+07:00').toISOString());
  assert.equal(activePromo(p, at('2026-10-30T02:00:00+07:00')), null);
  assert.equal(activePromo(p, at('2026-10-30T23:30:00+07:00')), null); // thứ Sáu 23:30: không nằm trong days
  assert.equal(activePromo(p, at('2026-10-29T01:00:00+07:00')), null); // thứ Năm 01:00 thuộc khung bắt đầu từ thứ Tư
});

test('theo ngày trong tuần và active=false', () => {
  const p = post({ kind: 'percent', value: 10, from: '09:00', to: '12:00', days: [0, 6], active: true });
  assert.ok(activePromo(p, at('2026-10-31T10:00:00+07:00'))); // thứ Bảy
  assert.equal(activePromo(p, at('2026-10-29T10:00:00+07:00')), null); // thứ Năm
  assert.equal(activePromo(post({ ...p.promo, active: false }), at('2026-10-31T10:00:00+07:00')), null);
  assert.equal(activePromo({ price: 1000 }, new Date()), null);
});

test('upcoming: bắt đầu trong 3 giờ tới', () => {
  const p = post({ kind: 'percent', value: 10, from: '17:00', to: '21:00', days: EVERY, active: true });
  const up = upcomingPromo(p, at('2026-10-29T15:00:00+07:00'));
  assert.equal(up.startsAt.toISOString(), at('2026-10-29T17:00:00+07:00').toISOString());
  assert.equal(upcomingPromo(p, at('2026-10-29T13:59:00+07:00')), null); // còn hơn 3 giờ
  assert.equal(upcomingPromo(p, at('2026-10-29T18:00:00+07:00')), null); // đang chạy
  const nextDay = upcomingPromo(post({ ...p.promo, from: '00:30', to: '03:00' }), at('2026-10-29T23:00:00+07:00'));
  assert.equal(nextDay.startsAt.toISOString(), at('2026-10-30T00:30:00+07:00').toISOString());
});

test('zod: từ chối khung sai', () => {
  const ok = { kind: 'percent', value: 15, from: '10:00', to: '14:00', days: [1, 2] };
  assert.equal(promoSchema.parse(ok).active, true);
  for (const bad of [{ from: '25:00' }, { to: '10:00' }, { days: [] }, { days: [7] }, { value: 0 }, { value: 95 }, { kind: 'x' }]) {
    assert.equal(promoSchema.safeParse({ ...ok, ...bad }).success, false, JSON.stringify(bad));
  }
});

test('priceOrder: tính theo giá đã giảm; voucher Xu tính SAU và mức tối thiểu theo giá đã giảm', () => {
  const base = {
    price: 40000, deliveryFee: 5000, type: 'food', optionGroups: [], questions: [], fulfillmentModes: ['pickup', 'delivery'], acceptsXu: true,
    promo: { kind: 'percent', value: 25, from: '10:00', to: '14:00', days: EVERY, active: true },
  };
  const input = { quantity: 2, selections: [], answers: [], fulfillment: 'pickup' };
  const inWin = priceOrder(base, input, null, at('2026-10-29T11:00:00+07:00'));
  assert.equal(inWin.breakdown.items, 60000); // 2 × 30.000
  assert.equal(inWin.breakdown.promoSaved, 20000);
  assert.equal(inWin.promo.price, 30000);
  const outWin = priceOrder(base, input, null, at('2026-10-29T15:00:00+07:00'));
  assert.equal(outWin.breakdown.items, 80000);
  assert.equal(outWin.breakdown.promoSaved, 0);
  // v10 (đơn từ 50.000đ): 60.000đ đã giảm vẫn đủ → trừ thêm 10.000đ
  const v10 = { def: { cid: 'v10', min: 50000, amount: 10000 } };
  const withV = priceOrder(base, { ...input, voucherCode: 'XU-ABC123' }, v10, at('2026-10-29T11:00:00+07:00'));
  assert.equal(withV.total, 50000);
  // 1 phần: 30.000đ sau giảm < 50.000đ
  assert.throws(() => priceOrder(base, { ...input, quantity: 1, voucherCode: 'XU-ABC123' }, v10, at('2026-10-29T11:00:00+07:00')), /Đơn chưa hợp lệ/);
  // tối thiểu 70.000đ: giá gốc 80.000đ đủ, nhưng sau Giờ vàng còn 60.000đ thì không đủ
  const v20 = { def: { cid: 'v20', min: 70000, amount: 20000 } };
  assert.doesNotThrow(() => priceOrder(base, { ...input, voucherCode: 'XU-ABC123' }, v20, at('2026-10-29T15:00:00+07:00')));
  assert.throws(() => priceOrder(base, { ...input, voucherCode: 'XU-ABC123' }, v20, at('2026-10-29T11:00:00+07:00')), /Đơn chưa hợp lệ/);
});

// ---------- API ----------
let mongod; let server; let base; let cookie;
async function api(method, path, data) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '0900000001', password: 'Test@2026' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('GET /deals?now= đổi theo giờ; chi tiết bài có promo và deal; now sai → 422', async () => {
  const com = await Post.findOne({ title: /Cơm nhà/ });
  com.promo = { kind: 'percent', value: 20, from: '10:00', to: '14:00', days: EVERY, active: true };
  await com.save();
  const q = (iso) => '/deals?now=' + encodeURIComponent(iso);
  const at11 = (await api('GET', q('2026-10-29T11:00:00+07:00'))).body.data;
  const hit = at11.active.find((p) => p._id === String(com._id));
  assert.ok(hit);
  assert.equal(hit.deal.price, 28000);
  assert.equal(hit.deal.original, 35000);
  assert.equal(hit.seller.name, 'Bếp Cô Lan');
  const at09 = (await api('GET', q('2026-10-29T09:00:00+07:00'))).body.data;
  assert.equal(at09.active.find((p) => p._id === String(com._id)), undefined);
  assert.ok(at09.upcoming.find((p) => p._id === String(com._id)).upcoming.startsAt); // 10:00 là trong 3 giờ tới
  const at16 = (await api('GET', q('2026-10-29T16:00:00+07:00'))).body.data;
  assert.equal(at16.active.length + at16.upcoming.length, 0);
  assert.equal((await api('GET', '/deals?now=hom-nay')).status, 422);
  const detail = (await api('GET', `/posts/${com._id}`)).body.data;
  assert.equal(detail.promo.from, '10:00'); // cấu hình khung giờ
  assert.ok('deal' in detail); // giá đang áp dụng (null hoặc object tùy giờ chạy test)
});

test('đặt đơn qua API: giá lấy từ server, bỏ qua giá/total từ trình duyệt; giỏ nháp ước tính theo giá đã giảm', async () => {
  const com = await Post.findOne({ title: /Cơm nhà/ });
  com.promo = { kind: 'amount', value: 5000, from: '00:00', to: '23:59', days: EVERY, active: true }; // luôn giảm để test không phụ thuộc giờ chạy
  await com.save();
  const sel = [{ group: 'Món mặn', choices: ['Gà kho gừng'] }];
  const r = await api('POST', '/orders', { postId: String(com._id), quantity: 1, fulfillment: 'pickup', payment: 'cash', total: 1, unitPrice: 1, selections: sel });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.breakdown.items, 30000);
  assert.equal(r.body.data.breakdown.promoSaved, 5000);
  assert.equal(r.body.data.total, 30000);
  assert.equal(r.body.data.snapshot.unitPrice, 30000);
  assert.equal(r.body.data.snapshot.originalPrice, 35000);
  assert.equal(r.body.data.snapshot.promoLabel, 'Giảm 5.000đ');
  await api('POST', '/cart', { postId: String(com._id), quantity: 2, selections: sel });
  const cart = (await api('GET', '/cart')).body.data;
  assert.equal(cart.items[0].unitPrice, 30000);
  assert.equal(cart.estimate, 60000);
});
