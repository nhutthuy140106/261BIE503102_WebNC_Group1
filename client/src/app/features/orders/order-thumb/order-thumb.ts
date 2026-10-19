import { Component, Input, signal } from '@angular/core';
import { KIND_LABEL, PostKind } from '../../../core/models/post';

/** Icon (symbol trong index.html) cho từng nhóm khi không có ảnh. */
const ICON: Record<string, string> = { food: 'bellhop', goods: 'bag', service: 'tap', job: 'hand' };

/**
 * Ô ảnh bên trái hàng đơn (orders.html `.th`): đơn đã đặt dùng ảnh món; việc đã nhận hoặc ảnh thiếu/lỗi
 * thì hiện ô nền kem + icon + tên nhóm.
 */
@Component({
  selector: 'app-order-thumb',
  standalone: false,
  templateUrl: './order-thumb.html',
  styleUrl: './order-thumb.css',
})
export class OrderThumb {
  private _image: string | undefined;
  protected readonly failed = signal(false);

  @Input() set image(v: string | undefined) {
    this._image = v;
    this.failed.set(false);
  }
  get image(): string | undefined {
    return this._image;
  }

  @Input() category: string | undefined;

  get showImage(): boolean {
    return !!this._image && !this.failed();
  }

  get icon(): string {
    return ICON[this.category ?? ''] ?? 'receipt';
  }

  get label(): string {
    return KIND_LABEL[this.category as PostKind] ?? 'Đơn hàng';
  }

  onError(): void {
    this.failed.set(true);
  }
}
