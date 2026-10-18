import { Injectable, signal } from '@angular/core';

const KEY = 'antgo_saved';

/** Danh sách bài đã lưu (tim). Lưu id trong localStorage, dùng chung mọi trang. */
@Injectable({ providedIn: 'root' })
export class SavedService {
  readonly ids = signal<string[]>(this.read());

  has(id: string): boolean {
    return this.ids().includes(id);
  }

  toggle(id: string): void {
    this.ids.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
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
