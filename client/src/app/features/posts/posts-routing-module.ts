import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PostDetail } from './post-detail/post-detail';
import { JobDetail } from './job-detail/job-detail';

const routes: Routes = [
  { path: 'job/:slug', component: JobDetail },
  { path: ':slug', component: PostDetail },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PostsRoutingModule {}
