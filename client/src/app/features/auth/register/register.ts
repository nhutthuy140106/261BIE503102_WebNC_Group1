import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { phoneValidator } from '../../../core/utils/validators';

/** Cross-field validator gắn ở FormGroup: xác nhận mật khẩu phải khớp. */
const passwordMatchValidator: ValidatorFn = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirmPass')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] }),
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
      confirmPass: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordMatchValidator },
  );

  protected invalid(name: 'name' | 'phone' | 'password' | 'confirmPass'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, phone, password } = this.form.getRawValue();
    this.auth.register({ name, phone, password }).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (e: Error) => this.error.set(e.message || 'Không đăng ký được. Số điện thoại có thể đã được dùng.'),
    });
  }
}
