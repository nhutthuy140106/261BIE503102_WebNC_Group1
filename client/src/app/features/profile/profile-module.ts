import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { ProfileRoutingModule } from './profile-routing-module';
import { Profile } from './profile/profile';

@NgModule({
  declarations: [Profile],
  imports: [SharedModule, ProfileRoutingModule],
})
export class ProfileModule {}
