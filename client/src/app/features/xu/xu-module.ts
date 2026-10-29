import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared-module';
import { XuPage } from './xu-page/xu-page';

const routes: Routes = [{ path: '', component: XuPage, title: 'AntXu · AntGo' }];

@NgModule({
  declarations: [XuPage],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class XuModule {}
