// Theo dõi giao hàng — MÔ PHỎNG. Không có GPS thật: vị trí xe được tính từ mốc thời gian trong order.history,
// nên mọi thiết bị hỏi cùng lúc đều thấy xe ở cùng một chỗ. Toạ độ lấy theo tâm Block A–D (mẫu, TP.HCM), khớp client.
const SIMULATED = true;
const BLOCK_POS = { A: [10.7873, 106.7052], B: [10.7935, 106.7121], C: [10.8046, 106.7215], D: [10.7981, 106.6988] };
const MIN_PER_KM = 6;     // xe máy trong khu ~10 km/h kể cả đèn đỏ, đủ chậm để demo thấy xe chạy
const MIN_TRIP = 4;       // chuyến ngắn nhất (phút)

const round = (n) => Math.round(n * 1e6) / 1e6;

function distanceKm(a, b) {
  const dy = (b[0] - a[0]) * 111.2;
  const dx = (b[1] - a[1]) * 111.2 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

// Điểm cụ thể trong Block: lệch nhẹ theo seed để hai đơn cùng Block không trùng điểm
function pointIn(block, seed) {
  const c = BLOCK_POS[block] || BLOCK_POS.B;
  let h = 7;
  for (const ch of String(seed)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return [c[0] + ((h % 21) - 10) * 0.00022, c[1] + (((h >> 5) % 21) - 10) * 0.00022];
}

function blockFromSeed(seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'ABCD'[h % 4];
}

// Block của cửa hàng: lấy theo bài nếu ghi A–D, không thì chọn ổn định theo mã người bán
const shopBlock = (post, sellerId) => (post && /^[A-D]$/.test(post.area) ? post.area : blockFromSeed(sellerId));

const stateAt = (order, state) => {
  const h = (order.history || []).find((x) => x.state === state);
  return h ? new Date(h.at).getTime() : null;
};

// Đơn có giao tận nơi (đồ ăn / đồ dùng) và chưa bị hủy mới có bản đồ
function canTrack(order) {
  const type = order.snapshot && order.snapshot.type;
  return order.fulfillment === 'delivery' && (type === 'food' || type === 'goods') && !['cancelled', 'declined'].includes(order.state);
}

/**
 * Tính vị trí xe tại thời điểm `now`.
 * phase: waiting (chờ xác nhận/đã xác nhận) · preparing (người bán chuẩn bị, xe còn ở quán) · delivering (đang chạy) · delivered.
 */
function compute(order, post, now = Date.now()) {
  const shop = pointIn(shopBlock(post, order.seller), 'shop:' + order.seller);
  const home = pointIn((order.address && order.address.block) || 'B', 'home:' + order.code);
  const km = distanceKm(shop, home);
  const tripMin = Math.max(MIN_TRIP, km * MIN_PER_KM);
  const at = (p) => ({ lat: round(p[0]), lng: round(p[1]) });
  let phase = 'waiting';
  let pos = shop;
  let etaMin = Math.ceil(tripMin);
  let remainKm = km;

  if (order.state === 'done') {
    phase = 'delivered'; pos = home; etaMin = 0; remainKm = 0;
  } else if (order.state === 'delivering') {
    const start = stateAt(order, 'delivering') || now;
    const t = Math.min(1, Math.max(0, (now - start) / 60000 / tripMin));
    if (t >= 1) { phase = 'delivered'; pos = home; etaMin = 0; remainKm = 0; }
    else {
      phase = 'delivering';
      pos = [shop[0] + (home[0] - shop[0]) * t, shop[1] + (home[1] - shop[1]) * t];
      etaMin = Math.max(1, Math.ceil(tripMin * (1 - t)));
      remainKm = km * (1 - t);
    }
  } else if (order.state === 'preparing' || order.state === 'ready') {
    phase = 'preparing';
  }
  return {
    simulated: SIMULATED,
    note: 'Vị trí xe là mô phỏng để minh hoạ, không phải GPS thật.',
    shop: at(shop),
    home: at(home),
    courier: { ...at(pos), phase, etaMin, distanceKm: Math.round(remainKm * 100) / 100 },
  };
}

module.exports = { compute, canTrack, BLOCK_POS, shopBlock };
