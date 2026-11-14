import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin-guard';
import { SharedModule } from '../../shared/shared-module';
import { AdminAnnouncements } from './admin-announcements/admin-announcements';
import { AdminAudit } from './admin-audit/admin-audit';
import { AdminDialog } from './admin-dialog/admin-dialog';
import { AdminForbidden } from './admin-forbidden/admin-forbidden';
import { AdminLayout } from './admin-layout/admin-layout';
import { AdminLogin } from './admin-login/admin-login';
import { AdminOrderDetail } from './admin-order-detail/admin-order-detail';
import { AdminOrders } from './admin-orders/admin-orders';
import { AdminOverview } from './admin-overview/admin-overview';
import { AdminPosts } from './admin-posts/admin-posts';
import { AdminReports } from './admin-reports/admin-reports';
import { AdminSettings } from './admin-settings/admin-settings';
import { AdminSupport } from './admin-support/admin-support';
import { AdminUserDetail } from './admin-user-detail/admin-user-detail';
import { AdminUsers } from './admin-users/admin-users';
import { AdminVerifications } from './admin-verifications/admin-verifications';
import { AdminVouchers } from './admin-vouchers/admin-vouchers';

const routes: Routes = [
  { path: 'login', component: AdminLogin },
  { path: '403', component: AdminForbidden },
  {
    path: '',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', component: AdminOverview },
      { path: 'verifications', component: AdminVerifications },
      { path: 'reports', component: AdminReports },
      { path: 'orders', component: AdminOrders },
      { path: 'orders/:id', component: AdminOrderDetail },
      { path: 'support', component: AdminSupport },
      { path: 'users', component: AdminUsers },
      { path: 'users/:id', component: AdminUserDetail },
      { path: 'posts', component: AdminPosts },
      { path: 'vouchers', component: AdminVouchers },
      { path: 'announcements', component: AdminAnnouncements },
      { path: 'settings', component: AdminSettings },
      { path: 'audit', component: AdminAudit },
    ],
  },
];

@NgModule({
  declarations: [
    AdminLayout, AdminLogin, AdminOverview, AdminUsers, AdminUserDetail, AdminPosts, AdminReports, AdminDialog, AdminForbidden,
    AdminVerifications, AdminOrders, AdminOrderDetail, AdminAudit, AdminSupport, AdminVouchers, AdminAnnouncements, AdminSettings,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
