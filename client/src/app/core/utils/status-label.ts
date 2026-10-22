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

/** "Hôm nay, 01:33" · "Hôm qua, 20:10" · "23/10, 01:33" (thêm năm nếu khác năm nay) */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = pad(d.getHours()) + ':' + pad(d.getMinutes());
  const now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 864e5);
  if (days === 0) return 'Hôm nay, ' + time;
  if (days === 1) return 'Hôm qua, ' + time;
  const date = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + (d.getFullYear() !== now.getFullYear() ? '/' + d.getFullYear() : '');
  return date + ', ' + time;
}
