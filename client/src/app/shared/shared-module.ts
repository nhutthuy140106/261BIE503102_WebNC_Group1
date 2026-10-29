import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PostCard } from './components/post-card/post-card';
import { JobCard } from './components/job-card/job-card';
import { Avatar } from './components/avatar/avatar';
import { Loader } from './components/loader/loader';
import { Skeleton } from './components/skeleton/skeleton';
import { Select } from './components/select/select';
import { ResultCard } from './components/result-card/result-card';
import { PasswordInput } from './components/password-input/password-input';
import { SortMenu } from './components/sort-menu/sort-menu';
import { OrderThumb } from './components/order-thumb/order-thumb';
import { Price } from './components/price/price';
import { ComboSaving } from './components/combo-saving/combo-saving';
import { DealTag } from './components/deal-tag/deal-tag';
import { VndPipe } from './pipes/vnd';
import { JobWhenPipe } from './pipes/job-when';
import { AgoPipe } from './pipes/ago';
import { DistancePipe } from './pipes/distance';
import { UnitPipe } from './pipes/unit';
import { CountPipe } from './pipes/count';

@NgModule({
  declarations: [ComboSaving, Price, DealTag, PostCard, JobCard, ResultCard, Avatar, Select, PasswordInput, SortMenu, OrderThumb, VndPipe, JobWhenPipe, AgoPipe, DistancePipe, UnitPipe, CountPipe, Loader, Skeleton],
  imports: [CommonModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ComboSaving, Price, DealTag, PostCard, JobCard, ResultCard, Avatar, Select, PasswordInput, SortMenu, OrderThumb, VndPipe, JobWhenPipe, AgoPipe, DistancePipe, UnitPipe, CountPipe, Loader, Skeleton],
})
export class SharedModule {}
