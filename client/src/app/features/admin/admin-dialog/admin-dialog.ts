import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Hộp xác nhận dùng chung cho Quản trị; có thể bắt buộc nhập lý do/ghi chú trước khi đồng ý. */
@Component({
  selector: 'app-admin-dialog',
  standalone: false,
  templateUrl: './admin-dialog.html',
  styleUrl: './admin-dialog.css',
})
export class AdminDialog {
  @Input({ required: true }) title = '';
  @Input() message = '';
  @Input() confirmLabel = 'Xác nhận';
  @Input() danger = false;
  /** Có ô nhập lý do; `reasonLabel` là nhãn ô nhập */
  @Input() withReason = false;
  @Input() reasonLabel = 'Lý do';
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  protected reason = '';
  protected touched = false;

  protected ok(): void {
    this.touched = true;
    if (this.withReason && this.reason.trim().length < 5) return;
    this.confirmed.emit(this.reason.trim());
  }
}
