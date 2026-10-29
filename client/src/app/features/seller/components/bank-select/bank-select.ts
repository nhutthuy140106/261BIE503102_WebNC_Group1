import { Component, ElementRef, HostListener, Input, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BANK_LIST, bankLogo } from '../../seller-post-form/banks';

/** Bỏ dấu để tìm "vietcom", "ngoai thuong"… */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/**
 * Ô chọn ngân hàng nhận chuyển khoản: biểu tượng + tên viết tắt, bấm mở danh sách đầy đủ (VietQR) có ô tìm;
 * mỗi dòng: biểu tượng + tên viết tắt (mã), dưới là tên đầy đủ.
 * Giá trị = mã ngân hàng (VCB, ICB…). Cùng kiểu ô với app-select.
 */
@Component({
  selector: 'app-bank-select',
  standalone: false,
  templateUrl: './bank-select.html',
  styleUrl: './bank-select.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SellerBankSelect), multi: true }],
})
export class SellerBankSelect implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() inputId?: string;

  protected readonly logo = bankLogo;
  protected readonly open = signal(false);
  protected readonly q = signal('');
  protected readonly value = signal('');
  protected readonly selected = computed(() => BANK_LIST.find((b) => b.code === this.value()));
  protected readonly list = computed(() => {
    const q = plain(this.q().trim());
    return q ? BANK_LIST.filter((b) => plain(`${b.short} ${b.name} ${b.code}`).includes(q)) : BANK_LIST;
  });
  protected disabled = false;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    // bài lưu trước đây ghi tên ngắn ("Vietcombank") — đổi sang mã
    const b = BANK_LIST.find((x) => x.code === v || x.short === v);
    this.value.set(b?.code ?? '');
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

  protected toggle(): void {
    if (this.disabled) return;
    if (this.open()) return this.close();
    this.q.set('');
    this.open.set(true);
    setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.find input')?.focus());
  }

  protected choose(code: string): void {
    this.value.set(code);
    this.onChange(code);
    this.close();
  }

  private close(): void {
    this.open.set(false);
    this.onTouched();
  }

  @HostListener('keydown.escape')
  onEsc(): void {
    if (this.open()) this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close();
  }
}
