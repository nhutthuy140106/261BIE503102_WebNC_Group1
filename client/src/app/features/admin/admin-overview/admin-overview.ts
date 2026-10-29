import { Component, OnInit, inject, signal } from '@angular/core';
import { REPORT_REASON_LABEL, ReportReason } from '../../../core/models/social';
import { AdminReport, AdminService, AdminStats } from '../../../core/services/admin';

const STATE_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', pricing: 'Chờ duyệt giá', preparing: 'Đang chuẩn bị', delivering: 'Đang giao', ready: 'Sẵn sàng',
  done: 'Hoàn thành', cancelled: 'Đã hủy', declined: 'Bị từ chối',
};

/** Tổng quan Quản trị: 4 ô số, biểu đồ cột đơn theo trạng thái (CSS thuần) và 5 báo cáo mới nhất. */
@Component({
  selector: 'app-admin-overview',
  standalone: false,
  templateUrl: './admin-overview.html',
  styleUrls: ['../admin-shared.css', './admin-overview.css'],
})
export class AdminOverview implements OnInit {
  private readonly admin = inject(AdminService);

  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly recent = signal<AdminReport[]>([]);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.admin.stats().subscribe({ next: (s) => this.stats.set(s), error: () => this.error.set('Không tải được số liệu. Bạn thử lại sau nhé.') });
    this.admin.listReports().subscribe({
      next: (r) => this.recent.set([...r].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)),
      error: () => this.error.set('Không tải được số liệu. Bạn thử lại sau nhé.'),
    });
  }

  protected bars(s: AdminStats): { key: string; label: string; n: number; pct: number }[] {
    const rows = Object.entries(s.orders.byState).filter(([, n]) => n > 0);
    const max = Math.max(1, ...rows.map(([, n]) => n));
    return rows.map(([key, n]) => ({ key, label: STATE_LABEL[key] ?? key, n, pct: (n / max) * 100 }));
  }

  protected reason(r: string): string {
    return REPORT_REASON_LABEL[r as ReportReason] ?? r;
  }
}
