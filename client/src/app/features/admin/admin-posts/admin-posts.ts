import { Component, OnInit, inject, signal } from '@angular/core';
import { AppError } from '../../../core/models/api';
import { AdminPost, AdminService } from '../../../core/services/admin';

const TYPE: Record<string, string> = { food: 'Đồ ăn', goods: 'Đồ dùng', service: 'Dịch vụ' };
const STATUS: Record<string, string> = { open: 'Đang mở', soldout: 'Hết hàng', closed: 'Đã đóng', hidden: 'Bị ẩn' };

/** Bài đăng: bảng có lọc, Ẩn (bắt buộc lý do) / Hiện lại; tiêu đề mở bài gốc ở tab mới. */
@Component({
  selector: 'app-admin-posts',
  standalone: false,
  templateUrl: './admin-posts.html',
  styleUrls: ['../admin-shared.css'],
})
export class AdminPosts implements OnInit {
  private readonly admin = inject(AdminService);

  protected readonly rows = signal<AdminPost[] | null>(null);
  protected readonly total = signal(0);
  protected readonly limit = signal(8);
  protected readonly error = signal('');
  protected readonly target = signal<AdminPost | null>(null);
  protected readonly busy = signal(false);

  protected q = '';
  protected type = '';
  protected status = '';
  protected page = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  protected typeLabel(t: string): string {
    return TYPE[t] ?? t;
  }

  protected statusLabel(s: string): string {
    return STATUS[s] ?? s;
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

  protected unhide(p: AdminPost): void {
    this.run(this.admin.unhidePost(p._id));
  }

  protected confirmHide(reason: string): void {
    const p = this.target();
    if (p) this.run(this.admin.hidePost(p._id, reason));
  }

  private run(req: ReturnType<AdminService['hidePost']>): void {
    this.busy.set(true);
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
    this.admin.listPosts({ q: this.q, type: this.type, status: this.status, page: this.page }).subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.limit.set(r.limit);
      },
      error: () => {
        this.rows.set([]);
        this.error.set('Không tải được danh sách bài đăng.');
      },
    });
  }
}
