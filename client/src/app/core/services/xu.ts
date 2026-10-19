import { Injectable, signal } from '@angular/core';

/**
 * Trạng thái mở/đóng ngăn kéo AntXu (dùng chung header và ngăn kéo).
 * Số dư lấy từ `AuthService.currentUser().xu`; quy tắc nhận/đổi Xu chưa chốt (decisions Q11) nên
 * ngăn kéo chỉ hiện số dư và cách dùng Xu ở bước đặt hàng — không dựng số liệu giả.
 */
@Injectable({ providedIn: 'root' })
export class XuService {
  readonly open = signal(false);

  show(): void {
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
  }
}
