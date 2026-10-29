import { Component, ElementRef, HostListener, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Ô chọn giờ "HH:mm" (24 giờ) thay <input type="time"> của trình duyệt cho đồng bộ với app-select.
 * Bấm ô → bảng 2 cột Giờ / Phút (phút cách 5); chọn phút thì đóng. Esc hoặc bấm ra ngoài cũng đóng.
 */
@Component({
  selector: 'app-time-input',
  standalone: false,
  templateUrl: './time-input.html',
  styleUrl: './time-input.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SellerTimeInput), multi: true }],
})
export class SellerTimeInput implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() inputId?: string;

  protected readonly hours = Array.from({ length: 24 }, (_, i) => pad(i));
  protected readonly minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5));
  protected readonly open = signal(false);
  protected readonly h = signal('');
  protected readonly m = signal('');
  protected disabled = false;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    const [h = '', m = ''] = (v ?? '').split(':');
    this.h.set(h);
    this.m.set(m);
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
    this.open.set(true);
    // cuộn tới giờ / phút đang chọn
    setTimeout(() => this.host.nativeElement.querySelectorAll<HTMLElement>('.col li.sel').forEach((li) => (li.parentElement!.scrollTop = li.offsetTop - li.parentElement!.offsetTop - 72)));
  }

  protected pickH(v: string): void {
    this.h.set(v);
    if (!this.m()) this.m.set('00');
    this.emit();
  }

  protected pickM(v: string): void {
    this.m.set(v);
    if (!this.h()) this.h.set('00');
    this.emit();
    this.close();
  }

  private emit(): void {
    this.onChange(`${this.h()}:${this.m()}`);
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
