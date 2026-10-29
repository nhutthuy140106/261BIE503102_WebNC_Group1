import { Component, inject } from '@angular/core';
import { GardenService, PET_REWARD, PET_TASKS } from '../../../core/services/garden';
import { ToastService } from '../../../core/services/toast';
import { XuService } from '../../../core/services/xu';

/** Nuôi thú cưng: làm đủ 3 việc mỗi ngày (cho ăn, chơi, tắm) để nhận thưởng; cùng trần 30 Xu/ngày của game. */
@Component({
  selector: 'app-pet-game',
  standalone: false,
  templateUrl: './pet-game.html',
  styleUrl: './pet-game.css',
})
export class PetGame {
  protected readonly garden = inject(GardenService);
  protected readonly xu = inject(XuService);
  private readonly toast = inject(ToastService);
  protected readonly tasks = PET_TASKS;
  protected readonly reward = PET_REWARD;
  protected last = '';

  protected done(key: string): boolean {
    return this.garden.petDone().includes(key);
  }

  protected allDone(): boolean {
    return this.garden.petDone().length >= PET_TASKS.length;
  }

  protected mood(): string {
    const n = this.garden.petDone().length;
    return n === 0 ? 'Bé đang chờ bạn' : n < PET_TASKS.length ? 'Bé đang vui dần' : 'Bé rất hạnh phúc!';
  }

  protected act(key: string): void {
    if (!this.garden.petDo(key)) return;
    this.last = key;
    setTimeout(() => (this.last = ''), 800);
  }

  protected claim(): void {
    if (!this.garden.petClaim()) return;
    const day = new Date().toISOString().slice(0, 10);
    const got = this.xu.earnGame(PET_REWARD, 'Chăm thú cưng đủ ngày', 'thu-cung-' + day);
    if (got > 0) this.toast.show(`+${got} Xu · Chăm thú cưng`);
  }
}
