import { Component, OnInit, inject, signal } from '@angular/core';
import { AppError } from '../../../core/models/api';
import { AdminService, AdminUser } from '../../../core/services/admin';
import { AuthService } from '../../../core/services/auth';

/** Người dùng: bảng có tìm/lọc/phân trang, Khóa (bắt buộc lý do) / Mở khóa có xác nhận. */
@Component({
  selector: 'app-admin-users',
  standalone: false,
  templateUrl: './admin-users.html',
  styleUrls: ['../admin-shared.css'],
})
export class AdminUsers implements OnInit {
  private readonly admin = inject(AdminService);
  protected readonly me = inject(AuthService).currentUser;

  protected readonly rows = signal<AdminUser[] | null>(null);
  protected readonly total = signal(0);
  protected readonly limit = signal(8);
  protected readonly error = signal('');
  protected readonly target = signal<{ user: AdminUser; lock: boolean } | null>(null);
  protected readonly busy = signal(false);

  protected q = '';
  protected role = '';
  protected status = '';
  protected page = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  protected pages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  protected filter(delay = 0): void {
    this.page = 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(), delay);
  }

  protected go(p: number): void {
    this.page = Math.min(this.pages(), Math.max(1, p));
    this.load();
  }

  protected isSelf(u: AdminUser): boolean {
    return this.me()?._id === u._id;
  }

  protected confirm(reason: string): void {
    const t = this.target();
    if (!t) return;
    this.busy.set(true);
    const req = t.lock ? this.admin.lockUser(t.user._id, reason) : this.admin.unlockUser(t.user._id);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.target.set(null);
        this.load();
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.target.set(null);
        this.error.set(e instanceof AppError ? e.message : 'Chưa thực hiện được, bạn thử lại sau nhé.');
      },
    });
  }

  private load(): void {
    this.error.set('');
    this.admin.listUsers({ q: this.q, role: this.role, status: this.status, page: this.page }).subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.limit.set(r.limit);
      },
      error: (e: unknown) => {
        this.rows.set([]);
        this.error.set(e instanceof AppError && e.status === 403 ? 'Bạn không có quyền xem mục này.' : 'Không tải được danh sách người dùng.');
      },
    });
  }
}
