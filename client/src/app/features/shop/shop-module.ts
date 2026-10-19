import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared-module';
import { Shop } from './shop/shop';

const routes: Routes = [{ path: ':id', component: Shop }];

/** Gian hàng công khai của người bán / người đăng việc: /shop/:sellerId */
@NgModule({
  declarations: [Shop],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ShopModule {}
