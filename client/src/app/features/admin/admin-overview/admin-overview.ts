import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApi, Dashboard, msgOf } from '../../../core/services/admin-api';

const STATE_LABEL: Record<string, string> = {
  waiting: 'Chờ xác nhận', confirmed: 'Đã xác nhận', picked: 'Đã lấy đồ', pricing: 'Chờ duyệt giá', preparing: 'Đang chuẩn bị',
  delivering: 'Đang giao', ready: 'Sẵn sàng', done: 'Hoàn thành', cancelled: 'Đã hủy', declined: 'Bị từ chối',
};
const STATE_ORDER = ['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'delivering', 'ready', 'done', 'cancelled', 'declined'];

interface Bar { x: number; y: number; w: number; h: number; v: number; day: string }

/** Tổng quan: việc cần xử lý hôm nay, chỉ số chính, biểu đồ theo ngày, đơn theo trạng thái, người bán hàng đầu. */
@Component({
  selector: 'app-admin-overview',
  standalone: false,
  templateUrl: './admin-overview.html',
  styleUrls: ['../admin-shared.css', './admin-overview.css'],
})
export class AdminOverview implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal('');
  protected days = 14;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.error.set('');
    this.api.dashboard(+this.days).subscribe({
      next: (d) => this.data.set(d),
      error: (e: unknown) => this.error.set(msgOf(e, 'Không tải được số liệu.')),
    });
  }

  protected sum(a: number[]): number {
    return a.reduce((x, y) => x + y, 0);
  }

  protected tasks(d: Dashboard): { label: string; n: number; to: string; q?: Record<string, string> }[] {
    return [
      { label: 'Hồ sơ người bán chờ duyệt', n: d.todo.verifications, to: '/admin/verifications' },
      { label: 'Báo cáo vi phạm chưa xử lý', n: d.todo.reports, to: '/admin/reports' },
      { label: 'Khách báo vấn đề cần phân xử', n: d.todo.issues, to: '/admin/orders', q: { issue: 'open' } },
      { label: 'Yêu cầu hủy đang chờ', n: d.todo.cancelRequests, to: '/admin/orders' },
      { label: 'Phiếu hỗ trợ chưa trả lời', n: d.todo.tickets, to: '/admin/support' },
    ];
  }

  protected allClear(d: Dashboard): boolean {
    return this.tasks(d).every((t) => t.n === 0);
  }

  /** Cột biểu đồ trong khung 600×150; `slot`/`slots` để vẽ hai chuỗi cạnh nhau */
  protected bars(vals: number[], days: string[], max: number, slot = 0, slots = 1): Bar[] {
    const W = 600, H = 150, n = vals.length, step = W / n, gap = Math.min(6, step * 0.25);
    const w = (step - gap * 2) / slots;
    return vals.map((v, i) => {
      const h = max > 0 ? Math.max(v > 0 ? 3 : 0, (v / max) * (H - 6)) : 0;
      return { x: i * step + gap + slot * w, y: H - h, w: Math.max(2, w - (slots > 1 ? 1 : 0)), h, v, day: days[i] };
    });
  }

  protected top(...series: number[][]): number {
    return Math.max(1, ...series.flat());
  }

  protected dayLabel(k: string): string {
    return k.slice(8) + '/' + k.slice(5, 7);
  }

  protected states(d: Dashboard): { key: string; label: string; n: number; pct: number }[] {
    const rows = STATE_ORDER.filter((k) => d.ordersByState[k]).map((k) => ({ key: k, label: STATE_LABEL[k], n: d.ordersByState[k] }));
    const max = Math.max(1, ...rows.map((r) => r.n));
    return rows.map((r) => ({ ...r, pct: Math.max(3, Math.round((r.n / max) * 100)) })); // tối thiểu 3% để đơn ít vẫn thấy được
  }

  protected tone(k: string): string {
    return k === 'done' ? 'ok' : k === 'cancelled' || k === 'declined' ? 'bad' : k === 'waiting' || k === 'pricing' ? 'warn' : 'info';
  }
}
