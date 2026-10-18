import { CanDeactivateFn } from '@angular/router';

export interface CanComponentDeactivate {
  /** true nếu form đang nhập dở và chưa lưu */
  hasUnsavedChanges(): boolean;
}

/** Cảnh báo khi rời form đang nhập dở (đăng bài, đặt đơn…). */
export const pendingChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) =>
  !component.hasUnsavedChanges() ||
  window.confirm('Bạn có thay đổi chưa lưu. Rời trang sẽ mất dữ liệu đang nhập. Tiếp tục?');
