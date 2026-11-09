import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { GardenService, TREE_DAY_REWARD, TREE_FULL, TREE_REWARD } from '../../../core/services/garden';
import { ToastService } from '../../../core/services/toast';
import { XuService } from '../../../core/services/xu';

/** 7 giai đoạn của cây = 7 ngày: hạt giống + 6 lần tưới (mỗi ngày 1 lần), ngày thứ 7 thu hoạch. */
const STAGES = ['Hạt giống', 'Nảy mầm', 'Cây con', 'Cây nhỏ', 'Cây lớn', 'Ra hoa', 'Có trái'];

/** Chăm cây: màn hình một trang, cây lớn dần theo ảnh từng giai đoạn; nút tưới nước mỗi ngày một lần. */
@Component({
  selector: 'app-tree-game',
  standalone: false,
  templateUrl: './tree-game.html',
  styleUrl: './tree-game.css',
})
export class TreeGame implements OnInit, OnDestroy {
  protected readonly garden = inject(GardenService);
  private readonly xu = inject(XuService);
  private readonly toast = inject(ToastService);
  protected readonly reward = TREE_REWARD;
  protected readonly dayReward = TREE_DAY_REWARD;
  protected readonly stages = STAGES;
  protected readonly days = [1, 2, 3, 4, 5, 6, 7];
  protected readonly watering = signal(false);
  /** Vị trí giọt nước rơi (% bề ngang cây) + độ trễ, cố định để mỗi lần tưới giống nhau */
  protected readonly drops = [12, 28, 44, 58, 72, 86, 20, 50, 66, 36].map((x, i) => ({ x, d: (i % 5) * 0.12 + (i > 4 ? 0.06 : 0) }));
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    document.body.classList.add('no-footer', 'no-chat'); // vừa đúng một màn hình
  }

  ngOnDestroy(): void {
    document.body.classList.remove('no-footer', 'no-chat');
    clearTimeout(this.timer);
  }

  /** Giai đoạn đang hiển thị, 0 (hạt giống) → 6 (có trái) */
  protected stage(): number {
    return Math.min(this.garden.tree(), TREE_FULL);
  }

  protected state(day: number): 'done' | 'today' | 'next' | 'todo' {
    const t = this.garden.tree();
    if (day <= t) return 'done';
    if (day === t + 1) return this.garden.waterLeft() > 0 || t >= TREE_FULL ? 'today' : 'next';
    return 'todo';
  }

  protected water(): void {
    if (!this.garden.water()) return;
    this.watering.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.watering.set(false), 1600);
    const got = this.xu.earnGame(TREE_DAY_REWARD, `Tưới cây ngày ${this.garden.tree()}`, `tuoi-nuoc-${this.garden.harvests()}-${this.garden.tree()}`);
    if (got > 0) this.toast.show(`+${got} Xu · Cây đã được tưới (${STAGES[this.stage()]})`);
    else this.toast.show(`Cây đã được tưới · ${STAGES[this.stage()]}`);
  }

  /** Thử nghiệm: coi như đã sang ngày mới để tưới/thu hoạch tiếp mà không phải chờ */
  protected nextDay(): void {
    this.garden.simulateNextDay();
  }

  protected harvest(): void {
    const n = this.garden.harvest();
    if (!n) return;
    const got = this.xu.earnGame(TREE_REWARD, 'Thu hoạch cây xoài', 'tuoi-cay-' + n);
    this.toast.show(got > 0 ? `+${got} Xu · Thu hoạch cây xoài` : 'Hôm nay bạn đã nhận đủ Xu từ game, mai quay lại nhé');
  }
}
