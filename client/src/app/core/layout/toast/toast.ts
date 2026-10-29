import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast';

/** Dòng thông báo nhỏ nổi ở đáy màn hình, đặt một lần trong app.html. Có thể kèm một nút (vd. "Hoàn tác"). */
@Component({
  selector: 'app-toast',
  standalone: false,
  template: `<div class="app-toast" [class.show]="toast.shown()" [class.act]="toast.action()" role="status" aria-live="polite">
    <span>{{ toast.text() }}</span>
    @if (toast.action(); as a) { <button type="button" (click)="toast.runAction()">{{ a.label }}</button> }
  </div>`,
  styleUrl: './toast.css',
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
