// "Giờ vàng": giảm giá theo khung giờ lặp hằng tuần. MỌI chỗ tính tiền phải dùng effectivePrice() — không tin giá từ trình duyệt.
// Múi giờ cố định Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè) nên chỉ cần cộng 7 tiếng rồi đọc bằng getUTC*.
const { z } = require('zod');

const TZ_OFFSET_MS = 7 * 3600e3;
const DAY_MIN = 1440;
const UPCOMING_MS = 3 * 3600e3;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
const fmtMoney = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

// Dùng cho phía Bán khi đăng/sửa bài, và để kiểm tra dữ liệu seed
const promoSchema = z.object({
  kind: z.enum(['percent', 'amount']),
  value: z.number().positive(),
  from: z.string().regex(HHMM, 'Giờ bắt đầu dạng HH:mm'),
  to: z.string().regex(HHMM, 'Giờ kết thúc dạng HH:mm'),
  days: z.array(z.number().int().min(0).max(6)).min(1, 'Chọn ít nhất một ngày'),
  active: z.boolean().default(true),
}).superRefine((p, ctx) => {
  if (p.from === p.to) ctx.addIssue({ code: 'custom', path: ['to'], message: 'Giờ kết thúc phải khác giờ bắt đầu' });
  if (p.kind === 'percent' && (p.value < 1 || p.value > 90)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Giảm theo % từ 1 đến 90' });
});

// Đổi mốc thời gian sang "giờ Việt Nam": trả { day (0=Chủ nhật), min (phút trong ngày), midnight (ms UTC của 00:00 hôm nay theo giờ VN) }
function vn(now) {
  const t = new Date(now.getTime() + TZ_OFFSET_MS);
  const min = t.getUTCHours() * 60 + t.getUTCMinutes();
  const midnight = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - TZ_OFFSET_MS;
  return { day: t.getUTCDay(), min, midnight };
}

const label = (promo) => (promo.kind === 'percent' ? `Giảm ${promo.value}%` : `Giảm ${fmtMoney(promo.value)}`);

/**
 * Các lần bắt đầu của khung giờ quanh `now` (hôm qua, hôm nay, ngày mai): mỗi phần tử { start, end } là mốc ms UTC.
 * Khung vắt qua nửa đêm (from > to) bắt đầu ở ngày D (D phải nằm trong `days`) và kết thúc sáng hôm sau.
 */
function occurrences(promo, now) {
  const { day, midnight } = vn(now);
  const from = toMin(promo.from);
  const to = toMin(promo.to);
  const out = [];
  for (const offset of [-1, 0, 1]) {
    const d = (day + offset + 7) % 7;
    if (!promo.days.includes(d)) continue;
    const base = midnight + offset * DAY_MIN * 60000;
    out.push({ start: base + from * 60000, end: base + (to > from ? to : to + DAY_MIN) * 60000 });
  }
  return out;
}

/** Khuyến mãi đang chạy tại `now`: { label, endsAt } hoặc null. */
function activePromo(post, now = new Date()) {
  const p = post && post.promo;
  if (!p || !p.active || !p.from || !p.to || !p.days || !p.days.length) return null;
  const t = now.getTime();
  const hit = occurrences(p, now).find((o) => t >= o.start && t < o.end);
  return hit ? { label: label(p), endsAt: new Date(hit.end) } : null;
}

/** Khuyến mãi sẽ bắt đầu trong `withinMs` tới (mặc định 3 giờ): { label, startsAt } hoặc null. */
function upcomingPromo(post, now = new Date(), withinMs = UPCOMING_MS) {
  const p = post && post.promo;
  if (!p || !p.active || !p.from || !p.to || !p.days || !p.days.length) return null;
  const t = now.getTime();
  const next = occurrences(p, now).map((o) => o.start).filter((s) => s > t && s - t <= withinMs).sort((a, b) => a - b)[0];
  return next ? { label: label(p), startsAt: new Date(next) } : null;
}

/** Giá đơn vị đang áp dụng. Hết khung giờ thì về giá gốc ngay. Giá không bao giờ âm, làm tròn 100đ. */
function effectivePrice(post, now = new Date()) {
  const original = post.price;
  const promo = activePromo(post, now);
  if (!promo) return { price: original, original, promo: null };
  const p = post.promo;
  const cut = p.kind === 'percent' ? (original * p.value) / 100 : p.value;
  const price = Math.max(0, Math.round((original - cut) / 100) * 100);
  return { price: Math.min(price, original), original, promo };
}

module.exports = { promoSchema, effectivePrice, activePromo, upcomingPromo, vn };
