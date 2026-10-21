import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SellerVerificationService } from '../services/seller-verification';

/**
 * Chưa xác minh danh tính thì không vào khu Bán, chuyển sang /seller/verify.
 * (Người mua không cần xác minh; quyền thật vẫn do server kiểm tra từng API.)
 */
export const sellerVerifiedGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(SellerVerificationService)
    .load()
    .pipe(map((v) => (v.status === 'approved' ? true : router.createUrlTree(['/seller/verify']))));
};
