import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PostDetail } from './post-detail/post-detail';
import { JobDetail } from './job-detail/job-detail';
import { pendingChangesGuard } from '../../core/guards/pending-changes-guard';

const routes: Routes = [
  { path: 'job/:slug', component: JobDetail, canDeactivate: [pendingChangesGuard] },
  { path: ':slug', component: PostDetail, canDeactivate: [pendingChangesGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PostsRoutingModule {}
