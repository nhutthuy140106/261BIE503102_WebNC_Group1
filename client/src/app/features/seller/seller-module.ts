import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { SellerRoutingModule } from './seller-routing-module';
import { SellerLayout } from './seller-layout/seller-layout';
import { SellerToday } from './seller-today/seller-today';
import { SellerInsights } from './seller-insights/seller-insights';
import { SellerMessenger } from './seller-messenger/seller-messenger';
import { SellerShop } from './seller-shop/seller-shop';
import { SellerPosts } from './seller-posts/seller-posts';
import { SellerCalendar } from './seller-calendar/seller-calendar';
import { SellerPostForm } from './seller-post-form/seller-post-form';
import { SellerOrders } from './seller-orders/seller-orders';
import { SellerOrderDetail } from './seller-order-detail/seller-order-detail';
import { SellerJobDetail } from './seller-job-detail/seller-job-detail';
import { SellerSteps } from './components/steps/steps';
import { SellerVerify } from './seller-verify/seller-verify';
import { SellerTaskCard } from './components/task-card/task-card';
import { SellerDayAgenda } from './components/day-agenda/day-agenda';
import { SellerPostCard } from './components/post-card/post-card';
import { SellerConfirmDialog } from './components/confirm-dialog/confirm-dialog';
import { SellerPickDialog } from './components/pick-dialog/pick-dialog';

@NgModule({
  declarations: [
    SellerLayout, SellerToday, SellerInsights, SellerMessenger, SellerShop, SellerPosts, SellerCalendar, SellerPostForm, SellerVerify, SellerOrders, SellerOrderDetail, SellerJobDetail,
    SellerTaskCard, SellerDayAgenda, SellerPostCard, SellerConfirmDialog, SellerPickDialog, SellerSteps,
  ],
  imports: [SharedModule, SellerRoutingModule],
})
export class SellerModule {}
