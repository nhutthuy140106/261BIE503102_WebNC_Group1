import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchResults } from './search-results/search-results';
import { SectionList } from './section-list/section-list';

const routes: Routes = [
  { path: '', component: SearchResults },
  { path: 'section/:key', component: SectionList },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SearchRoutingModule {}
