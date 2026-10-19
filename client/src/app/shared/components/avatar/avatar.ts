import { Component, Input, signal } from '@angular/core';

/** Chữ cái đầu để hiện khi chưa có ảnh: "Ngọc Thủy" → "N", bỏ khoảng trắng, rỗng → "?". */
export function initialOf(name: string | null | undefined): string {
  const t = (name ?? '').trim();
  return t ? t.charAt(0).toLocaleUpperCase('vi') : '?';
}

/**
 * Ảnh đại diện tròn. Không có `src` hoặc ảnh lỗi → tự về chữ cái đầu của `name`, kích thước không đổi.
 * `size` tính bằng px.
 */
@Component({
  selector: 'app-avatar',
  standalone: false,
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
  private _src: string | null | undefined;
  protected readonly failed = signal(false);

  @Input() set src(v: string | null | undefined) {
    this._src = v;
    this.failed.set(false); // đổi ảnh thì thử tải lại
  }
  get src(): string | null | undefined {
    return this._src;
  }

  @Input() name: string | null | undefined = '';
  @Input() size = 36;

  get showImage(): boolean {
    return !!this._src && !this.failed();
  }

  get initial(): string {
    return initialOf(this.name);
  }

  onError(): void {
    this.failed.set(true);
  }
}
