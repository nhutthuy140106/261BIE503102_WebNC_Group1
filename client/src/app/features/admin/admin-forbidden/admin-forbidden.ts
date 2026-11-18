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
      :host { display: block; min-height: 100vh; background: radial-gradient(700px 400px at 85% -5%, rgba(240, 121, 74, .14), transparent 70%), #0B1220; padding: 1px 16px; }
      .f { max-width: 520px; margin: 90px auto; text-align: center; display: grid; gap: 10px; }
      h1 { margin: 0; font-size: 26px; font-weight: 800; color: #E9EEF7; }
      p { margin: 0; color: #8C9AB5; }
      .go { justify-self: center; margin-top: 8px; padding: 10px 22px; border-radius: 10px; background: linear-gradient(180deg, #F58A5B, #E8662F); color: #fff; font-weight: 700; }
    `,
  ],
})
export class AdminForbidden {}
