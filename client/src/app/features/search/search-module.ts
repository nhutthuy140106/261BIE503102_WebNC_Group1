import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { SearchRoutingModule } from './search-routing-module';
import { SearchResults } from './search-results/search-results';
import { SectionList } from './section-list/section-list';

@NgModule({
  declarations: [SearchResults, SectionList],
  imports: [SharedModule, SearchRoutingModule],
})
export class SearchModule {}
