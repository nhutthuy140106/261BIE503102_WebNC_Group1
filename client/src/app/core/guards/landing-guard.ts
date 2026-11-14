import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

const KEY = 'antgo_seen_welcome';

/** Ghi nhớ phiên mở web này đã xem trang giới thiệu (đóng tab / mở lại thì khách lại thấy) (không có sessionStorage thì bỏ qua). */
export function markWelcomeSeen(): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* chế độ riêng tư: lần sau lại hiện giới thiệu, không sao */
  }
}

function seen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Trang chủ `/`: khách MỚI (chưa đăng nhập, chưa xem giới thiệu trong phiên này) được đưa tới `/welcome` trước,
 * từ đó bấm "Bắt đầu khám phá" hoặc "Đăng nhập". Đã đăng nhập hoặc đã xem trong phiên rồi thì vào thẳng trang chủ.
 */
export const landingGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService)
    .checkSession()
    .pipe(map((ok) => (ok || seen() ? true : router.createUrlTree(['/welcome']))));
};
