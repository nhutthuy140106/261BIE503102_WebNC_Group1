import { Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Ô nhập mật khẩu có nút con mắt để xem / ẩn mật khẩu.
 * Dùng với form: `<app-password-input formControlName="password" inputId="password" autocomplete="new-password" />`.
 */
@Component({
  selector: 'app-password-input',
  standalone: false,
  templateUrl: './password-input.html',
  styleUrl: './password-input.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInput), multi: true }],
})
export class PasswordInput implements ControlValueAccessor {
  @Input() inputId?: string;
  @Input() autocomplete = 'current-password';
  @Input() invalid = false;

  protected readonly value = signal('');
  protected readonly visible = signal(false);
  protected disabled = false;

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled = d;
  }

  protected input(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.value.set(v);
    this.onChange(v);
  }
}
