import { Component, Input } from '@angular/core';
import { Post } from '../../../core/models/post';
import { createSlug } from '../../../core/utils/slug-helper';

/** Thẻ việc làm: mảng màu be, người đăng + thời gian, tiền công in to, trạng thái "Đang mở · n đề nghị". */
@Component({
  selector: 'app-job-card',
  standalone: false,
  templateUrl: './job-card.html',
  styleUrl: './job-card.css',
})
export class JobCard {
  @Input({ required: true }) job!: Post;

  get slug(): string {
    return createSlug(this.job.title, this.job._id);
  }
}
