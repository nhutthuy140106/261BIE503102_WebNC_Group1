import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApi, Dashboard, msgOf } from '../../../core/services/admin-api';
import { AuthService } from '../../../core/services/auth';

const STATE_LABEL: Record<string, string> = {
  waiting: 'Chờ xác nhận', confirmed: 'Đã xác nhận', picked: 'Đã lấy đồ', pricing: 'Chờ duyệt giá', preparing: 'Đang chuẩn bị',
  delivering: 'Đang giao', ready: 'Sẵn sàng', done: 'Hoàn thành', cancelled: 'Đã hủy', declined: 'Bị từ chối',
};
const STATE_ORDER = ['done', 'delivering', 'preparing', 'ready', 'confirmed', 'picked', 'waiting', 'pricing', 'cancelled', 'declined'];
/** Màu từng trạng thái trên biểu đồ vành khuyên: xanh lá = xong, vàng = chờ, đỏ = hủy, còn lại nhóm cam / xanh dương */
const STATE_COLOR: Record<string, string> = {
  done: '#5BD1A0', delivering: '#F58A5B', preparing: '#E8662F', ready: '#FFB08D', confirmed: '#7FB2FF', picked: '#5B8FE0',
  waiting: '#F5B04C', pricing: '#F7C873', cancelled: '#F58585', declined: '#C95D5D',
};

interface Slice { key: string; label: string; n: number; pct: number; color: string; len: number; off: number }

/** Tổng quan: việc cần xử lý hôm nay, chỉ số chính, biểu đồ cột theo ngày, vành khuyên đơn theo trạng thái, người bán hàng đầu. */
@Component({
  selector: 'app-admin-overview',
  standalone: false,
  templateUrl: './admin-overview.html',
  styleUrls: ['../admin-shared.css', './admin-overview.css'],
})
export class AdminOverview implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly me = inject(AuthService).currentUser;
  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal('');
  protected days = 14;
  /** Chu vi vành khuyên r = 54 */
  protected readonly C = 2 * Math.PI * 54;

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

  /** Trần trục tung: làm tròn lên để các vạch chia là số tròn */
  protected niceMax(...series: number[][]): number {
    const m = Math.max(1, ...series.flat());
    const p = 10 ** Math.floor(Math.log10(m));
    const n = m / p;
    // chọn bội số chia hết cho 4 để cả 4 khoảng trên trục đều ra số tròn (0 – 8 – 16 – 24 – 32)
    return ([1, 1.2, 1.6, 2, 2.4, 3.2, 4, 4.8, 6.4, 8, 10].find((x) => x >= n) ?? 10) * p;
  }

  protected ticks(max: number, money = false): { pct: number; text: string }[] {
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({ pct: f * 100, text: money ? this.compact(max * f) : String(Math.round(max * f)) }));
  }

  /** 1.250.000 → "1,3 tr"; 45.000 → "45k" */
  protected compact(n: number): string {
    if (n >= 1e6) return `${Math.round((n / 1e6) * 10) / 10} tr`.replace('.', ',');
    if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
    return String(Math.round(n));
  }

  protected pct(v: number, max: number): number {
    return max > 0 ? Math.max(v > 0 ? 3 : 0, (v / max) * 100) : 0;
  }

  /** Nhãn trục ngày: chỉ hiện mỗi k ngày để không dính nhau khi xem 30 / 90 ngày */
  protected xLabels(days: string[]): string[] {
    const k = Math.max(1, Math.ceil(days.length / 10));
    return days.map((d, i) => ((days.length - 1 - i) % k === 0 ? d.slice(8) + '/' + d.slice(5, 7) : ''));
  }

  protected dayFull(k: string): string {
    return k.slice(8) + '/' + k.slice(5, 7);
  }

  protected slices(d: Dashboard): Slice[] {
    const rows = STATE_ORDER.filter((k) => d.ordersByState[k]).map((k) => ({ key: k, label: STATE_LABEL[k], n: d.ordersByState[k], color: STATE_COLOR[k] }));
    const total = Math.max(1, rows.reduce((a, r) => a + r.n, 0));
    let acc = 0;
    return rows.map((r) => {
      const len = (r.n / total) * this.C;
      const s = { ...r, pct: Math.round((r.n / total) * 1000) / 10, len: Math.max(0, len - 2.5), off: -acc }; // chừa khe 2,5 giữa các cung
      acc += len;
      return s;
    });
  }

  protected topMax(d: Dashboard): number {
    return Math.max(1, ...d.topSellers.map((s) => s.revenue));
  }
}
