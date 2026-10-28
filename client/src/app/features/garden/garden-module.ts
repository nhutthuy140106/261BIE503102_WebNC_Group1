import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';
import { CoinCatch } from './coin-catch/coin-catch';
import { GardenHub } from './garden-hub/garden-hub';
import { GardenRoutingModule } from './garden-routing-module';

@NgModule({
  declarations: [GardenHub, CoinCatch],
  imports: [SharedModule, GardenRoutingModule],
})
export class GardenModule {}
