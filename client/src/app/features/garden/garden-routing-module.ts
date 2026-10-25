import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CoinCatch } from './coin-catch/coin-catch';
import { GardenHub } from './garden-hub/garden-hub';

const routes: Routes = [
  { path: '', component: GardenHub },
  { path: 'hai-xu', component: CoinCatch },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class GardenRoutingModule {}
