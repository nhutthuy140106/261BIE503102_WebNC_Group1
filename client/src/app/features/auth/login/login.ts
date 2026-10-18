import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    rememberMe: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    // Điền sẵn tên đăng nhập đã nhớ (cookie thường, không dùng để xác thực)
    const remembered = this.auth.getRememberedUsername();
    if (remembered) this.form.patchValue({ username: remembered, rememberMe: true });
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
      error: () => {
        this.error.set('Tên đăng nhập hoặc mật khẩu không đúng.');
        this.submitting.set(false);
      },
    });
  }
}
