import { Component, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast';
import { GAME_DAILY_CAP, XuService } from '../../../core/services/xu';

/** Trang AntXu riêng: số dư, đổi voucher, voucher của bạn, cách nhận thêm Xu, lịch sử. */
@Component({
  selector: 'app-xu-page',
  standalone: false,
  templateUrl: './xu-page.html',
  styleUrl: './xu-page.css',
})
export class XuPage {
  protected readonly xu = inject(XuService);
  protected readonly gameCap = GAME_DAILY_CAP;
  private readonly toast = inject(ToastService);

  protected readonly showAll = signal(false);
  protected readonly ledger = computed(() => (this.showAll() ? this.xu.ledger() : this.xu.ledger().slice(0, 8)));
  protected readonly earnState = computed(() =>
    this.xu.earnRules.map((e) => {
      const n = this.xu.count(e.key === 'welcome' ? 'welcome' : e.key + ':');
      return { ...e, n, done: !!e.once && n > 0 };
    }),
  );

  protected redeem(cid: string, title: string, cost: number): void {
    if (this.xu.redeem(cid)) this.toast.show(`Đã đổi ${title} · −${cost} Xu`);
  }

  protected date(ms: number): string {
    return new Date(ms).toLocaleDateString('vi-VN');
  }
}
