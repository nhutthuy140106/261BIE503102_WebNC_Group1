import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api';
import { AuthService } from '../../../core/services/auth';

interface Item { to: string; label: string; icon: string; badge?: () => number; exact?: boolean; adminOnly?: boolean }
interface Group { title: string; items: Item[] }

/** Khung Quản trị riêng (không dùng header/footer của phía Mua): thanh bên tối nhóm theo việc cần làm, có dấu chấm số việc chờ. */
@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout implements OnInit, OnDestroy {
  protected readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly me = this.auth.currentUser;
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly groups: Group[] = [
    { title: '', items: [{ to: '/admin', label: 'Tổng quan', icon: 'grid', exact: true }] },
    {
      title: 'Cần xử lý',
      items: [
        { to: '/admin/verifications', label: 'Xác minh người bán', icon: 'shield', badge: () => this.api.todo()?.verifications ?? 0 },
        { to: '/admin/reports', label: 'Báo cáo vi phạm', icon: 'bell', badge: () => this.api.todo()?.reports ?? 0 },
        { to: '/admin/orders', label: 'Đơn & tranh chấp', icon: 'receipt', badge: () => (this.api.todo()?.issues ?? 0) + (this.api.todo()?.cancelRequests ?? 0) },
        { to: '/admin/support', label: 'Hộp thư hỗ trợ', icon: 'chat', badge: () => this.api.todo()?.tickets ?? 0 },
      ],
    },
    {
      title: 'Quản lý',
      items: [
        { to: '/admin/users', label: 'Người dùng', icon: 'users' },
        { to: '/admin/posts', label: 'Bài đăng', icon: 'bag' },
        { to: '/admin/vouchers', label: 'Voucher & Xu', icon: 'coin' },
      ],
    },
    {
      title: 'Hệ thống',
      items: [
        { to: '/admin/announcements', label: 'Thông báo hệ thống', icon: 'megaphone', adminOnly: true },
        { to: '/admin/settings', label: 'Cài đặt & xuất dữ liệu', icon: 'wrench' },
        { to: '/admin/audit', label: 'Nhật ký thao tác', icon: 'clock' },
      ],
    },
  ];

  ngOnInit(): void {
    this.api.refreshTodo();
    this.timer = setInterval(() => this.api.refreshTodo(), 60000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected isAdmin(): boolean {
    return this.me()?.role === 'admin';
  }

  protected roleLabel(): string {
    return this.me()?.role === 'admin' ? 'Quản trị viên' : 'Người kiểm duyệt';
  }

  protected logout(): void {
    this.auth.logout().subscribe({ complete: () => void this.router.navigateByUrl('/admin/login'), error: () => void this.router.navigateByUrl('/admin/login') });
  }
}
