import { Injectable, signal } from '@angular/core';

export type DrawerName = 'saved' | 'xu';

/** Ngăn kéo bên phải (Đã lưu, AntXu): một lúc chỉ mở một ngăn. */
@Injectable({ providedIn: 'root' })
export class DrawerService {
  readonly open = signal<DrawerName | null>(null);

  show(name: DrawerName): void {
    this.open.set(name);
  }

  close(): void {
    this.open.set(null);
  }
}
