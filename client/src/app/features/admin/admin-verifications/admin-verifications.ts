import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApi, Verification, msgOf } from '../../../core/services/admin-api';

const TYPE: Record<string, string> = { food: 'Đồ ăn & uống', goods: 'Đồ dùng', service: 'Dịch vụ' };

/** Duyệt hồ sơ xác minh người bán: xem giấy tờ, duyệt hoặc từ chối kèm lý do. Chưa duyệt thì người bán không đăng được bài. */
@Component({
  selector: 'app-admin-verifications',
  standalone: false,
  templateUrl: './admin-verifications.html',
  styleUrls: ['../admin-shared.css', './admin-verifications.css'],
})
export class AdminVerifications implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly tabs = [{ key: 'pending', label: 'Chờ duyệt' }, { key: 'approved', label: 'Đã duyệt' }, { key: 'rejected', label: 'Đã từ chối' }];
  protected readonly tab = signal('pending');
  protected readonly rows = signal<Verification[] | null>(null);
  protected readonly total = signal(0);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly big = signal<string | null>(null);
  protected readonly acting = signal<{ v: Verification; approve: boolean } | null>(null);
  protected page = 1;

  ngOnInit(): void {
    this.load();
  }

  protected pick(k: string): void {
    this.tab.set(k);
    this.page = 1;
    this.load();
  }
  protected pages(): number {
    return Math.max(1, Math.ceil(this.total() / 10));
  }
  protected go(p: number): void {
    this.page = p;
    this.load();
  }
  protected type(t: string): string {
    return TYPE[t] ?? t;
  }

  protected confirm(reason: string): void {
    const a = this.acting();
    if (!a) return;
    this.busy.set(true);
    (a.approve ? this.api.approve(a.v._id) : this.api.reject(a.v._id, reason)).subscribe({
      next: () => { this.busy.set(false); this.acting.set(null); this.load(); },
      error: (e: unknown) => { this.busy.set(false); this.acting.set(null); this.error.set(msgOf(e)); },
    });
  }

  protected load(): void {
    this.error.set('');
    this.api.verifications(this.tab(), this.page).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.meta.total); },
      error: (e: unknown) => { this.rows.set([]); this.error.set(msgOf(e, 'Không tải được hồ sơ.')); },
    });
  }
}
