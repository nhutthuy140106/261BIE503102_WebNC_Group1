import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes-guard';
import { SellerLayout } from './seller-layout/seller-layout';
import { SellerDashboard } from './seller-dashboard/seller-dashboard';
import { PostManage } from './post-manage/post-manage';
import { PostForm } from './post-form/post-form';
import { Transactions } from './transactions/transactions';

const routes: Routes = [
  {
    path: '',
    component: SellerLayout,
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
