import { Injectable, inject, signal } from '@angular/core';
import { useMock } from '../config/api.config';
import { ApiService } from './api';
import { AuthPromptService } from './auth-prompt';
import { MOCK_SAVED_SEED } from '../config/mock-seed';
import { ToastService } from './toast';

const KEY = 'antgo_saved';

/**
 * Bài đã lưu (tim). Mock: id trong localStorage. API thật: GET/PUT/DELETE /me/saved.
 * Cập nhật lạc quan: đổi UI ngay, lỗi thì hoàn lại. Khách bấm ♡ → sang trang đăng nhập,
 * đăng nhập xong quay về và lưu bài đó (applyResume).
 */
@Injectable({ providedIn: 'root' })
export class SavedService {
  private readonly api = inject(ApiService);
  private readonly prompt = inject(AuthPromptService);
  private readonly toast = inject(ToastService);
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
    if (!this.prompt.require('save', { type: 'save', payload: id })) return;
    this.apply(id);
  }

  /** Về lại sau khi đăng nhập: lưu bài khách đã bấm ♡ trước đó. */
  applyResume(): void {
    const id = this.prompt.takeResume<string>('save');
    if (id && !this.has(id)) {
      this.apply(id);
      this.toast.show('Đã lưu bài');
    }
  }

  /** Bỏ lưu một bài (ngăn kéo, trang Tôi). */
  remove(id: string): void {
    if (this.has(id)) this.apply(id);
  }

  private apply(id: string): void {
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
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        // lần đầu: vài bài mẫu để tim header, ngăn kéo và trang Tôi có nội dung
        localStorage.setItem(KEY, JSON.stringify(MOCK_SAVED_SEED));
        return [...MOCK_SAVED_SEED];
      }
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
}
