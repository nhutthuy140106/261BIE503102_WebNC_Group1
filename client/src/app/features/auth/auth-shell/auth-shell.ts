import { Component, Input, signal } from '@angular/core';

/** Khung chung cho đăng nhập / đăng ký: nền trời, logo, thẻ có kiến dựa lưng, nút Google. */
@Component({
  selector: 'app-auth-shell',
  standalone: false,
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
})
export class AuthShell {
  /** Thẻ quá dài (form nhiều ô) thì tắt kiến để không che ô nhập. */
  @Input() showAnt = true;
  /** Thẻ rộng hơn (khi form có nhiều ô); mặc định thẻ vừa khít nội dung. */
  @Input() wide = false;
  /** Đặt thẻ giữa trang thay vì lệch trái. */
  @Input() centered = false;
  /** Nút Google chỉ có nghĩa ở bước đầu của đăng ký / ở trang đăng nhập. */
  @Input() showGoogle = true;

  protected readonly notice = signal<string | null>(null);

  /** Chưa nối Google: backend chưa có API xác thực token Google. */
  protected googleSoon(): void {
    this.notice.set('Đăng nhập bằng Google sắp có. Hiện bạn dùng số điện thoại nhé.');
  }
}
