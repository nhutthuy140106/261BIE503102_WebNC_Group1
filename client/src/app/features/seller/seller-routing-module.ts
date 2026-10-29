import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes-guard';
import { sellerVerifiedGuard } from '../../core/guards/seller-verified-guard';
import { SellerVerify } from './seller-verify/seller-verify';
import { SellerLayout } from './seller-layout/seller-layout';
import { SellerDashboard } from './seller-dashboard/seller-dashboard';
import { PostManage } from './post-manage/post-manage';
import { PostForm } from './post-form/post-form';
import { Transactions } from './transactions/transactions';

const routes: Routes = [
  // xác minh danh tính nằm ngoài khung Bán: ai cũng vào được để nộp hồ sơ, các trang còn lại cần đã được duyệt
  { path: 'verify', component: SellerVerify },
  {
    path: '',
    component: SellerLayout,
    canActivate: [sellerVerifiedGuard],
    children: [
      { path: '', component: SellerDashboard },
      { path: 'posts', component: PostManage },
      { path: 'posts/new', component: PostForm, canDeactivate: [pendingChangesGuard] },
      { path: 'posts/:id/edit', component: PostForm, canDeactivate: [pendingChangesGuard] },
      { path: 'transactions', component: Transactions },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SellerRoutingModule {}
