import { Directive, ElementRef, HostListener, Input, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** 100000 → "100.000"; trống = "" */
export const formatMoney = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined || n === '' || isNaN(+n)) return '';
  return String(Math.round(+n)).replace(/\B(?=(\d{3})+$)/g, '.');
};

/** "100.000" → 100000; không có chữ số = null */
export const parseMoney = (s: string): number | null => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d ? +d : null;
};

/**
 * Ô nhập số có dấu chấm ngăn cách hàng nghìn (100.000), giá trị lưu trong form vẫn là số.
 * Dùng với form: `<input appMoney formControlName="price" />`; ngoài form: `<input appMoney [moneyValue]="n" />` rồi đọc bằng parseMoney.
 */
@Directive({
  selector: 'input[appMoney]',
  standalone: false,
  host: { inputmode: 'numeric', maxlength: '15' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SellerMoneyInput), multi: true }],
})
export class SellerMoneyInput implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  @Input() set moneyValue(v: number | null | undefined) {
    this.writeValue(v);
  }

  writeValue(v: number | string | null | undefined): void {
    const text = formatMoney(v);
    if (this.el.value !== text) this.el.value = text;
  }
  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.el.disabled = d;
  }

  /** Thêm dấu chấm khi gõ, giữ con trỏ sau đúng chữ số vừa gõ */
  @HostListener('input')
  protected onInput(): void {
    const el = this.el;
    const digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
    const n = parseMoney(el.value);
    el.value = formatMoney(n);
    let pos = 0;
    for (let seen = 0; seen < digitsBefore && pos < el.value.length; pos++) if (/\d/.test(el.value[pos])) seen++;
    el.setSelectionRange(pos, pos);
    this.onChange(n);
  }

  @HostListener('blur')
  protected onBlur(): void {
    this.onTouched();
  }
}
