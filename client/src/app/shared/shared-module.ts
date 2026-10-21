import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PostCard } from './components/post-card/post-card';
import { JobCard } from './components/job-card/job-card';
import { Avatar } from './components/avatar/avatar';
import { Select } from './components/select/select';
import { PasswordInput } from './components/password-input/password-input';

@NgModule({
  declarations: [PostCard, JobCard, Avatar, Select, PasswordInput],
  imports: [CommonModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, PostCard, JobCard, Avatar, Select, PasswordInput],
})
export class SharedModule {}
