import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApi, AuditRow, msgOf } from '../../../core/services/admin-api';
import { TARGET, actionLabel } from '../admin-labels';

/** Nhật ký thao tác: ai làm gì, với đối tượng nào, lúc nào, vì sao. Chỉ xem, không sửa được. */
@Component({
  selector: 'app-admin-audit',
  standalone: false,
  templateUrl: './admin-audit.html',
  styleUrls: ['../admin-shared.css'],
})
export class AdminAudit implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly rows = signal<AuditRow[] | null>(null);
  protected readonly total = signal(0);
  protected readonly error = signal('');
  protected get groupOptions(): { value: unknown; label: string }[] {
    return this.groups.map((g) => ({ value: g.v, label: g.t }));
  }
  protected readonly groups = [
    { v: '', t: 'Mọi thao tác' }, { v: 'user', t: 'Người dùng' }, { v: 'post', t: 'Bài đăng' }, { v: 'report', t: 'Báo cáo' },
    { v: 'order', t: 'Đơn hàng' }, { v: 'xu', t: 'Cộng/trừ Xu' }, { v: 'voucher', t: 'Voucher' }, { v: 'ticket', t: 'Hỗ trợ' },
    { v: 'announcement', t: 'Thông báo hệ thống' }, { v: 'settings', t: 'Cài đặt' }, { v: 'export', t: 'Xuất dữ liệu' },
  ];
  protected action = '';
  protected page = 1;

  ngOnInit(): void {
    this.load();
  }

  protected label = actionLabel;
  protected target = (t: string): string => TARGET[t] ?? t;
  protected pages(): number { return Math.max(1, Math.ceil(this.total() / 20)); }
  protected filter(): void { this.page = 1; this.load(); }
  protected go(p: number): void { this.page = p; this.load(); }

  /** Liên kết tới đối tượng nếu trang quản trị có chỗ xem */
  protected link(r: AuditRow): string[] | null {
    if (r.targetType === 'user') return ['/admin/users', r.targetId];
    if (r.targetType === 'order') return ['/admin/orders', r.targetId];
    return null;
  }

  private load(): void {
    this.error.set('');
    this.api.audit({ action: this.action || undefined, page: this.page }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.meta.total); },
      error: (e: unknown) => { this.rows.set([]); this.error.set(msgOf(e, 'Không tải được nhật ký.')); },
    });
  }
}
