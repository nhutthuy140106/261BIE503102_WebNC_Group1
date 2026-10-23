import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared-module';
import { HelpPage } from './help-page/help-page';

const routes: Routes = [{ path: '', component: HelpPage, title: 'Trợ giúp & hỗ trợ · AntGo' }];

@NgModule({
  declarations: [HelpPage],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class HelpModule {}
