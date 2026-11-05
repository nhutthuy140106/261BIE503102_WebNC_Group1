import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Post } from '../../../core/models/post';
import { postTag } from '../../../core/utils/post-tag';
import { AuthService } from '../../../core/services/auth';
import { createSlug } from '../../../core/utils/slug-helper';
import { flyHeart } from '../../../core/utils/fly-heart';

/** Thẻ kết quả tìm kiếm (3 cột): ảnh hoặc mảng be cho việc, loại, tên, giá, khu · khoảng cách, tim lưu. */
@Component({
  selector: 'app-result-card',
  standalone: false,
  templateUrl: './result-card.html',
  styleUrl: './result-card.css',
})
export class ResultCard {
  @Input({ required: true }) post!: Post;
  @Input() saved = false;
  @Output() toggleSave = new EventEmitter<Post>();

  private readonly auth = inject(AuthService);

  protected get isJob(): boolean {
    return this.post.kind === 'job';
  }

  protected get link(): string[] {
    return this.isJob ? ['/posts/job', createSlug(this.post.title, this.post._id)] : ['/posts', createSlug(this.post.title, this.post._id)];
  }

  protected get kindText(): string {
    return postTag(this.post);
  }

  protected onSave(e: Event): void {
    if (!this.saved && this.auth.isLoggedIn()) flyHeart(e.currentTarget as HTMLElement);
    this.toggleSave.emit(this.post);
  }
}
