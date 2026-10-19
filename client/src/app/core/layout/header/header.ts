import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth';
import { SavedService } from '../../services/saved';
import { XuService } from '../../services/xu';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected readonly auth = inject(AuthService);
  protected readonly saved = inject(SavedService);
  protected readonly xu = inject(XuService);
  private readonly router = inject(Router);
  /** Ô tìm luôn phản chiếu ?q= trên URL (F5, nút Back, link chia sẻ) */
  protected readonly query = signal('');
  /** Công tắc Mua | Bán: theo không gian đang ở (/seller = Bán) */
  protected readonly sellMode = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        const url = this.router.parseUrl(this.router.url);
        const first = url.root.children['primary']?.segments[0]?.path;
        this.query.set(first === 'search' ? (url.queryParams['q'] ?? '') : '');
        this.sellMode.set(first === 'seller');
      });
  }

  /** Ô tìm kiếm trên header -> /search?q=... (giữ được trạng thái khi chia sẻ URL) */
  onSearch(q: string): void {
    this.router.navigate(['/search'], { queryParams: { q: q.trim() || null }, queryParamsHandling: 'merge' });
  }

  setMode(sell: boolean): void {
    this.router.navigate([sell ? '/seller' : '/']);
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/']));
  }
}
