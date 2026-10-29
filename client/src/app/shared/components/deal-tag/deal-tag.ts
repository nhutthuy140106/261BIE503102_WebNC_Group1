import { Component, Input, computed, inject, signal } from '@angular/core';
import { ClockService } from '../../../core/services/clock';
import { Promo, dealAt } from '../../../core/utils/promo';

/** Nhãn "Giờ vàng −20%" trên thẻ bài; tự ẩn khi hết giờ. */
@Component({
  selector: 'app-deal-tag',
  standalone: false,
  template: `@if (deal(); as d) { <span class="tag">{{ d.label }}</span> }`,
  styles: [`.tag { display: inline-block; padding: 3px 9px; border-radius: 999px; background: #D85A1C; color: #fff; font-size: 11.5px; font-weight: 700; line-height: 1.3; }`],
})
export class DealTag {
  private readonly clock = inject(ClockService);
  private readonly _p = signal<{ price: number; promo?: Promo } | null>(null);
  @Input({ required: true }) set post(v: { price: number; promo?: Promo }) {
    this._p.set(v);
  }
  protected readonly deal = computed(() => {
    const p = this._p();
    return p ? dealAt(p, this.clock.now()) : null;
  });
}
