import { Component, ElementRef, Input, NgZone, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GOOGLE_CLIENT_ID } from '../../../core/config/api.config';
import { AuthService } from '../../../core/services/auth';
import { loadGoogleIdentity } from '../../../core/utils/google-identity';

/** Khung chung cho đăng nhập / đăng ký: nền trời, logo, thẻ có kiến dựa lưng, nút Google. */
@Component({
  selector: 'app-auth-shell',
  standalone: false,
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
})
export class AuthShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);

  /** Thẻ quá dài (form nhiều ô) thì tắt kiến để không che ô nhập. */
  @Input() showAnt = true;
  /** Thẻ rộng hơn (khi form có nhiều ô); mặc định thẻ vừa khít nội dung. */
  @Input() wide = false;
  /** Đặt thẻ giữa trang thay vì lệch trái. */
  @Input() centered = false;
  /** Nút Google chỉ có nghĩa ở bước đầu của đăng ký / ở trang đăng nhập. */
  @Input() showGoogle = true;

  /** Ô chứa nút Google: có thể bị gỡ rồi dựng lại (khi trang đăng nhập chuyển sang bước nhập SĐT rồi quay lại) nên vẽ mỗi lần ô xuất hiện. */
  @ViewChild('googleBtn') protected set googleSlot(el: ElementRef<HTMLElement> | undefined) {
    if (el) this.renderGoogle(el.nativeElement);
  }

  protected readonly notice = signal<string | null>(null);
  private gsiReady = false;

  private renderGoogle(host: HTMLElement): void {
    loadGoogleIdentity()
      .then((g) => {
        if (!this.gsiReady) {
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (r) => this.zone.run(() => this.onCredential(r.credential)),
          });
          this.gsiReady = true;
        }
        // Nút Google thật nằm trong suốt đè lên nút AntGo → bề ngang phải bằng nút AntGo (Google cho 200–400px)
        const width = Math.min(400, Math.max(200, Math.round(host.clientWidth) || 376));
        g.accounts.id.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'center', width, locale: 'vi' });
      })
      .catch(() => this.notice.set('Không tải được đăng nhập Google. Kiểm tra mạng rồi tải lại trang, hoặc dùng số điện thoại.'));
  }

  private onCredential(credential: string): void {
    this.notice.set('Đang đăng nhập…');
    this.auth.loginWithGoogle(credential).subscribe({
      next: (r) => {
        if ('needPhone' in r) {
          // Lần đầu: AuthService đã ghi googlePending → trang Đăng nhập tự chuyển sang bước nhập số điện thoại
          this.notice.set(null);
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Chỉ chấp nhận đường dẫn nội bộ để tránh chuyển hướng ra site khác
        this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
      },
      error: (e: Error) => this.notice.set(e.message || 'Đăng nhập Google chưa thành công, thử lại nhé.'),
    });
  }
}
