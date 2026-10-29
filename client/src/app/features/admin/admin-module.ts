import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin-guard';
import { SharedModule } from '../../shared/shared-module';
import { AdminDialog } from './admin-dialog/admin-dialog';
import { AdminForbidden } from './admin-forbidden/admin-forbidden';
import { AdminLayout } from './admin-layout/admin-layout';
import { AdminOverview } from './admin-overview/admin-overview';
import { AdminPosts } from './admin-posts/admin-posts';
import { AdminReports } from './admin-reports/admin-reports';
import { AdminUsers } from './admin-users/admin-users';

const routes: Routes = [
  { path: '403', component: AdminForbidden },
  {
    path: '',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', component: AdminOverview },
      { path: 'users', component: AdminUsers },
      { path: 'posts', component: AdminPosts },
      { path: 'reports', component: AdminReports },
    ],
  },
];

@NgModule({
  declarations: [AdminLayout, AdminOverview, AdminUsers, AdminPosts, AdminReports, AdminDialog, AdminForbidden],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AdminModule {}
