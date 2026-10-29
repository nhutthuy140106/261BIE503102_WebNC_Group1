import { Component, inject } from '@angular/core';
import { GardenService, TREE_FULL, TREE_REWARD, WATER_PER_DAY } from '../../../core/services/garden';
import { ToastService } from '../../../core/services/toast';
import { XuService } from '../../../core/services/xu';

/** Tưới cây: chăm cây xoài lớn dần (3 lần tưới/ngày), đủ lớn thì thu hoạch nhận Xu (cùng trần 30 Xu/ngày của game). */
@Component({
  selector: 'app-tree-game',
  standalone: false,
  templateUrl: './tree-game.html',
  styleUrl: './tree-game.css',
})
export class TreeGame {
  protected readonly garden = inject(GardenService);
  protected readonly xu = inject(XuService);
  private readonly toast = inject(ToastService);
  protected readonly full = TREE_FULL;
  protected readonly perDay = WATER_PER_DAY;
  protected readonly reward = TREE_REWARD;
  protected splash = false;

  /** Giai đoạn hiển thị 0 (hạt) → 4 (có trái) */
  protected stage(): number {
    const t = this.garden.tree();
    return t >= this.full ? 4 : t >= 6 ? 3 : t >= 3 ? 2 : t >= 1 ? 1 : 0;
  }

  protected water(): void {
    if (!this.garden.water()) {
      this.toast.show(this.garden.waterLeft() <= 0 ? 'Hôm nay bạn đã tưới đủ rồi, mai quay lại nhé' : 'Cây đã đủ lớn, hãy thu hoạch');
      return;
    }
    this.splash = true;
    setTimeout(() => (this.splash = false), 700);
  }

  protected harvest(): void {
    const n = this.garden.harvest();
    if (!n) return;
    const got = this.xu.earnGame(TREE_REWARD, 'Thu hoạch cây xoài', 'tuoi-cay-' + n);
    if (got > 0) this.toast.show(`+${got} Xu · Thu hoạch cây xoài`);
  }
}
