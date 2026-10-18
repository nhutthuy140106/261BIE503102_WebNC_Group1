import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { OrdersRoutingModule } from './orders-routing-module';
import { OrderList } from './order-list/order-list';
import { OrderDetail } from './order-detail/order-detail';

@NgModule({
  declarations: [OrderList, OrderDetail],
  imports: [SharedModule, OrdersRoutingModule],
})
export class OrdersModule {}
