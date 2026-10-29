import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

/** Chỉ tài khoản có role 'admin' vào /admin; người khác về trang chủ. Quyền thật vẫn do server kiểm tra. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return auth
    .checkSession()
    .pipe(
      map((ok) =>
        !ok
          ? router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } })
          : auth.currentUser()?.role === 'admin'
            ? true
            : router.createUrlTree(['/']),
      ),
    );
};
