import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PostCard } from './components/post-card/post-card';
import { JobCard } from './components/job-card/job-card';

@NgModule({
  declarations: [PostCard, JobCard],
  imports: [CommonModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, PostCard, JobCard],
})
export class SharedModule {}
