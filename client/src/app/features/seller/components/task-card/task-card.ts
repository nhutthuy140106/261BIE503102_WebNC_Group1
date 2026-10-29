import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { KIND_LABEL } from '../../../../core/models/post';
import { SellerTask } from '../../../../core/services/seller-space';

/** Hành động trên thẻ: primary = nút chính, decline = ✕, chat = 💬 */
export type TaskAction = 'primary' | 'decline' | 'chat';

/**
 * Thẻ trong khối "Cần bạn xử lý": phần trên (mã · tên · giá) và phần dưới nét đứt (trạng thái · người · nơi · ghi chú)
 * cao cố định để mọi thẻ thẳng hàng. Hỏi đáp / đánh giá mở ô trả lời ngay trong thẻ.
 */
@Component({
  selector: 'app-seller-task-card',
  standalone: false,
  templateUrl: './task-card.html',
  styleUrls: ['../../seller-ui.css', './task-card.css'],
})
export class SellerTaskCard {
  @Input({ required: true }) task!: SellerTask;
  @Output() readonly act = new EventEmitter<TaskAction>();
  @Output() readonly replied = new EventEmitter<string>();
  @Output() readonly opened = new EventEmitter<void>();

  protected readonly replying = signal(false);
  protected readonly kindLabel = KIND_LABEL;

  /** Nút chính chỉ có hai chữ: "Phản hồi" (hỏi đáp / đánh giá) và "Xác nhận" (mọi việc còn lại) — nhãn trạng thái nói rõ xác nhận gì */
  protected get primaryLabel(): string {
    const t = this.task.type;
    return t === 'question' || t === 'review' ? 'Phản hồi' : 'Xác nhận';
  }

  protected get placeholder(): string {
    return this.task.type === 'question' ? 'Trả lời công khai, không ghi SĐT…' : 'Cảm ơn khách…';
  }

  protected primary(e: Event): void {
    e.stopPropagation();
    if (this.task.type === 'question' || this.task.type === 'review') this.replying.set(true);
    else this.act.emit('primary');
  }

  protected sideAct(e: Event, a: TaskAction): void {
    e.stopPropagation();
    this.act.emit(a);
  }

  protected send(e: Event, input: HTMLInputElement): void {
    e.preventDefault();
    const v = input.value.trim();
    if (v) this.replied.emit(v);
  }
}
