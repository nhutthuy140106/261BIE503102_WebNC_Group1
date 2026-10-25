import { Component, HostBinding, Input } from '@angular/core';

/** Đang tải: con kiến bò dọc một vệt chân, kèm dòng chữ. Dùng thay cho chữ "Đang tải…" trơn. */
@Component({
  selector: 'app-loader',
  standalone: false,
  templateUrl: './loader.html',
  styleUrl: './loader.css',
})
export class Loader {
  @Input() label = 'Đang tải…';
  /** Bản gọn (ít khoảng đệm) để đặt chen giữa nội dung, ví dụ lúc quay món. */
  @HostBinding('class.compact') @Input() compact = false;
}
