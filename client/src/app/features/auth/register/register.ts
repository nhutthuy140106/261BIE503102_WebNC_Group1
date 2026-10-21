import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { AREAS, Area } from '../../../core/config/areas';
import { SelectOption } from '../../../shared/components/select/select';
import { LEGAL_VERSION } from '../../legal/legal-content';
import { isGuessablePassword, passwordRules, passwordStrength, phoneValidator, strongPasswordValidator } from '../../../core/utils/validators';

/** Cross-field validator gắn ở FormGroup: xác nhận mật khẩu phải khớp. */
const passwordMatchValidator: ValidatorFn = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirmPass')?.value ? null : { mismatch: true };

type Step = 1 | 2 | 3;
const OTP_SECONDS = 60;
const STRENGTH_LABEL = ['', 'Yếu', 'Vừa', 'Mạnh'];

/**
 * Đăng ký 3 bước: số điện thoại → mã xác nhận (OTP) → thông tin tài khoản.
 * OTP hiện là BẢN MẪU (chưa gửi SMS thật, nhập 6 số bất kỳ) — khi có nhà cung cấp SMS chỉ thay phần gửi/kiểm tra mã.
 */
@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.html',
  styleUrls: ['../auth-form.css', './register.css'],
})
export class Register implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private timer?: ReturnType<typeof setInterval>;

  protected readonly areaOptions: SelectOption[] = AREAS.map((a) => ({ value: a.id, label: a.name }));
  protected readonly stepNames = ['Số điện thoại', 'Mã xác nhận', 'Thông tin'];
  protected readonly step = signal<Step>(1);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly countdown = signal(0);

  protected readonly phone = new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] });
  protected readonly otp = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] });
  protected readonly info = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)] }),
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, strongPasswordValidator] }),
      confirmPass: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      areaId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      building: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      unit: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9.\-/]{1,10}$/)] }),
      // đồng ý điều khoản: 2 ô bắt buộc (lưu phiên bản đã đồng ý), 1 ô tùy chọn
      agreeTerms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
      agreeLiability: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
      marketing: new FormControl(false, { nonNullable: true }),
    },
    { validators: passwordMatchValidator },
  );

  // giá trị mật khẩu theo dạng signal để thanh đo độ mạnh cập nhật ngay khi gõ
  private readonly passwordValue = signal('');
  protected readonly rules = computed(() => passwordRules(this.passwordValue()));
  protected readonly strength = computed(() => passwordStrength(this.passwordValue(), this.phone.value));
  protected readonly strengthLabel = computed(() => STRENGTH_LABEL[this.strength()]);
  protected readonly guessable = computed(() => isGuessablePassword(this.passwordValue(), this.phone.value));

  constructor() {
    this.info.controls.password.valueChanges.subscribe((v) => this.passwordValue.set(v));
    // chưa chọn khu thì khóa ô tòa + phòng (vẫn hiện sẵn để bố cục không nhảy)
    this.info.controls.building.disable();
    this.info.controls.unit.disable();
    this.info.controls.areaId.valueChanges.subscribe((v) => {
      this.areaId.set(v);
      this.info.controls.building.reset(''); // đổi khu thì danh sách tòa khác, chọn lại
      for (const c of [this.info.controls.building, this.info.controls.unit]) v ? c.enable() : c.disable();
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  protected invalid(c: AbstractControl): boolean {
    return c.invalid && c.touched;
  }

  protected get maskedPhone(): string {
    const p = this.phone.value;
    return p.slice(0, 3) + ' ••• ' + p.slice(-3);
  }

  // ----- bước 1: số điện thoại -----
  protected sendCode(): void {
    if (this.phone.invalid) return this.phone.markAsTouched();
    this.error.set(null);
    this.otp.reset('');
    this.step.set(2);
    this.startCountdown();
  }

  // ----- bước 2: mã xác nhận -----
  protected resend(): void {
    if (this.countdown() > 0) return;
    this.error.set(null);
    this.otp.reset('');
    this.startCountdown();
  }

  protected verify(): void {
    if (this.otp.invalid) return this.otp.markAsTouched();
    if (this.countdown() <= 0) {
      this.error.set('Mã đã hết hạn. Bấm "Gửi lại mã" để nhận mã mới.');
      return;
    }
    this.error.set(null);
    clearInterval(this.timer);
    this.step.set(3);
  }

  protected back(): void {
    this.error.set(null);
    this.step.set(this.step() === 3 ? 2 : 1);
    if (this.step() === 2) this.startCountdown();
  }

  private startCountdown(): void {
    clearInterval(this.timer);
    this.countdown.set(OTP_SECONDS);
    this.timer = setInterval(() => {
      this.countdown.update((n) => n - 1);
      if (this.countdown() <= 0) clearInterval(this.timer);
    }, 1000);
  }

  // ----- bước 3: thông tin tài khoản -----
  /** Hai ô đồng ý bắt buộc đều đã tick (ô nhận ưu đãi là lựa chọn riêng, không gộp vào). */
  protected requiredAgreed(): boolean {
    const c = this.info.controls;
    return c.agreeTerms.value && c.agreeLiability.value;
  }

  protected agreeRequired(checked: boolean): void {
    const c = this.info.controls;
    c.agreeTerms.setValue(checked);
    c.agreeLiability.setValue(checked);
    c.agreeTerms.markAsTouched();
    c.agreeLiability.markAsTouched();
  }

  /** Khu đang chọn — quyết định nhãn ô Tòa / Phòng (KTX gọi khác chung cư). */
  protected readonly areaId = signal('');
  protected readonly area = computed<Area | undefined>(() => AREAS.find((a) => a.id === this.areaId()));
  protected readonly buildingOptions = computed<SelectOption[]>(() => (this.area()?.buildings ?? []).map((b) => ({ value: b, label: b })));


  onSubmit(): void {
    if (this.info.invalid || this.guessable()) {
      this.info.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const { name, password, areaId, building, unit, marketing } = this.info.getRawValue();
    this.auth.register({ name, phone: this.phone.value, password, areaId, building, unit, termsVersion: LEGAL_VERSION, marketing }).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (e: Error) => {
        this.error.set(e.message || 'Không đăng ký được. Số điện thoại có thể đã được dùng.');
        this.submitting.set(false);
      },
    });
  }
}
