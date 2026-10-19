import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PostCard } from './components/post-card/post-card';
import { JobCard } from './components/job-card/job-card';
import { Avatar } from './components/avatar/avatar';

@NgModule({
  declarations: [PostCard, JobCard, Avatar],
  imports: [CommonModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, PostCard, JobCard, Avatar],
})
export class SharedModule {}
