import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppNotification } from '../models/social';
import { notificationFromApi } from '../utils/api-mappers';
import { ApiService } from './api';
import { MockDb } from './mock-db';

const COLLECTION = 'notifications';

/** Mock: `agoMin` (đã cách đây bao nhiêu phút) -> createdAt thật, để nhóm "Hôm nay" luôn có thông báo mẫu. */
function fixAgo(rows: (AppNotification & { agoMin?: number })[]): AppNotification[] {
  return rows
    .map(({ agoMin, ...n }) => (agoMin === undefined ? n : { ...n, createdAt: new Date(Date.now() - agoMin * 60000).toISOString() }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Thông báo + chấm chuông: `unreadCount` đếm từ đúng danh sách, không dựng số giả. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);

  private readonly items = signal<AppNotification[]>([]);
  /** Danh sách đã nạp (cho khung thả xuống ở chuông) */
  readonly all = this.items.asReadonly();
  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  list(): Observable<AppNotification[]> {
    const src = useMock('notification') ? this.db.list<AppNotification>(COLLECTION).pipe(map(fixAgo)) : this.api.get<unknown[]>('/notifications', { limit: 50 }).pipe(map((l) => l.map(notificationFromApi)));
    return src.pipe(tap((rows) => this.items.set(rows)));
  }

  /**
   * Thêm một thông báo mới cho chính người dùng (mock). Khi có máy chủ thật, máy chủ tự tạo thông báo khi đặt đơn,
   * FE chỉ cần gọi lại `list()` — nên hàm này không làm gì ở chế độ API thật.
   */
  push(text: string, link: string): void {
    if (!useMock('notification')) return;
    this.db.list<AppNotification>(COLLECTION).pipe(map(fixAgo)).subscribe((rows) => {
      const n: AppNotification = { _id: this.db.newId(), text, link, read: false, createdAt: new Date().toISOString() };
      const next = [n, ...rows];
      this.db.save(COLLECTION, next);
      this.items.set(next);
    });
  }

  /** Đánh dấu chưa đọc một thông báo (chỉ phía mình). API thật chưa có điểm cuối riêng nên chỉ lưu ở mock. */
  markUnread(id: string): Observable<void> {
    if (!useMock('notification')) return of(undefined);
    return this.db.list<AppNotification>(COLLECTION).pipe(map(fixAgo)).pipe(
      map((rows) => {
        const next = rows.map((n) => (n._id === id ? { ...n, read: false } : n));
        this.db.save(COLLECTION, next);
        this.items.set(next);
      }),
    );
  }

  /** Đánh dấu đã đọc: danh sách `ids`, bỏ trống = tất cả. */
  markRead(ids?: string[]): Observable<void> {
    if (!useMock('notification')) return this.api.post<void>('/notifications/read', { ids });
    return this.db.list<AppNotification>(COLLECTION).pipe(map(fixAgo)).pipe(
      map((rows) => {
        const next = rows.map((n) => (!ids || ids.includes(n._id) ? { ...n, read: true } : n));
        this.db.save(COLLECTION, next);
        this.items.set(next);
      }),
    );
  }
}
