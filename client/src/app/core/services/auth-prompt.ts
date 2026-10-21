import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth';

/** Lý do cần đăng nhập — hiện ở thẻ đăng nhập (bê từ design/mockups/shared/auth.js). */
export type PromptReason = 'login' | 'save' | 'chat' | 'order' | 'offer' | 'ask' | 'follow' | 'orders' | 'xu' | 'notif' | 'sell' | 'post';

export const PROMPT_TEXT: Record<PromptReason, string> = {
  login: 'Một tài khoản cho cả mua, bán và nhận việc trong khu.',
  save: 'Đăng nhập để lưu bài — xem lại được trên mọi máy.',
  chat: 'Đăng nhập để nhắn tin với người bán, người đăng việc.',
  order: 'Đăng nhập để đặt. Những món bạn vừa chọn vẫn được giữ nguyên.',
  offer: 'Đăng nhập để gửi đề nghị. Lời giới thiệu bạn vừa viết vẫn còn đó.',
  ask: 'Đăng nhập để đặt câu hỏi công khai.',
  follow: 'Đăng nhập để theo dõi gian hàng này.',
  orders: 'Đăng nhập để xem đơn đã đặt và việc đã nhận.',
  xu: 'Đăng nhập để nhận và dùng AntXu.',
  notif: 'Đăng nhập để nhận thông báo về đơn và việc.',
  sell: 'Đăng nhập để bán và đăng việc cần người.',
  post: 'Đăng nhập để đăng việc cần người.',
};

const RESUME_KEY = 'antgo_resume';

interface Resume {
  type: string;
  payload: unknown;
}

/**
 * Luật "khách chỉ xem": bấm thứ cần tài khoản (Lưu, Nhắn tin, Tiếp tục đặt, Gửi đề nghị…)
 * → ghi tạm lựa chọn ở sessionStorage → sang trang đăng nhập (kèm lý do + trang cần quay về).
 * Đăng nhập xong quay về đúng trang, trang đó gọi takeResume(type) để điền lại và bấm tiếp.
 */
@Injectable({ providedIn: 'root' })
export class AuthPromptService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Đã đăng nhập → true. Khách → chuyển sang đăng nhập và trả false. */
  require(reason: PromptReason, resume?: Resume): boolean {
    if (this.auth.isLoggedIn()) return true;
    if (resume) {
      try {
        sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
      } catch {
        /* bỏ qua: chỉ mất phần điền lại */
      }
    }
    this.router.navigate(['/auth/login'], { queryParams: { reason, returnUrl: this.router.url } });
    return false;
  }

  /** Lấy và xóa phần đã ghi tạm của loại `type` (không có hoặc khác loại → null). */
  takeResume<T = unknown>(type: string): T | null {
    try {
      const raw = JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? 'null') as Resume | null;
      if (!raw || raw.type !== type) return null;
      sessionStorage.removeItem(RESUME_KEY);
      return raw.payload as T;
    } catch {
      return null;
    }
  }
}
