import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE } from '../config/api.config';
import { AuthService } from '../services/auth';

/**
 * Với request tới /api: gửi kèm cookie phiên; gặp 401 (không phải ở /auth/*) thì
 * xóa trạng thái đăng nhập và đưa về trang đăng nhập kèm returnUrl.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) return next(req);
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((e: unknown) => {
      if (e instanceof HttpErrorResponse && e.status === 401 && !req.url.startsWith(`${API_BASE}/auth/`)) {
        auth.currentUser.set(null);
        router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => e);
    }),
  );
};
