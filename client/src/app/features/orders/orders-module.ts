import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { OrdersRoutingModule } from './orders-routing-module';
import { OrderList } from './order-list/order-list';
import { OrderDetail } from './order-detail/order-detail';
import { ReportForm } from './report-form/report-form';
import { OrderTracking } from './order-tracking/order-tracking';

@NgModule({
  declarations: [OrderList, OrderDetail, ReportForm, OrderTracking],
  imports: [SharedModule, OrdersRoutingModule],
})
export class OrdersModule {}
