import { Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AreaService } from '../../services/area';
import { AuthPromptService } from '../../services/auth-prompt';
import { AuthService } from '../../services/auth';
import { DrawerService } from '../../services/drawer';
import { NotificationService } from '../../services/notification';
import { SavedService } from '../../services/saved';
import { SearchUiService } from '../../services/search-ui';
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
  protected readonly area = inject(AreaService);
  protected readonly notifications = inject(NotificationService);
  protected readonly search = inject(SearchUiService);
  private readonly drawer = inject(DrawerService);
  private readonly prompt = inject(AuthPromptService);
  private readonly router = inject(Router);
  /** Công tắc Mua | Bán: theo không gian đang ở (/seller = Bán) */
  protected readonly sellMode = signal(false);
  /** Đang ở trang chủ: ô gọn ẩn khi ô lớn còn thấy */
  protected readonly onHome = signal(false);
  /** Ô tìm trên header chỉ hiện ở trang chủ và trang kết quả tìm kiếm */
  protected readonly noSearch = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        const url = this.router.parseUrl(this.router.url);
        const first = url.root.children['primary']?.segments[0]?.path;
        // ô tìm luôn phản chiếu ?q= trên URL (F5, nút Back, link chia sẻ); trang khác thì xóa chữ cũ
        this.search.text.set(first === 'search' ? (url.queryParams['q'] ?? '') : '');
        this.sellMode.set(first === 'seller');
        this.onHome.set(first === undefined);
        this.noSearch.set(!(first === undefined || first === 'search'));
      });
    // đăng nhập xong (hoặc tải lại trang) thì nạp thông báo để chấm chuông đếm đúng
    effect(() => {
      if (this.auth.isLoggedIn()) this.notifications.list().subscribe({ error: () => undefined });
    });
  }

  /** Ô tìm kiếm trên header -> /search?q=... (giữ được trạng thái khi chia sẻ URL) */
  onSearch(): void {
    this.router.navigate(['/search'], { queryParams: { q: this.search.text().trim() || null }, queryParamsHandling: 'merge' });
  }

  setMode(sell: boolean): void {
    if (sell && !this.prompt.require('sell')) return;
    this.router.navigate([sell ? '/seller' : '/']);
  }

  openSaved(): void {
    if (this.prompt.require('save')) this.drawer.show('saved');
  }

  openXu(): void {
    if (this.prompt.require('xu')) this.drawer.show('xu');
  }
}
