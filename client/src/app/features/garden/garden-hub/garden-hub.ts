import { Component, inject } from '@angular/core';
import { COIN_MAX_PLAYS, COIN_MILESTONES, GardenService } from '../../../core/services/garden';
import { GAME_DAILY_CAP, XuService } from '../../../core/services/xu';

/** Trang chủ "Vườn AntGo": các mini game kiếm Xu (phần thưởng mô phỏng, có trần mỗi ngày). */
@Component({
  selector: 'app-garden-hub',
  standalone: false,
  templateUrl: './garden-hub.html',
  styleUrl: './garden-hub.css',
})
export class GardenHub {
  protected readonly garden = inject(GardenService);
  protected readonly xu = inject(XuService);
  protected readonly cap = GAME_DAILY_CAP;
  protected readonly maxPlays = COIN_MAX_PLAYS;
  protected readonly milestones = COIN_MILESTONES;
}
