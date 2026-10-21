import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { SellerRoutingModule } from './seller-routing-module';
import { SellerLayout } from './seller-layout/seller-layout';
import { SellerDashboard } from './seller-dashboard/seller-dashboard';
import { PostManage } from './post-manage/post-manage';
import { PostForm } from './post-form/post-form';
import { Transactions } from './transactions/transactions';
import { SellerVerify } from './seller-verify/seller-verify';

@NgModule({
  declarations: [SellerLayout, SellerDashboard, PostManage, PostForm, Transactions, SellerVerify],
  imports: [SharedModule, SellerRoutingModule],
})
export class SellerModule {}
