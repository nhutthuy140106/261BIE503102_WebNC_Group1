import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared-module';
import { AdminPage } from './admin-page/admin-page';

@NgModule({
  declarations: [AdminPage],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: AdminPage }])],
})
export class AdminModule {}
