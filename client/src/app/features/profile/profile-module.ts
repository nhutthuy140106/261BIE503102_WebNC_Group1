import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { ProfileRoutingModule } from './profile-routing-module';
import { Profile } from './profile/profile';
import { AddressBook } from './address-book/address-book';
import { SavedList } from './saved-list/saved-list';

@NgModule({
  declarations: [Profile, AddressBook, SavedList],
  imports: [SharedModule, ProfileRoutingModule],
})
export class ProfileModule {}
