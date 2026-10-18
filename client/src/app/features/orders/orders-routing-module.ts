import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrderList } from './order-list/order-list';
import { OrderDetail } from './order-detail/order-detail';

const routes: Routes = [
  { path: '', component: OrderList },
  { path: ':id', component: OrderDetail },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrdersRoutingModule {}
