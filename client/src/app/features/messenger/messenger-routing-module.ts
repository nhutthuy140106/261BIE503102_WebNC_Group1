import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Messenger } from './messenger/messenger';

const routes: Routes = [
  { path: '', component: Messenger },
  { path: ':chatId', component: Messenger },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MessengerRoutingModule {}
