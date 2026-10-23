import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../../core/models/social';
import { NotificationService } from '../../../core/services/notification';
import { timeShort } from '../../../core/utils/time-short';

/** Trang Thông báo đầy đủ — cùng kiểu với khung thả xuống ở chuông: lọc Tất cả / Chưa đọc, nhóm Mới / Trước đó. */
@Component({
  selector: 'app-notification-list',
  standalone: false,
  styleUrl: './notification-list.css',
  templateUrl: './notification-list.html',
})
export class NotificationList implements OnInit {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly unread = this.service.unreadCount;
  protected readonly tab = signal<'all' | 'unread'>('all');
  protected readonly menu = signal<string | null>(null);
  protected readonly topMenu = signal(false);
  protected readonly short = timeShort;

  protected readonly groups = computed(() => {
    const list = this.service.all().filter((n) => this.tab() === 'all' || !n.read);
    const today = new Date().toDateString();
    const fresh = list.filter((n) => new Date(n.createdAt).toDateString() === today);
    const older = list.filter((n) => !fresh.includes(n));
    return [{ title: 'Hôm nay', items: fresh }, { title: 'Trước đó', items: older }].filter((g) => g.items.length);
  });

  ngOnInit(): void {
    this.service.list().subscribe({
      next: () => this.loading.set(false),
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  protected icon(n: AppNotification): string {
    return n.link.startsWith('/orders') ? '#receipt' : n.link.startsWith('/messenger') ? '#chat' : n.link.startsWith('/posts') ? '#bag' : '#bell';
  }

  open(n: AppNotification): void {
    // Chỉ điều hướng tới đường dẫn nội bộ
    const go = () => this.router.navigateByUrl(n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : '/');
    if (n.read) return void go();
    this.service.markRead([n._id]).subscribe(go);
  }

  toggleRead(n: AppNotification): void {
    this.menu.set(null);
    (n.read ? this.service.markUnread(n._id) : this.service.markRead([n._id])).subscribe({ error: () => undefined });
  }

  readAll(): void {
    this.topMenu.set(false);
    this.service.markRead().subscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (!(e.target as HTMLElement).closest('.nmore')) {
      this.menu.set(null);
      this.topMenu.set(false);
    }
  }
}
