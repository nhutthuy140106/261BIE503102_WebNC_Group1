import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { MessengerRoutingModule } from './messenger-routing-module';
import { Messenger } from './messenger/messenger';

@NgModule({
  declarations: [Messenger],
  imports: [SharedModule, MessengerRoutingModule],
})
export class MessengerModule {}
