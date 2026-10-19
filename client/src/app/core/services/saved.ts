import { Injectable, inject, signal } from '@angular/core';
import { useMock } from '../config/api.config';
import { ApiService } from './api';

const KEY = 'antgo_saved';

/**
 * Bài đã lưu (tim). Mock: id trong localStorage. API thật: GET/PUT/DELETE /me/saved.
 * Cập nhật lạc quan: đổi UI ngay, lỗi thì hoàn lại.
 */
@Injectable({ providedIn: 'root' })
export class SavedService {
  private readonly api = inject(ApiService);
  readonly ids = signal<string[]>(useMock('saved') ? this.read() : []);

  constructor() {
    if (!useMock('saved')) {
      this.api.get<{ postId: string }[]>('/me/saved').subscribe({
        next: (rows) => this.ids.set(rows.map((r) => r.postId)),
        error: () => this.ids.set([]), // chưa đăng nhập hoặc lỗi: danh sách rỗng
      });
    }
  }

  has(id: string): boolean {
    return this.ids().includes(id);
  }

  toggle(id: string): void {
    const was = this.has(id);
    this.ids.update((ids) => (was ? ids.filter((x) => x !== id) : [...ids, id]));
    if (useMock('saved')) return this.write();
    const req = was ? this.api.delete(`/me/saved/${id}`) : this.api.put<unknown>(`/me/saved/${id}`, {});
    req.subscribe({
      error: () => this.ids.update((ids) => (was ? [...ids, id] : ids.filter((x) => x !== id))),
    });
  }

  private write(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.ids()));
    } catch {
      /* trình duyệt chặn lưu trữ: bỏ qua, trạng thái vẫn đúng trong phiên */
    }
  }

  private read(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
}
