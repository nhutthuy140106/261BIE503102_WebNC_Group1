import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

/** Chưa đăng nhập -> về /auth/login (kèm returnUrl). Quyền thật vẫn do server kiểm tra. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthService)
    .checkSession()
    .pipe(
      map((ok) =>
        ok ? true : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } }),
      ),
    );
};
