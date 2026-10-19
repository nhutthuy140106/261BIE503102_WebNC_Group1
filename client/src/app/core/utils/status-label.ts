import { OFFER_STATE_LABEL, OfferState } from '../models/offer';
import { Order, PLACED_STATUS_LABEL, PlacedStatus } from '../models/order';

/** Tên trạng thái thống nhất = tên bước trên thanh tiến trình (CLAUDE.md 2.2e). */
export function statusLabel(o: Pick<Order, 'type' | 'status'>): string {
  return o.type === 'received'
    ? OFFER_STATE_LABEL[o.status as OfferState]
    : PLACED_STATUS_LABEL[o.status as PlacedStatus];
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
