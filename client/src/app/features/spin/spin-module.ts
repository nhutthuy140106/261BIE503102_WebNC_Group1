import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared-module';
import { Spin } from './spin/spin';

const routes: Routes = [{ path: '', component: Spin }];

/** "Chưa biết ăn gì?" — vòng quay chọn món từ các bài đang bán trong khu: /quay-mon */
@NgModule({
  declarations: [Spin],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class SpinModule {}
