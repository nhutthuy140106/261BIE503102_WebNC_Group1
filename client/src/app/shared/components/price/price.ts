import { Component, Input, computed, inject, signal } from '@angular/core';
import { ClockService } from '../../../core/services/clock';
import { Promo, dealAt } from '../../../core/utils/promo';

/**
 * Giá của một bài, dùng chung mọi nơi hiện giá: trong Giờ vàng hiện giá mới (cam) + giá cũ gạch ngang;
 * hết giờ tự về giá gốc nhờ đồng hồ dùng chung.
 */
@Component({
  selector: 'app-price',
  standalone: false,
  templateUrl: './price.html',
  styleUrl: './price.css',
})
export class Price {
  private readonly clock = inject(ClockService);
  private readonly _p = signal<{ price: number; promo?: Promo } | null>(null);

  @Input({ required: true }) set post(v: { price: number; promo?: Promo }) {
    this._p.set(v);
  }

  protected readonly deal = computed(() => {
    const p = this._p();
    return p ? dealAt(p, this.clock.now()) : null;
  });
  protected readonly price = computed(() => this._p()?.price ?? 0);
}
