import { Component, ElementRef, ViewChild, HostBinding, HostListener, Input, forwardRef, inject, signal } from '@angular/core';
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
  /** Kiểu nằm trong tiêu đề cột bảng: chỉ chữ + mũi tên, đang lọc thì đổi sang màu nhấn */
  @Input() @HostBinding('class.head') head = false;

  /** Danh sách được dời ra khung ngoài cùng của khu admin để bảng/thẻ cha (overflow, backdrop-filter) không cắt được */
  private menuEl?: HTMLElement;
  @ViewChild('menu') protected set menuRef(r: ElementRef<HTMLElement> | undefined) {
    this.menuEl = r?.nativeElement;
    if (this.menuEl) (this.host.nativeElement.closest('app-admin-layout') ?? document.body).appendChild(this.menuEl);
  }

  protected readonly open = signal(false);
  protected readonly value = signal<unknown>(null);
  protected readonly active = signal(-1);
  protected disabled = false;
  /** Vị trí danh sách (position: fixed) để không bị bảng/khung cha cắt mất khi cửa sổ nhỏ */
  protected pos: Record<string, string> = {};

  private onChange: (v: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  protected get selected(): AdminOption | undefined {
    const o = this.options.find((x) => x.value === this.value());
    // kiểu tiêu đề cột: chọn "tất cả" (giá trị rỗng) thì hiện lại tên cột
    return this.head && o && (o.value === '' || o.value === null) ? undefined : o;
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
    this.place();
    this.open.set(true);
    this.active.set(Math.max(0, this.options.findIndex((o) => o.value === this.value())));
  }

  /** Tính chỗ đặt danh sách theo khung nhìn: mở xuống nếu đủ chỗ, không thì mở lên; kẹp trong mép phải. */
  private place(): void {
    const el = this.host.nativeElement;
    const r = el.getBoundingClientRect();
    // khung cha có backdrop-filter/transform làm "fixed" tính theo chính nó → trừ gốc của khung đó
    let ox = 0, oy = 0;
    for (let p: HTMLElement | null = el.closest('app-admin-layout') ?? document.body; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if ((cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.transform && cs.transform !== 'none') || cs.contain.includes('paint')) {
        const pr = p.getBoundingClientRect(); ox = pr.left; oy = pr.top; break;
      }
    }
    const vw = window.innerWidth, vh = window.innerHeight, want = Math.min(280, this.options.length * 38 + 14);
    const below = vh - r.bottom - 12, above = r.top - 12;
    const down = below >= want || below >= above;
    const maxH = Math.max(120, Math.min(280, down ? below : above));
    const w = Math.max(this.head ? 190 : r.width, 0);
    const left = Math.max(8, Math.min(r.left, vw - w - 8));
    const s: Record<string, string> = { position: 'fixed', left: left - ox + 'px', right: 'auto', minWidth: w + 'px', maxHeight: maxH + 'px' };
    s['top'] = (down ? r.bottom + 6 : r.top - 6 - Math.min(want, maxH)) - oy + 'px';
    this.pos = s;
  }

  protected close(): void {
    if (this.menuEl) this.host.nativeElement.appendChild(this.menuEl); // trả về chỗ cũ để Angular gỡ đúng
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

  @HostListener('window:resize') protected onResize(): void { if (this.open()) this.place(); }
  @HostListener('window:scroll') protected onScroll(): void { if (this.open()) this.place(); }

  @HostListener('document:click', ['$event'])
  protected outside(e: Event): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node) && !this.menuEl?.contains(e.target as Node)) this.close();
  }
}
