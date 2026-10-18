import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

/** Custom validator: tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới. */
const usernameValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  /^[a-zA-Z0-9_]*$/.test(c.value ?? '') ? null : { badChars: true };

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
      fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      username: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(4), usernameValidator],
      }),
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
      confirmPass: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordMatchValidator },
  );

  protected invalid(name: 'fullName' | 'username' | 'password' | 'confirmPass'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, username, password } = this.form.getRawValue();
    this.auth.register({ fullName, username, password }).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.error.set('Không đăng ký được. Tên đăng nhập có thể đã tồn tại.'),
    });
  }
}
