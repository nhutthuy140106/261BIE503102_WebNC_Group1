import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CoinCatch } from './coin-catch/coin-catch';
import { PetGame } from './pet-game/pet-game';
import { TreeGame } from './tree-game/tree-game';
import { GardenHub } from './garden-hub/garden-hub';

const routes: Routes = [
  { path: '', component: GardenHub },
  { path: 'hai-xu', component: CoinCatch },
  { path: 'tuoi-cay', component: TreeGame },
  { path: 'thu-cung', component: PetGame },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class GardenRoutingModule {}
