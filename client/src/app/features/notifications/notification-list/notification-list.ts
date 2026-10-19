import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../../core/models/social';
import { NotificationService } from '../../../core/services/notification';
import { formatDateTime } from '../../../core/utils/status-label';

@Component({
  selector: 'app-notification-list',
  standalone: false,
  styleUrl: './notification-list.css',
  templateUrl: './notification-list.html',
})
export class NotificationList implements OnInit {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly items = signal<AppNotification[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly fmt = formatDateTime;
  protected readonly unread = this.service.unreadCount;

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  open(n: AppNotification): void {
    // Chỉ điều hướng tới đường dẫn nội bộ
    const go = () => this.router.navigateByUrl(n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : '/');
    if (n.read) return void go();
    this.service.markRead([n._id]).subscribe(() => {
      this.items.update((l) => l.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      go();
    });
  }

  readAll(): void {
    this.service.markRead().subscribe(() => this.items.update((l) => l.map((x) => ({ ...x, read: true }))));
  }
}
