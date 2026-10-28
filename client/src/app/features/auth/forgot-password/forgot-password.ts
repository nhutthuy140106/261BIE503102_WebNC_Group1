import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { isGuessablePassword, passwordRules, passwordStrength, phoneValidator, strongPasswordValidator } from '../../../core/utils/validators';

const matchValidator: ValidatorFn = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirmPass')?.value ? null : { mismatch: true };

type Step = 1 | 2 | 3 | 4;
const OTP_SECONDS = 60;
const STRENGTH_LABEL = ['', 'Yếu', 'Vừa', 'Mạnh'];

/**
 * Quên mật khẩu: số điện thoại → mã xác nhận → mật khẩu mới → xong.
 * Mã xác nhận hiện là BẢN MẪU (chưa gửi SMS thật, nhập 6 số bất kỳ), giống bước đăng ký.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrls: ['../auth-form.css', '../register/register.css', './forgot-password.css'],
})
export class ForgotPassword implements OnDestroy {
  private readonly auth = inject(AuthService);
  private timer?: ReturnType<typeof setInterval>;

  protected readonly stepNames = ['Số điện thoại', 'Mã xác nhận', 'Mật khẩu mới'];
  protected readonly step = signal<Step>(1);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly countdown = signal(0);

  protected readonly phone = new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] });
  protected readonly otp = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] });
  protected readonly pass = new FormGroup(
    {
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, strongPasswordValidator] }),
      confirmPass: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: matchValidator },
  );

  private readonly passwordValue = signal('');
  protected readonly rules = computed(() => passwordRules(this.passwordValue()));
  protected readonly strength = computed(() => passwordStrength(this.passwordValue(), this.phone.value));
  protected readonly strengthLabel = computed(() => STRENGTH_LABEL[this.strength()]);
  protected readonly guessable = computed(() => isGuessablePassword(this.passwordValue(), this.phone.value));

  constructor() {
    this.pass.controls.password.valueChanges.subscribe((v) => this.passwordValue.set(v));
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  protected get maskedPhone(): string {
    const p = this.phone.value;
    return p.slice(0, 3) + ' ••• ' + p.slice(-3);
  }

  protected invalid(c: AbstractControl): boolean {
    return c.invalid && c.touched;
  }

  protected sendCode(): void {
    if (this.phone.invalid) return this.phone.markAsTouched();
    this.error.set(null);
    this.otp.reset('');
    this.step.set(2);
    this.startCountdown();
  }

  protected resend(): void {
    if (this.countdown() > 0) return;
    this.error.set(null);
    this.otp.reset('');
    this.startCountdown();
  }

  protected verify(): void {
    if (this.otp.invalid) return this.otp.markAsTouched();
    if (this.countdown() <= 0) return void this.error.set('Mã đã hết hạn. Bấm "Gửi lại mã" để nhận mã mới.');
    this.error.set(null);
    clearInterval(this.timer);
    this.step.set(3);
  }

  protected back(): void {
    this.error.set(null);
    this.step.set(this.step() === 3 ? 2 : 1);
    if (this.step() === 2) this.startCountdown();
  }

  protected save(): void {
    this.pass.markAllAsTouched();
    if (this.pass.invalid || this.guessable()) return;
    this.submitting.set(true);
    this.auth.resetPassword(this.phone.value, this.pass.controls.password.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.step.set(4);
      },
      error: (e: Error) => {
        this.submitting.set(false);
        this.error.set(e.message);
      },
    });
  }

  private startCountdown(): void {
    clearInterval(this.timer);
    this.countdown.set(OTP_SECONDS);
    this.timer = setInterval(() => {
      this.countdown.update((n) => n - 1);
      if (this.countdown() <= 0) clearInterval(this.timer);
    }, 1000);
  }
}
