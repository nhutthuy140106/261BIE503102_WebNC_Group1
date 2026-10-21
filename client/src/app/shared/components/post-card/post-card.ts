import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { flyHeart } from '../../../core/utils/fly-heart';
import { KIND_LABEL, Post } from '../../../core/models/post';
import { createSlug } from '../../../core/utils/slug-helper';

/** Thẻ món đồ / dịch vụ có ảnh. Cha -> con: @Input; con -> cha: @Output. */
@Component({
  selector: 'app-post-card',
  standalone: false,
  templateUrl: './post-card.html',
  styleUrl: './post-card.css',
})
export class PostCard {
  @Input({ required: true }) post!: Post;
  @Input() saved = false;
  @Output() toggleSave = new EventEmitter<Post>();

  protected readonly kindLabel = KIND_LABEL;

  /** 4.9 -> "4,9" (dấu phẩy như bản mẫu) */
  protected get rating(): string {
    return (this.post.rating ?? 0).toFixed(1).replace('.', ',');
  }
  private readonly auth = inject(AuthService);

  /** Bấm ♡: lưu / bỏ lưu; khi lưu (đã đăng nhập) thì trái tim bay lên nút Đã lưu ở header. */
  protected onSave(e: Event): void {
    if (!this.saved && this.auth.isLoggedIn()) flyHeart(e.currentTarget as HTMLElement);
    this.toggleSave.emit(this.post);
  }

  get slug(): string {
    return createSlug(this.post.title, this.post._id);
  }
}
