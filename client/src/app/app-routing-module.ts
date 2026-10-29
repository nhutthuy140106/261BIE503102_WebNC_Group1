import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';
import { sellerMatchGuard } from './core/guards/seller-match-guard';
import { NotFound } from './core/not-found/not-found';

/**
 * Mỗi nhóm tính năng là một feature module tải lười (lazy loading).
 * Trang cần đăng nhập gắn authGuard; quyền thật do server kiểm tra.
 * Route '**' (404) phải đặt CUỐI mảng.
 */
const routes: Routes = [
  { path: '', loadChildren: () => import('./features/home/home-module').then((m) => m.HomeModule), pathMatch: 'full' },
  { path: 'welcome', loadChildren: () => import('./features/landing/landing-module').then((m) => m.LandingModule) },
  { path: 'legal', loadChildren: () => import('./features/legal/legal-module').then((m) => m.LegalModule) },
  { path: 'search', loadChildren: () => import('./features/search/search-module').then((m) => m.SearchModule) },
  { path: 'posts', loadChildren: () => import('./features/posts/posts-module').then((m) => m.PostsModule) },
  { path: 'quay-mon', loadChildren: () => import('./features/spin/spin-module').then((m) => m.SpinModule) },
  { path: 'shop', loadChildren: () => import('./features/shop/shop-module').then((m) => m.ShopModule) },
  { path: 'help', loadChildren: () => import('./features/help/help-module').then((m) => m.HelpModule) },
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
    path: 'vuon',
    canActivate: [authGuard],
    loadChildren: () => import('./features/garden/garden-module').then((m) => m.GardenModule),
  },
  {
    path: 'xu',
    canActivate: [authGuard],
    loadChildren: () => import('./features/xu/xu-module').then((m) => m.XuModule),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () => import('./features/profile/profile-module').then((m) => m.ProfileModule),
  },
  {
    path: 'seller',
    canMatch: [sellerMatchGuard],
    canActivate: [authGuard],
    loadChildren: () => import('./features/seller/seller-module').then((m) => m.SellerModule),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/admin/admin-module').then((m) => m.AdminModule),
  },
  { path: '**', component: NotFound },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
