import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { OrdersRoutingModule } from './orders-routing-module';
import { OrderList } from './order-list/order-list';
import { OrderDetail } from './order-detail/order-detail';
import { ReportForm } from './report-form/report-form';
import { OrderThumb } from './order-thumb/order-thumb';

@NgModule({
  declarations: [OrderList, OrderDetail, ReportForm, OrderThumb],
  imports: [SharedModule, OrdersRoutingModule],
})
export class OrdersModule {}
