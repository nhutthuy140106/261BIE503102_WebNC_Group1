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

  protected readonly form = new FormGroup({
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    rememberMe: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    // Điền sẵn số điện thoại đã nhớ (cookie thường, không dùng để xác thực)
    const remembered = this.auth.getRememberedUsername();
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
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Chỉ chấp nhận đường dẫn nội bộ để tránh chuyển hướng ra site khác
        this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
      },
      error: (e: Error) => {
        this.error.set(e.message || 'Số điện thoại hoặc mật khẩu không đúng.');
        this.submitting.set(false);
      },
    });
  }
}
