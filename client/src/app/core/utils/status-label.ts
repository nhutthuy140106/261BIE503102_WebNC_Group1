import { OFFER_STATE_LABEL, OfferState } from '../models/offer';
import { Order, PLACED_STATUS_LABEL, PlacedStatus } from '../models/order';

/** Tên trạng thái thống nhất = tên bước trên thanh tiến trình (CLAUDE.md 2.2e). */
export function statusLabel(o: Pick<Order, 'type' | 'status'>): string {
  return o.type === 'received'
    ? OFFER_STATE_LABEL[o.status as OfferState]
    : PLACED_STATUS_LABEL[o.status as PlacedStatus];
}

/** Chỉ giờ: "01:33" (dưới từng bước của thanh tiến trình; ngày đã có ở chỗ khác) */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** Ngày giờ ĐẦY ĐỦ, một kiểu duy nhất cho cả app: "23/10/2026 · 01:33" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
