/**
 * Thời hạn xử lý của người bán (chốt 11/11/2026) và chữ đếm ngược hiện trên thẻ "Cần bạn xử lý" / chi tiết đơn.
 * Đơn vị: phút.
 */
export const LIMITS = {
  /** xác nhận đơn đồ ăn, đồ uống */
  confirmFood: 10,
  /** xác nhận đơn đồ dùng */
  confirmGoods: 12 * 60,
  /** xác nhận đơn dịch vụ (và không trễ hơn 1 giờ trước giờ hẹn) */
  confirmService: 2 * 60,
  serviceBeforeAppt: 60,
  /** trả lời yêu cầu hủy của khách (và không trễ hơn giờ hẹn) */
  cancel: 12 * 60,
  /** gửi báo giá sau khi lấy đồ / kiểm tra */
  quote: 2 * 60,
  /** chọn người: trước giờ bắt đầu việc */
  pickBefore: 60,
  /** xác nhận hoàn thành sau khi người làm báo xong */
  confirmDone: 24 * 60,
};

/**
 * cancel = hết hạn thì đơn tự hủy · auto = hết hạn thì tự làm thay (đồng ý hủy, đóng việc, xác nhận xong)
 * late = hạn là giờ hẹn, quá giờ chỉ báo trễ · remind = quá hạn chỉ nhắc
 */
export type DueMode = 'cancel' | 'auto' | 'late' | 'remind';

export interface Deadline {
  at: number;
  mode: DueMode;
  /** chữ đứng trước, vd "Giao lúc 11:30" */
  prefix?: string;
}

const MIN = 60_000;

/** Khoảng còn lại: dưới 1 giờ ghi kiểu đồng hồ "9:42", lâu hơn ghi "2 giờ 15 phút", "1 ngày 3 giờ" */
function left(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 86_400) {
    const h = Math.floor((s % 86_400) / 3600);
    return `${Math.floor(s / 86_400)} ngày${h ? ` ${h} giờ` : ''}`;
  }
  if (s >= 3600) {
    const m = Math.floor((s % 3600) / 60);
    return `${Math.floor(s / 3600)} giờ${m ? ` ${m} phút` : ''}`;
  }
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Khoảng đã quá: theo phút ("12 phút", "1 giờ 5 phút") */
function over(ms: number): string {
  const m = Math.max(1, Math.floor(ms / MIN));
  if (m >= 1440) return `${Math.floor(m / 1440)} ngày`;
  return m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${m} phút`;
}

/** Chữ đếm ngược. hot = sắp hết (dưới 5 phút) hoặc đã quá hạn → tô đỏ */
export function dueText(d: Deadline, now: number): { text: string; hot: boolean } {
  const ms = d.at - now;
  const pre = d.prefix ? `${d.prefix} · ` : '';
  if (ms > 0) return { text: d.prefix ? `${pre}còn ${left(ms)}` : `Còn ${left(ms)}`, hot: ms <= 5 * MIN };
  const say = (t: string) => (d.prefix ? pre + t : t[0].toUpperCase() + t.slice(1));
  if (d.mode === 'late') return { text: say(`trễ hẹn ${over(-ms)}`), hot: true };
  if (d.mode === 'remind') return { text: say(`quá hạn ${over(-ms)}`), hot: true };
  return { text: 'Hết hạn, đang xử lý…', hot: true };
}
