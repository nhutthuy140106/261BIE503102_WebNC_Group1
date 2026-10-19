import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

/**
 * CanMatch cho /seller: chưa đăng nhập thì KHÔNG tải chunk của khu Bán, chuyển về đăng nhập.
 * (Bán & Đăng việc mở cho mọi người dùng đã đăng nhập, nên chỉ cần phiên hợp lệ; quyền thật do server.)
 */
export const sellerMatchGuard: CanMatchFn = (_route, segments) => {
  const router = inject(Router);
  return inject(AuthService)
    .checkSession()
    .pipe(
      map((ok) =>
        ok ? true : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/' + segments.map((s) => s.path).join('/') } }),
      ),
    );
};
