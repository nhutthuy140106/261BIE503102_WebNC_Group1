import { Component, Input } from '@angular/core';

/** Khung chờ (skeleton) giữ đúng bố cục lúc tải: `cards` = lưới thẻ bài, `rows` = danh sách dòng. Dùng thay con kiến ở các trang danh sách. */
@Component({
  selector: 'app-skeleton',
  standalone: false,
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  @Input() variant: 'cards' | 'rows' = 'cards';
  @Input() count = 8;
  get items(): number[] {
    return Array.from({ length: Math.max(1, Math.min(this.count, 24)) }, (_, i) => i);
  }
}
