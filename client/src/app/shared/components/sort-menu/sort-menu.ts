import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';

export interface SortOption {
  key: string;
  label: string;
}

/**
 * Nút "Sắp xếp: Gần nhất ⌄" mở danh sách chọn — cùng kiểu với ô sắp xếp của trang chủ (thay <select> gốc của trình duyệt).
 * `bar` = bản nhỏ nằm trong thanh sắp xếp của trang tìm kiếm (nền trắng, đang chọn thì nền cam).
 */
@Component({
  selector: 'app-sort-menu',
  standalone: false,
  templateUrl: './sort-menu.html',
  styleUrl: './sort-menu.css',
})
export class SortMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() options: SortOption[] = [];
  @Input() value = '';
  @Input() prefix = 'Sắp xếp:';
  /** Chữ hiện khi chưa chọn mục nào (value không nằm trong options) */
  @Input() placeholder = '';
  @Input() bar = false;
  @Output() valueChange = new EventEmitter<string>();

  protected readonly open = signal(false);

  protected get current(): SortOption | undefined {
    return this.options.find((o) => o.key === this.value);
  }

  protected choose(o: SortOption): void {
    this.open.set(false);
    this.valueChange.emit(o.key);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (!this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.open.set(false);
  }
}
