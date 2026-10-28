import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Số điện thoại VN 10 số, bắt đầu bằng 0. */
export function phoneValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  return v === '' || /^0\d{9}$/.test(v) ? null : { phone: true };
}

/** Số căn cước công dân: đúng 12 chữ số. */
export function idCardValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  return v === '' || /^\d{12}$/.test(v) ? null : { idCard: true };
}

/** Có ≥ 9 chữ số (kể cả cách nhau bởi dấu cách/chấm/gạch) — dùng chặn SĐT ở hỏi đáp công khai. */
export function containsPhone(text: string): boolean {
  return (text.match(/\d(?:[\s.\-]?\d){8,}/g) ?? []).length > 0;
}

export function noPhoneValidator(c: AbstractControl): ValidationErrors | null {
  return containsPhone(String(c.value ?? '')) ? { containsPhone: true } : null;
}

/** Mật khẩu hay bị đoán trước — chặn dù đã đủ điều kiện ký tự. */
const COMMON_PASSWORDS = ['12345678', '123456789', 'password', 'password1', 'matkhau123', 'qwerty123', 'abc12345', 'antgo123', '11111111', 'iloveyou1'];

export interface PasswordRule {
  key: 'length' | 'upper' | 'lower' | 'digit';
  label: string;
  /** Nhãn ngắn cho dạng viên nhỏ */
  short: string;
  ok: boolean;
}

/** Các điều kiện mật khẩu mạnh (dùng cho cả validator lẫn danh sách tick trên form). */
export function passwordRules(value: string): PasswordRule[] {
  return [
    { key: 'length', label: 'Ít nhất 8 ký tự', short: '8+ ký tự', ok: value.length >= 8 },
    { key: 'upper', label: 'Có chữ in hoa (A–Z)', short: 'A–Z', ok: /[A-Z]/.test(value) },
    { key: 'lower', label: 'Có chữ thường (a–z)', short: 'a–z', ok: /[a-z]/.test(value) },
    { key: 'digit', label: 'Có chữ số (0–9)', short: '0–9', ok: /\d/.test(value) },
  ];
}

/** Mật khẩu quá phổ biến hoặc chứa số điện thoại / tên đăng nhập. */
export function isGuessablePassword(value: string, phone = ''): boolean {
  const v = value.toLowerCase();
  return COMMON_PASSWORDS.includes(v) || (phone.length >= 6 && v.includes(phone));
}

/**
 * Độ mạnh 0–4: Yếu (thiếu điều kiện hoặc dễ đoán) · Trung bình (đủ 4 điều kiện) · Khá (+ dài từ 10 ký tự hoặc có ký tự đặc biệt)
 * · Mạnh (+ cả hai: dài từ 12 ký tự và có ký tự đặc biệt).
 */
export function passwordStrength(value: string, phone = ''): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  const passed = passwordRules(value).filter((r) => r.ok).length;
  if (passed < 4 || isGuessablePassword(value, phone)) return 1;
  const long = value.length >= 10;
  const special = /[^A-Za-z0-9]/.test(value);
  if (value.length >= 12 && special) return 4;
  return long || special ? 3 : 2;
}

export function strongPasswordValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '');
  if (v === '') return null;
  if (v.length > 72) return { tooLong: true };
  return passwordRules(v).every((r) => r.ok) ? null : { weak: true };
}
