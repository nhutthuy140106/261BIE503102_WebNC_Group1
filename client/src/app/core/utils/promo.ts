/**
 * Giờ vàng (khuyến mãi theo khung giờ). Quy tắc khớp server (effectivePrice, mục 7.18):
 * - Giờ tính theo Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè).
 * - Khung vắt qua nửa đêm (from > to) hợp lệ; ngày trong tuần tính theo NGÀY BẮT ĐẦU khung.
 * - Giảm % làm tròn đồng; giảm tiền không xuống dưới 0. Voucher Xu tính SAU trên giá đã giảm.
 */
export interface Promo {
  kind: 'percent' | 'amount';
  value: number;
  /** "HH:mm" */
  from: string;
  to: string;
  /** 0 = Chủ nhật … 6 = Thứ bảy; rỗng = mọi ngày */
  days: number[];
  active?: boolean;
}

export interface Deal {
  /** Giá sau giảm (1 đơn vị) */
  price: number;
  original: number;
  /** "Giờ vàng −20%" */
  label: string;
  /** Mốc kết thúc khung đang chạy (ms epoch) */
  endsAt: number;
}

const VN_OFFSET = 7 * 3600e3;
const DAY = 864e5;

const toMin = (hm: string): number => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Giá sau khi giảm cho MỘT đơn vị. */
export function discounted(price: number, p: Pick<Promo, 'kind' | 'value'>): number {
  return Math.max(0, p.kind === 'percent' ? Math.round(price * (1 - p.value / 100)) : price - p.value);
}

export function promoLabel(p: Pick<Promo, 'kind' | 'value'>): string {
  return 'Giờ vàng −' + (p.kind === 'percent' ? p.value + '%' : new Intl.NumberFormat('vi-VN').format(p.value) + 'đ');
}

/** Phút trong ngày (giờ VN) và thứ (0–6) của một thời điểm. */
function vnParts(ms: number): { min: number; dow: number; dayStart: number } {
  const t = ms + VN_OFFSET;
  const dayStart = Math.floor(t / DAY) * DAY; // 0h VN của ngày đó, tính theo "giờ VN giả UTC"
  return { min: Math.floor((t - dayStart) / 60000), dow: new Date(t).getUTCDay(), dayStart };
}

/** Khung đang chạy tại `ms`? Trả mốc kết thúc (ms epoch) hoặc null. */
function runningUntil(p: Promo, ms: number): number | null {
  if (p.active === false) return null;
  const { min, dow, dayStart } = vnParts(ms);
  const a = toMin(p.from);
  const b = toMin(p.to);
  const okDay = (d: number) => !p.days?.length || p.days.includes(d);
  if (a === b) return null;
  if (a < b) {
    if (okDay(dow) && min >= a && min < b) return dayStart + b * 60000 - VN_OFFSET;
    return null;
  }
  // vắt qua nửa đêm
  if (okDay(dow) && min >= a) return dayStart + DAY + b * 60000 - VN_OFFSET;
  if (okDay((dow + 6) % 7) && min < b) return dayStart + b * 60000 - VN_OFFSET;
  return null;
}

/** Bài đang có Giờ vàng tại `ms` → giá giảm + nhãn + mốc hết giờ; không thì null. */
export function dealAt(post: { price: number; promo?: Promo | null }, ms: number): Deal | null {
  const p = post.promo;
  if (!p || !(p.value > 0)) return null;
  const endsAt = runningUntil(p, ms);
  if (endsAt === null) return null;
  return { price: discounted(post.price, p), original: post.price, label: promoLabel(p), endsAt };
}

/** Khung sẽ bắt đầu trong vòng `withinMin` phút tới (mặc định 3 giờ) → số phút còn lại và giờ bắt đầu. */
export function upcomingAt(post: { promo?: Promo | null }, ms: number, withinMin = 180): { inMin: number; from: string } | null {
  const p = post.promo;
  if (!p || p.active === false || !(p.value > 0) || runningUntil(p, ms) !== null) return null;
  for (let m = 1; m <= withinMin; m++) {
    if (runningUntil(p, ms + m * 60000) !== null) return { inMin: m, from: p.from };
  }
  return null;
}

/** "01:23:45" (hoặc "23:45" khi dưới 1 giờ) */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (h ? pad(h) + ':' : '') + pad(m) + ':' + pad(s % 60);
}

/** "16:00" giờ VN của một mốc ms */
export function clockVN(ms: number): string {
  const { min } = vnParts(ms);
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}
