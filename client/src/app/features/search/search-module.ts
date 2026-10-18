import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { SearchRoutingModule } from './search-routing-module';
import { SearchResults } from './search-results/search-results';

@NgModule({
  declarations: [SearchResults],
  imports: [SharedModule, SearchRoutingModule],
})
export class SearchModule {}
