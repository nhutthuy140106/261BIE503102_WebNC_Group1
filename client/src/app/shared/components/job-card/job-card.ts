import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Post } from '../../../core/models/post';
import { createSlug } from '../../../core/utils/slug-helper';

/** Thẻ việc làm: mảng màu be, tiền công in to, trạng thái "Đang mở · n đề nghị". */
@Component({
  selector: 'app-job-card',
  standalone: false,
  templateUrl: './job-card.html',
  styleUrl: './job-card.css',
})
export class JobCard {
  @Input({ required: true }) job!: Post;
  @Input() saved = false;
  @Output() toggleSave = new EventEmitter<Post>();

  get slug(): string {
    return createSlug(this.job.title, this.job._id);
  }
}
