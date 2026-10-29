import { Injectable, signal } from '@angular/core';
import { AREAS } from '../config/areas';

const KEY = 'antgo_area';

/**
 * Khu đang xem (nút "Khu vực" trên header): bài trong khu này được ưu tiên khi tìm kiếm.
 * Mặc định là khu người dùng đã chọn lúc đăng ký (chưa có thì khu đầu tiên trong danh sách).
 */
@Injectable({ providedIn: 'root' })
export class AreaService {
  readonly names = AREAS.map((a) => a.name);
  readonly current = signal<string>(this.read());
  readonly dialogOpen = signal(false);

  set(name: string): void {
    if (!this.names.includes(name)) return;
    this.current.set(name);
    try {
      localStorage.setItem(KEY, name);
    } catch {
      /* bỏ qua */
    }
  }

  open(): void {
    this.dialogOpen.set(true);
  }

  close(): void {
    this.dialogOpen.set(false);
  }

  private read(): string {
    try {
      const v = localStorage.getItem(KEY);
      if (v && AREAS.some((a) => a.name === v)) return v;
    } catch {
      /* dùng mặc định */
    }
    return AREAS[2].name; // Bcons: khu của tài khoản mẫu
  }
}
