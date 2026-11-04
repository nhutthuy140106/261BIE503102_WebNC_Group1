import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { PostsRoutingModule } from './posts-routing-module';
import { PostDetail } from './post-detail/post-detail';
import { JobDetail } from './job-detail/job-detail';
import { CupOrder } from './cup-order/cup-order';
import { PostInfo } from './post-info/post-info';

@NgModule({
  declarations: [PostDetail, JobDetail, CupOrder, PostInfo],
  imports: [SharedModule, PostsRoutingModule],
})
export class PostsModule {}
