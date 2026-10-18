import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { NotFound } from './core/not-found/not-found';

/**
 * Mỗi nhóm tính năng là một feature module tải lười (lazy loading).
 * Trang cần đăng nhập gắn authGuard; quyền thật do server kiểm tra.
 * Route '**' (404) phải đặt CUỐI mảng.
 */
const routes: Routes = [
  { path: '', loadChildren: () => import('./features/home/home-module').then((m) => m.HomeModule), pathMatch: 'full' },
  { path: 'search', loadChildren: () => import('./features/search/search-module').then((m) => m.SearchModule) },
  { path: 'posts', loadChildren: () => import('./features/posts/posts-module').then((m) => m.PostsModule) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth-module').then((m) => m.AuthModule) },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadChildren: () => import('./features/orders/orders-module').then((m) => m.OrdersModule),
  },
  {
    path: 'messenger',
    canActivate: [authGuard],
    loadChildren: () => import('./features/messenger/messenger-module').then((m) => m.MessengerModule),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/notifications/notifications-module').then((m) => m.NotificationsModule),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () => import('./features/profile/profile-module').then((m) => m.ProfileModule),
  },
  {
    path: 'seller',
    canActivate: [authGuard],
    loadChildren: () => import('./features/seller/seller-module').then((m) => m.SellerModule),
  },
  { path: '**', component: NotFound },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
