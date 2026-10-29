import { Component, Input, computed, inject, signal } from '@angular/core';
import type { Post } from '../../../core/models/post';
import { ClockService } from '../../../core/services/clock';
import { comboSaving } from '../../../core/utils/combo';

/** Dòng "Tiết kiệm X đ" của combo trên thẻ bài (tự cập nhật khi vào/ra Giờ vàng); không hiện với bài thường. */
@Component({
  selector: 'app-combo-saving',
  standalone: false,
  template: `@if (saving() > 0) { <span class="sv">Tiết kiệm {{ saving() | vnd }}</span> }`,
  styles: [`.sv { display: inline-block; font-size: 12px; font-weight: 600; color: #1f7a4d; }`],
})
export class ComboSaving {
  private readonly clock = inject(ClockService);
  private readonly _p = signal<Pick<Post, 'price' | 'promo' | 'combo'> | null>(null);
  @Input({ required: true }) set post(v: Pick<Post, 'price' | 'promo' | 'combo'>) {
    this._p.set(v);
  }
  protected readonly saving = computed(() => {
    const p = this._p();
    return p ? comboSaving(p, this.clock.now()) : 0;
  });
}
