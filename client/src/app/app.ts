import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Trang giới thiệu và đăng nhập tự có bố cục toàn màn hình nên không dùng header/footer chung. */
  private static readonly BARE_PAGES = ['/welcome', '/auth/login', '/auth/register'];
  protected readonly bare = signal(false);

  /** Khôi phục trạng thái đăng nhập khi mở/tải lại trang (hỏi server, hoặc phiên mock) để header hiện đúng. */
  ngOnInit(): void {
    this.auth.checkSession().subscribe();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.bare.set(App.BARE_PAGES.includes(e.urlAfterRedirects.split(/[?#]/)[0])));
  }
}
