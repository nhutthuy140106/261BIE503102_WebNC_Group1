import { Component, OnInit, inject, isDevMode, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { USE_MOCK } from '../../../core/config/api.config';
import { AuthService } from '../../../core/services/auth';
import { PROMPT_TEXT, PromptReason } from '../../../core/services/auth-prompt';
import { phoneValidator } from '../../../core/utils/validators';

/** Tài khoản seed (server `npm run seed`) — mật khẩu mặc định là SEED_PASSWORD trong server/.env.example. Chỉ hiện khi chạy dev với máy chủ thật. */
const DEMO_PASSWORD = 'Antgo@2026';
const DEMO_ACCOUNTS = [
  { phone: '0900000001', name: 'Ngọc Thủy', role: 'Người mua' },
  { phone: '0900000002', name: 'Bếp Cô Lan', role: 'Người bán' },
  { phone: '0900000004', name: 'Chị Hoa', role: 'Người đăng việc' },
  { phone: '0900000099', name: 'Quản trị', role: 'Admin' },
];

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: '../auth-form.css',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Câu giải thích vì sao cần đăng nhập (theo ?reason=… từ nút khách bấm) */
  protected readonly why = PROMPT_TEXT[(this.route.snapshot.queryParamMap.get('reason') as PromptReason) ?? 'login'] ?? 'Chào mừng quay lại AntGo.';
  protected readonly error = signal<string | null>(null);
  /** Gợi ý tài khoản dùng thử cho cả nhóm / giảng viên: chỉ khi dev + đang nối máy chủ thật */
  protected readonly demoAccounts = isDevMode() && !USE_MOCK ? DEMO_ACCOUNTS : [];
  protected readonly submitting = signal(false);
  /** Số điện thoại đã nhớ (cookie): hiện làm gợi ý khi bấm vào ô số điện thoại. Không có mật khẩu. */
  protected readonly rememberedPhone = this.auth.getRememberedUsername();

  protected readonly form = new FormGroup({
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    rememberMe: new FormControl(false, { nonNullable: true }),
  });

  /** Tên Google đang chờ nhập số điện thoại (lần đầu đăng nhập Google); khác null thì thẻ hiện bước nhập SĐT thay cho form. */
  protected readonly googleName = this.auth.googlePending;
  protected readonly phoneOnly = new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] });

  /** Quay về form đăng nhập thường (bỏ thông tin Google đang chờ). */
  cancelGoogle(): void {
    this.auth.googlePending.set(null);
    this.error.set(null);
  }

  completeGoogle(): void {
    if (this.phoneOnly.invalid) {
      this.phoneOnly.markAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth.completeGoogle(this.phoneOnly.value.trim()).subscribe({
      next: () => this.goAfterLogin(),
      error: (e: Error & { code?: string }) => {
        this.error.set(e.message || 'Chưa hoàn tất được, thử lại nhé.');
        this.submitting.set(false);
        // Quá 10 phút chờ: phải chọn lại tài khoản Google → về form đăng nhập (lời báo vẫn hiện)
        if (e.code === 'INVALID_STATE') this.auth.googlePending.set(null);
      },
    });
  }

  /** Lý do + trang đang làm dở, đưa sang Đăng ký để không mất khi khách chưa có tài khoản. */
  protected carry(): Record<string, string> {
    const q = this.route.snapshot.queryParamMap;
    const out: Record<string, string> = {};
    for (const k of ['reason', 'returnUrl']) { const v = q.get(k); if (v) out[k] = v; }
    return out;
  }

  private goAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    // Chỉ chấp nhận đường dẫn nội bộ để tránh chuyển hướng ra site khác
    this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
  }

  ngOnInit(): void {
    // Điền sẵn số điện thoại đã nhớ (cookie thường, không dùng để xác thực)
    const remembered = this.route.snapshot.queryParamMap.get('phone') ?? this.auth.getRememberedUsername();
    if (remembered) this.form.patchValue({ phone: remembered, rememberMe: true });
  }

  fillDemo(phone: string): void {
    this.form.patchValue({ phone, password: DEMO_PASSWORD });
    this.error.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.goAfterLogin(),
      error: (e: Error) => {
        this.error.set(e.message || 'Số điện thoại hoặc mật khẩu không đúng.');
        this.submitting.set(false);
      },
    });
  }
}
