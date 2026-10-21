import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';
import { PromptReason } from '../services/auth-prompt';

/** Lý do hiện ở trang đăng nhập, theo trang riêng tư đang vào. */
function reasonFor(url: string): PromptReason {
  if (url.startsWith('/orders')) return 'orders';
  if (url.startsWith('/messenger')) return 'chat';
  if (url.startsWith('/notifications')) return 'notif';
  if (url.startsWith('/seller')) return 'sell';
  return 'login';
}

/** Chưa đăng nhập -> về /auth/login (kèm returnUrl + lý do). Quyền thật vẫn do server kiểm tra. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthService)
    .checkSession()
    .pipe(
      map((ok) =>
        ok ? true : router.createUrlTree(['/auth/login'], { queryParams: { reason: reasonFor(state.url), returnUrl: state.url } }),
      ),
    );
};
