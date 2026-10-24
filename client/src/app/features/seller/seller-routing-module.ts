import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes-guard';
import { sellerVerifiedGuard } from '../../core/guards/seller-verified-guard';
import { SellerVerify } from './seller-verify/seller-verify';
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

/**
 * Khu Bán & Đăng việc, chuyển dần từ design/mockups/seller*.html.
 */
const routes: Routes = [
  // xác minh danh tính nằm ngoài khung Bán: ai cũng vào được để nộp hồ sơ, các trang còn lại cần đã được duyệt
  { path: 'verify', component: SellerVerify },
  {
    path: '',
    component: SellerLayout,
    canActivate: [sellerVerifiedGuard],
    children: [
      { path: '', component: SellerToday, title: 'Hôm nay · AntGo Bán' },
      { path: 'orders', component: SellerOrders, title: 'Giao dịch · AntGo Bán' },
      { path: 'orders/:id', component: SellerOrderDetail, title: 'Chi tiết đơn · AntGo Bán' },
      { path: 'jobs/:id', component: SellerJobDetail, title: 'Chi tiết việc · AntGo Bán' },
      { path: 'transactions', redirectTo: 'orders', pathMatch: 'full' },
      { path: 'calendar', component: SellerCalendar, title: 'Lịch · AntGo Bán' },
      { path: 'posts', component: SellerPosts, title: 'Bài đăng · AntGo Bán' },
      { path: 'posts/new', component: SellerPostForm, title: 'Đăng bài · AntGo Bán', canDeactivate: [pendingChangesGuard] },
      { path: 'posts/:id/edit', component: SellerPostForm, title: 'Đăng bài · AntGo Bán', canDeactivate: [pendingChangesGuard] },
      { path: 'insights', component: SellerInsights, title: 'Hiệu quả · AntGo Bán' },
      { path: 'messenger', component: SellerMessenger, title: 'Messenger · AntGo Bán' },
      { path: 'shop', component: SellerShop, title: 'Gian hàng của tôi · AntGo Bán' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SellerRoutingModule {}
