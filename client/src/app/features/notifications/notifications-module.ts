import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { NotificationsRoutingModule } from './notifications-routing-module';
import { NotificationList } from './notification-list/notification-list';

@NgModule({
  declarations: [NotificationList],
  imports: [SharedModule, NotificationsRoutingModule],
})
export class NotificationsModule {}
