import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Số điện thoại VN 10 số, bắt đầu bằng 0. */
export function phoneValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  return v === '' || /^0\d{9}$/.test(v) ? null : { phone: true };
}

/** Có ≥ 9 chữ số (kể cả cách nhau bởi dấu cách/chấm/gạch) — dùng chặn SĐT ở hỏi đáp công khai. */
export function containsPhone(text: string): boolean {
  return (text.match(/\d(?:[\s.\-]?\d){8,}/g) ?? []).length > 0;
}

export function noPhoneValidator(c: AbstractControl): ValidationErrors | null {
  return containsPhone(String(c.value ?? '')) ? { containsPhone: true } : null;
}
