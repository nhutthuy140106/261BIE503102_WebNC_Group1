import { Injectable, signal } from '@angular/core';

/** Nút đi kèm thông báo, ví dụ "Hoàn tác" */
export interface ToastAction {
  label: string;
  run: () => void;
}

/** Thông báo nhỏ nổi ở đáy màn hình (như toast của bản mẫu). Một lúc chỉ hiện một dòng, có thể kèm một nút. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly text = signal('');
  readonly shown = signal(false);
  readonly action = signal<ToastAction | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(text: string, ms = 2400, action: ToastAction | null = null): void {
    this.text.set(text);
    this.action.set(action);
    this.shown.set(true);
    clearTimeout(this.timer);
    // có nút thì để lâu hơn cho kịp bấm
    this.timer = setTimeout(() => this.hide(), action ? Math.max(ms, 5000) : ms);
  }

  /** Bấm nút trên thông báo: chạy việc kèm theo rồi ẩn */
  runAction(): void {
    const a = this.action();
    this.hide();
    a?.run();
  }

  hide(): void {
    clearTimeout(this.timer);
    this.shown.set(false);
    this.action.set(null);
  }
}
