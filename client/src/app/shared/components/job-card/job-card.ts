import { Component, Input, inject } from '@angular/core';
import { Post } from '../../../core/models/post';
import { AuthService } from '../../../core/services/auth';
import { SavedService } from '../../../core/services/saved';
import { flyHeart } from '../../../core/utils/fly-heart';
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

  protected readonly savedSvc = inject(SavedService);
  private readonly auth = inject(AuthService);

  /** Bấm ♡: lưu / bỏ lưu việc (chưa đăng nhập thì hỏi đăng nhập); khi lưu thì trái tim bay lên nút Đã lưu ở header */
  protected onSave(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.savedSvc.has(this.job._id) && this.auth.isLoggedIn()) flyHeart(e.currentTarget as HTMLElement);
    this.savedSvc.toggle(this.job._id);
  }

  get slug(): string {
    return createSlug(this.job.title, this.job._id);
  }
}
