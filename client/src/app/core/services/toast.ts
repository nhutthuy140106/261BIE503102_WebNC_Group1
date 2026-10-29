import { Injectable, signal } from '@angular/core';

/** Thông báo nhỏ nổi ở đáy màn hình (như toast của bản mẫu). Một lúc chỉ hiện một dòng. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly text = signal('');
  readonly shown = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  show(text: string, ms = 2400): void {
    this.text.set(text);
    this.shown.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.shown.set(false), ms);
  }
}
