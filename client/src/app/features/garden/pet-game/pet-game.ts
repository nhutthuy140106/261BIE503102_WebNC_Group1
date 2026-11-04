import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { GardenService, OUTFITS, OUTFIT_TIERS, PET_FINAL_REWARD, PET_LAST, PET_REWARD, PET_STAGES, PET_TASKS } from '../../../core/services/garden';
import { OrderService } from '../../../core/services/order';
import { ToastService } from '../../../core/services/toast';
import { XuService } from '../../../core/services/xu';

/**
 * Nuôi thú cưng: 7 giai đoạn (trứng → kiến trưởng thành). Mỗi ngày làm đủ 3 việc rồi nhận thưởng thì bé lớn thêm một giai đoạn;
 * trưởng thành thì thưởng thêm một lần, sau đó bé ở lại làm bạn (mỗi ngày làm đủ việc vẫn nhận +1 Xu). Cùng trần 30 Xu/ngày của game.
 */
@Component({
  selector: 'app-pet-game',
  standalone: false,
  templateUrl: './pet-game.html',
  styleUrl: './pet-game.css',
})
export class PetGame implements OnInit, OnDestroy {
  protected readonly garden = inject(GardenService);
  private readonly xu = inject(XuService);
  private readonly toast = inject(ToastService);
  private readonly orders = inject(OrderService);
  protected readonly tasks = PET_TASKS;
  protected readonly stages = PET_STAGES;
  protected readonly reward = PET_REWARD;
  protected readonly finalReward = PET_FINAL_REWARD;
  protected readonly days = [1, 2, 3, 4, 5, 6, 7];
  protected readonly last = PET_LAST;
  /** Hiệu ứng đang chạy: 'care' (nhiều tim bay lên khi chăm bé), 'grow' (hạt vàng bung khi lớn thêm) */
  protected readonly fx = signal<'' | 'care' | 'grow'>('');
  /** Hạt vàng bung quanh bé (cố định để mỗi lần giống nhau) */
  protected readonly dust = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * 6.283 + Math.sin(i * 12.9898) * 0.5;
    const r = 90 + ((i * 37) % 140);
    return {
      vx: Math.round(Math.cos(a) * r), vy: Math.round(Math.sin(a) * r - 30), size: 4 + ((i * 5) % 8),
      color: ['255,214,107', '255,200,92', '255,232,160', '250,180,90', '255,255,255', '255,220,200'][i % 6],
      dur: +(0.8 + ((i * 13) % 50) / 100).toFixed(2), delay: +(((i * 7) % 10) / 100).toFixed(2),
    };
  });
  /** Tim bay lên khi chăm bé: nhiều tim, to nhỏ và màu hồng khác nhau, vị trí/độ trễ cố định để mỗi lần giống nhau */
  protected readonly hearts = Array.from({ length: 22 }, (_, i) => ({
    x: 46 + ((i % 11) - 5) * 6, size: 16 + ((i * 7) % 20), d: +(((i * 11) % 90) / 100).toFixed(2), dur: +(1.5 + ((i * 17) % 10) / 10).toFixed(1),
    sway: ((i % 7) - 3) * 11, color: ['#ff6b8a', '#ff8fa8', '#ff4f7b', '#ffa6bb', '#ff7aa0'][i % 5],
  }));
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    document.body.classList.add('no-footer', 'no-chat'); // vừa đúng một màn hình
    // Cho ăn = hôm nay đã đặt ít nhất 1 món đồ ăn/uống (đơn chưa bị hủy/từ chối)
    const today = new Date().toDateString();
    this.orders.getOrders().subscribe({
      next: (list) => {
        if (list.some((o) => o.type === 'placed' && o.kind === 'food' && o.status !== 'cancelled' && o.status !== 'declined' && new Date(o.createdAt).toDateString() === today)) this.garden.markFed();
      },
      error: () => undefined,
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('no-footer', 'no-chat');
    clearTimeout(this.timer);
  }

  protected sad(): boolean {
    return this.garden.petSad();
  }

  protected stage(): number {
    return this.garden.pet();
  }

  /** Còn là trứng (chưa nở) thì việc chăm đổi sang chăm trứng */
  protected isEgg(): boolean {
    return this.stage() < 3;
  }

  protected taskLabel(t: (typeof PET_TASKS)[number]): string {
    return this.isEgg() ? t.egg : t.label;
  }

  protected taskHint(t: (typeof PET_TASKS)[number]): string {
    return this.isEgg() ? t.eggHint : t.hint;
  }

  protected done(key: string): boolean {
    return this.garden.petDone().includes(key);
  }

  protected allDone(): boolean {
    return this.garden.petDone().length >= PET_TASKS.length;
  }

  protected state(day: number): 'done' | 'today' | 'next' | 'todo' {
    const p = this.stage();
    if (day <= p || (day === 7 && p >= PET_LAST)) return 'done';
    if (day === p + 1) return this.garden.petClaimed() ? 'next' : 'today';
    return 'todo';
  }

  private play(kind: 'care' | 'grow', ms: number): void {
    this.fx.set('');
    clearTimeout(this.timer);
    setTimeout(() => {
      this.fx.set(kind);
      this.timer = setTimeout(() => this.fx.set(''), ms);
    }, 20);
  }

  protected claim(): void {
    const before = this.stage();
    const now = this.garden.petClaim();
    if (now < 0) return;
    const day = new Date().toISOString().slice(0, 10);
    let got = this.xu.earnGame(PET_REWARD, 'Chăm thú cưng đủ ngày', 'thu-cung-' + day);
    if (before < PET_LAST && now >= PET_LAST) got += this.xu.earnGame(PET_FINAL_REWARD, 'Thú cưng trưởng thành', 'thu-cung-truong-thanh');
    if (now > before) this.play('grow', 1900);
    const name = PET_STAGES[now];
    this.toast.show(got > 0 ? `+${got} Xu · ${now > before ? 'Bé lớn lên: ' + name : 'Chăm thú cưng đủ ngày'}` : `Bé lớn lên: ${name}`);
  }

  /** Thử nghiệm: coi như đã sang ngày mới để chăm tiếp mà không phải chờ */
  protected nextDay(): void {
    this.garden.simulateNextDay();
  }

  // ---- Tủ đồ (trang phục) ----
  protected readonly outfits = OUTFITS;
  protected readonly tiers = OUTFIT_TIERS;
  protected readonly closet = signal(false);
  protected readonly balance = this.xu.balance;

  protected grown(): boolean {
    return this.stage() >= PET_LAST;
  }

  /** Ảnh của giai đoạn n; giai đoạn trưởng thành đổi theo trang phục đang mặc */
  protected petSrc(n: number): string {
    if (n === PET_LAST + 1) return OUTFITS.find((o) => o.key === this.garden.outfit())?.img ?? 'assets/garden/pet-7.png';
    return 'assets/garden/pet-' + n + '.png';
  }

  protected cost(o: (typeof OUTFITS)[number]): number {
    return o.tier ? OUTFIT_TIERS[o.tier].cost : 0;
  }

  protected buy(o: (typeof OUTFITS)[number]): void {
    if (this.garden.ownsOutfit(o.key)) return;
    if (!this.xu.spend(this.cost(o), 'Mua trang phục ' + o.name, 'outfit:' + o.key)) {
      this.toast.show(`Chưa đủ Xu: cần ${this.cost(o)} Xu, bạn đang có ${this.balance()} Xu`);
      return;
    }
    this.garden.addOutfit(o.key);
    this.toast.show('Đã mua bộ ' + o.name);
  }

  protected wear(o: (typeof OUTFITS)[number]): void {
    this.garden.wearOutfit(o.key);
    if (!this.grown()) this.toast.show('Đã chọn bộ ' + o.name + ', bé trưởng thành sẽ mặc ngay');
    else this.play('grow', 1500);
  }

  // ---- Bảng thử nghiệm ----
  protected readonly lab = signal(false);

  protected jump(n: number): void {
    this.garden.simulateStage(n);
  }

  protected doOne(key: string): void {
    this.garden.simulateTask(key);
  }

  protected doAll(): void {
    for (const t of PET_TASKS) this.garden.simulateTask(t.key);
  }

  protected sadNow(): void {
    this.garden.simulateSad();
  }

  protected addXu(n: number): void {
    this.xu.earn(n, 'Xu thử nghiệm', 'dev:' + Date.now() + ':' + n);
  }
}
