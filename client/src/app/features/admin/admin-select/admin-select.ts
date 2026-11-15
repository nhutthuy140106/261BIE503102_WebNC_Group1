import { Component, ElementRef, HostListener, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface AdminOption {
  value: unknown;
  label: string;
}

/**
 * Ô chọn của khu Quản trị (thay <select> gốc của trình duyệt, vốn hiện danh sách trắng xấu trên nền tối).
 * Dùng với ngModel: `<app-admin-select [options]="..." name="x" [(ngModel)]="x" />`. Giá trị có thể là chữ hoặc số.
 * Bàn phím: Enter / Space mở, ↑ ↓ chọn, Enter chốt, Esc đóng.
 */
@Component({
  selector: 'app-admin-select',
  standalone: false,
  templateUrl: './admin-select.html',
  styleUrl: './admin-select.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AdminSelect), multi: true }],
})
export class AdminSelect implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() options: AdminOption[] = [];
  @Input() placeholder = 'Chọn…';
  @Input() inputId?: string;
  @Input() ariaLabel?: string;

  protected readonly open = signal(false);
  protected readonly value = signal<unknown>(null);
  protected readonly active = signal(-1);
  protected disabled = false;

  private onChange: (v: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  protected get selected(): AdminOption | undefined {
    return this.options.find((o) => o.value === this.value());
  }

  writeValue(v: unknown): void {
    this.value.set(v);
  }
  registerOnChange(fn: (v: unknown) => void): void {
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

  protected close(): void {
    this.open.set(false);
    this.onTouched();
  }

  protected choose(o: AdminOption): void {
    this.value.set(o.value);
    this.onChange(o.value);
    this.close();
  }

  protected onKey(e: KeyboardEvent): void {
    if (this.disabled) return;
    const n = this.options.length;
    if (!this.open()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active.update((i) => (i + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active.update((i) => (i - 1 + n) % n); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const o = this.options[this.active()]; if (o) this.choose(o); }
    else if (e.key === 'Escape' || e.key === 'Tab') this.close();
  }

  @HostListener('document:click', ['$event'])
  protected outside(e: Event): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close();
  }
}
