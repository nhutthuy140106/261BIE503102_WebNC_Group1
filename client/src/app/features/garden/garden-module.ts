import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';
import { CoinCatch } from './coin-catch/coin-catch';
import { PetGame } from './pet-game/pet-game';
import { TreeGame } from './tree-game/tree-game';
import { GardenHub } from './garden-hub/garden-hub';
import { GardenRoutingModule } from './garden-routing-module';

@NgModule({
  declarations: [GardenHub, CoinCatch, TreeGame, PetGame],
  imports: [SharedModule, GardenRoutingModule],
})
export class GardenModule {}
