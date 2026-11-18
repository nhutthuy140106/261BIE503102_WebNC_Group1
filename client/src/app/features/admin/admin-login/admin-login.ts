import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { USE_MOCK } from '../../../core/config/api.config';
import { AppError } from '../../../core/models/api';
import { AuthService } from '../../../core/services/auth';

/** Đăng nhập riêng cho khu Quản trị: chỉ tài khoản admin / người kiểm duyệt vào được; tài khoản thường bị từ chối và đăng xuất ngay. */
@Component({
  selector: 'app-admin-login',
  standalone: false,
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly needsServer = USE_MOCK;
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected phone = '';
  protected password = '';
  protected show = false;

  protected submit(): void {
    if (this.busy()) return;
    if (!/^0\d{9}$/.test(this.phone.trim())) { this.error.set('Số điện thoại gồm 10 số, bắt đầu bằng 0.'); return; }
    if (!this.password) { this.error.set('Vui lòng nhập mật khẩu.'); return; }
    this.error.set('');
    this.busy.set(true);
    this.auth.login({ phone: this.phone.trim(), password: this.password, rememberMe: false }).subscribe({
      next: (u) => {
        if (u.role !== 'admin' && u.role !== 'moderator') {
          // đăng nhập đúng nhưng không phải quản trị: không giữ phiên ở khu này
          this.auth.logout().subscribe({ complete: () => undefined, error: () => undefined });
          this.busy.set(false);
          this.error.set('Tài khoản này không có quyền quản trị. Nếu bạn là người dùng AntGo, hãy đăng nhập ở trang thường.');
          return;
        }
        const back = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(back && back.startsWith('/admin') && !back.startsWith('/admin/login') ? back : '/admin');
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e instanceof AppError ? e.message : 'Chưa đăng nhập được, bạn thử lại sau nhé.');
      },
    });
  }
}
