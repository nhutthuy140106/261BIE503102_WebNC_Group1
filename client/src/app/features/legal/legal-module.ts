import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared-module';
import { LegalPage } from './legal-page/legal-page';

const routes: Routes = [
  { path: 'terms', component: LegalPage, data: { doc: 'terms' } },
  { path: 'privacy', component: LegalPage, data: { doc: 'privacy' } },
];

@NgModule({
  declarations: [LegalPage],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class LegalModule {}
