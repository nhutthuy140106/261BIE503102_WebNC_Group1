import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from './core/services/auth';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);

  /** Khôi phục trạng thái đăng nhập khi mở/tải lại trang (hỏi server, hoặc phiên mock) để header hiện đúng. */
  ngOnInit(): void {
    this.auth.checkSession().subscribe();
  }
}
