import { Component, ElementRef, HostListener, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Ô chọn một giá trị trong danh sách (thay <select> gốc của trình duyệt cho đẹp và đồng nhất).
 * Dùng được với form: `<app-select formControlName="..." [options]="..." placeholder="..." />`.
 * Bàn phím: Enter / Space mở, ↑ ↓ chọn, Enter chốt, Esc đóng.
 */
@Component({
  selector: 'app-select',
  standalone: false,
  templateUrl: './select.html',
  styleUrl: './select.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
})
export class Select implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Chọn…';
  @Input() invalid = false;
  /** id gắn vào nút để <label for> trỏ tới được */
  @Input() inputId?: string;

  protected readonly open = signal(false);
  protected readonly value = signal('');
  protected readonly active = signal(-1);
  protected disabled = false;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected get selected(): SelectOption | undefined {
    return this.options.find((o) => o.value === this.value());
  }

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

  protected toggle(): void {
    if (this.disabled) return;
    if (this.open()) return this.close();
    this.open.set(true);
    this.active.set(Math.max(0, this.options.findIndex((o) => o.value === this.value())));
  }

  protected choose(o: SelectOption): void {
    this.value.set(o.value);
    this.onChange(o.value);
    this.close();
  }

  private close(): void {
    this.open.set(false);
    this.onTouched();
  }

  protected onKey(e: KeyboardEvent): void {
    const last = this.options.length - 1;
    if (e.key === 'Escape') return this.close();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.open()) return this.toggle();
      this.active.update((i) => Math.min(last, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if ((e.key === 'Enter' || e.key === ' ') && this.open()) {
      e.preventDefault();
      const o = this.options[this.active()];
      if (o) this.choose(o);
    }
  }

  /** Bấm ra ngoài thì đóng danh sách. */
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close();
  }
}
