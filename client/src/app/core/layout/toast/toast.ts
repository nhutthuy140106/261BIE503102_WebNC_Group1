import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast';

/** Dòng thông báo nhỏ nổi ở đáy màn hình, đặt một lần trong app.html. */
@Component({
  selector: 'app-toast',
  standalone: false,
  template: `<div class="app-toast" [class.show]="toast.shown()" role="status" aria-live="polite">{{ toast.text() }}</div>`,
  styleUrl: './toast.css',
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
