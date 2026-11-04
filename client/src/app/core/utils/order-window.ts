import { runningUntil, vnParts } from './promo';

/** Khung giờ nhận đơn của một bài (người bán đặt). Giờ Việt Nam; days: 0 = Chủ nhật … 6 = Thứ bảy, rỗng = mọi ngày. */
export interface OrderWindow {
  from: string;
  to: string;
  days: number[];
}

export interface WindowState {
  open: boolean;
  /** Đang mở: giờ đóng ("12:00"). */
  closesAt?: string;
  /** Đang đóng: lần mở tới, dạng "ngày mai 06:00". */
  reopen?: string;
}

const DOW = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function hm(ms: number): string {
  const { min } = vnParts(ms);
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

/** Bài có đang nhận đơn tại `ms` không; nếu đóng thì khi nào mở lại. */
export function windowStateAt(w: OrderWindow, ms: number): WindowState {
  const w2 = { from: w.from, to: w.to, days: w.days };
  const until = runningUntil(w2, ms);
  if (until !== null) return { open: true, closesAt: hm(until) };
  const today = vnParts(ms).dayStart;
  for (let m = 1; m <= 8 * 24 * 60; m++) {
    const t = ms + m * 60000;
    if (runningUntil(w2, t) !== null) {
      const gap = Math.round((vnParts(t).dayStart - today) / 864e5);
      const day = gap === 0 ? 'hôm nay' : gap === 1 ? 'ngày mai' : DOW[vnParts(t).dow];
      return { open: false, reopen: day + ' ' + hm(t) };
    }
  }
  return { open: false };
}

/** Các mốc cách nhau 30 phút nằm trong khung; `fromMin` (phút trong ngày) > 0 thì bỏ mốc đã qua. */
export function windowSlots(from: string, to: string, fromMin = 0): string[] {
  const [a, b] = [from, to].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
  const end = b <= a ? 24 * 60 - 1 : b; // khung vắt nửa đêm: chỉ gợi ý đến hết ngày
  const out: string[] = [];
  for (let m = a; m <= end; m += 30) if (m >= fromMin) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
  return out;
}
