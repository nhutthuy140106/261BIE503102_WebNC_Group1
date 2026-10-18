import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchResults } from './search-results/search-results';

const routes: Routes = [
  { path: '', component: SearchResults },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SearchRoutingModule {}
