import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  get slug(): string {
    return createSlug(this.post.title, this.post._id);
  }
}
