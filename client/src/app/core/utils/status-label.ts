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

/** Chỉ ngày: "24/10/2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
}

/**
 * Thời gian làm của một việc, MỘT kiểu chung: "24/10/2026 · 06:30", "24/10/2026 · 08:30 – 11:00",
 * nhiều ngày "28/10/2026 – 30/10/2026 · 08:30 – 11:00"; không cố định giờ chỉ ghi ngày; việc lặp tuần thì dùng chữ `due`.
 */
export function jobWhen(job: { due: string; start?: string; end?: string; allDay?: boolean } | undefined | null): string {
  if (!job) return '';
  if (!job.start) return job.due;
  if (job.allDay) return job.end ? formatDate(job.start) + ' – ' + formatDate(job.end) : formatDate(job.start);
  if (!job.end) return formatDateTime(job.start);
  const [from, to] = [formatDate(job.start), formatDate(job.end)];
  const [h1, h2] = [formatDateTime(job.start).split(' · ')[1], formatDateTime(job.end).split(' · ')[1]];
  return (from === to ? from : from + ' – ' + to) + ' · ' + (h1 === h2 ? h1 : h1 + ' – ' + h2);
}
