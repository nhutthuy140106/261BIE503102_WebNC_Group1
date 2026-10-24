import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
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
import { timeShort } from '../../utils/time-short';
import { AppNotification } from '../../models/social';

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
  /** Menu khi ở khu Bán (thay Trang chủ · Đơn hàng · Messenger của phía Mua) */
  protected readonly sellLinks = [
    { path: '/seller', icon: 'sun', label: 'Hôm nay', exact: true },
    { path: '/seller/orders', icon: 'receipt', label: 'Giao dịch', exact: false },
    { path: '/seller/calendar', icon: 'calendar', label: 'Lịch', exact: false },
    { path: '/seller/posts', icon: 'store', label: 'Bài đăng', exact: false },
    { path: '/seller/insights', icon: 'chart', label: 'Hiệu quả', exact: false },
    { path: '/seller/messenger', icon: 'chat', label: 'Messenger', exact: false },
  ];

  // ----- khung thông báo thả xuống từ chuông (kiểu Facebook) -----
  protected readonly notifOpen = signal(false);
  protected readonly notifTab = signal<'all' | 'unread'>('all');
  protected readonly short = timeShort;
  /** Thông báo đang xem theo tab, chia nhóm Hôm nay / Trước đó */
  protected readonly notifGroups = computed(() => {
    const list = this.notifications.all().filter((n) => this.notifTab() === 'all' || !n.read);
    // "Hôm nay" = trong 12 giờ gần đây (như Facebook: 5 giờ trước vẫn là hôm nay, 23 giờ đã là trước đó)
    const fresh = list.filter((n) => Date.now() - new Date(n.createdAt).getTime() < 12 * 3600 * 1000);
    const older = list.filter((n) => !fresh.includes(n));
    return [{ title: 'Hôm nay', items: fresh }, { title: 'Trước đó', items: older }].filter((g) => g.items.length);
  });

  protected notifIcon(n: AppNotification): string {
    return n.link.startsWith('/orders') ? '#receipt' : n.link.startsWith('/messenger') ? '#chat' : n.link.startsWith('/posts') ? '#bag' : '#bell';
  }

  protected toggleNotif(): void {
    this.notifOpen.update((v) => !v);
    if (this.notifOpen()) this.notifications.list().subscribe({ error: () => undefined });
  }

  protected openNotif(n: AppNotification): void {
    this.notifOpen.set(false);
    this.nMenu.set(null);
    if (!n.read) this.notifications.markRead([n._id]).subscribe({ error: () => undefined });
    this.router.navigateByUrl(n.link);
  }

  /** Menu "⋯" của một thông báo (id thông báo đang mở menu) */
  protected readonly nMenu = signal<string | null>(null);

  /** Menu mở lên trên khi nút ⋯ nằm sát đáy danh sách (khỏi bị cắt bởi vùng cuộn và nút Xem tất cả) */
  protected readonly nUp = signal(false);

  protected toggleNMenu(n: AppNotification, e: Event): void {
    if (this.nMenu() === n._id) return void this.nMenu.set(null);
    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const box = (e.currentTarget as HTMLElement).closest('.nbody')?.getBoundingClientRect();
    this.nUp.set(!!box && box.bottom - btn.bottom < 70);
    this.nMenu.set(n._id);
  }

  protected toggleRead(n: AppNotification): void {
    this.nMenu.set(null);
    (n.read ? this.notifications.markUnread(n._id) : this.notifications.markRead([n._id])).subscribe({ error: () => undefined });
  }

  protected readonly nTop = signal(false);

  // ----- menu thả xuống ở ảnh đại diện -----
  protected readonly userOpen = signal(false);

  protected logout(): void {
    this.userOpen.set(false);
    this.auth.logout().subscribe({ complete: () => this.router.navigate(['/']), error: () => this.router.navigate(['/']) });
  }

  protected readAll(): void {
    this.nTop.set(false);
    this.notifications.markRead().subscribe({ error: () => undefined });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const el = e.target as HTMLElement;
    if (this.notifOpen() && !el.closest('.nwrap')) this.notifOpen.set(false);
    if (this.userOpen() && !el.closest('.awrap')) this.userOpen.set(false);
    if (!el.closest('.nmore')) {
      this.nMenu.set(null);
      this.nTop.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.userOpen.set(false);
    this.notifOpen.set(false);
    this.nMenu.set(null);
  }
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
