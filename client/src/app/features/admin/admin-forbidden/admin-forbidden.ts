import { Component } from '@angular/core';

/** 403: tài khoản thường vào /admin. */
@Component({
  selector: 'app-admin-forbidden',
  standalone: false,
  template: `
    <section class="f">
      <h1>Bạn không có quyền vào khu Quản trị</h1>
      <p>Mục này chỉ dành cho tài khoản quản trị của AntGo. Nếu bạn nghĩ đây là nhầm lẫn, hãy nhắn đội hỗ trợ.</p>
      <a routerLink="/" class="go">Về trang chủ</a>
    </section>
  `,
  styles: [
    `
      .f { max-width: 520px; margin: 60px auto; text-align: center; display: grid; gap: 10px; }
      h1 { margin: 0; font-size: 24px; color: #22304A; }
      p { margin: 0; color: #4b5563; }
      .go { justify-self: center; margin-top: 8px; padding: 10px 22px; border-radius: 10px; background: #D85A1C; color: #fff; font-weight: 700; }
    `,
  ],
})
export class AdminForbidden {}
