import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { StepItem } from '../../../../core/models/seller';

/**
 * Hộp "Bạn chắc chắn…?" trước khi đổi bước một đơn / việc:
 * thanh bước giống chi tiết đơn (bước sắp chuyển tới viền cam) + câu giải thích.
 * Có `icon` thì hiện kiểu thông báo giữa: vòng icon to → tiêu đề → lưu ý → hai nút căn giữa (nhân bản / xóa bài).
 */
@Component({
  selector: 'app-seller-confirm-dialog',
  standalone: false,
  templateUrl: './confirm-dialog.html',
  styleUrls: ['../../seller-ui.css', './confirm-dialog.css'],
})
export class SellerConfirmDialog {
  @Input({ required: true }) heading = '';
  /** Câu giải thích, có thể chứa <b> */
  @Input() message = '';
  @Input() steps: readonly StepItem[] = [];
  @Input() okLabel = 'Xác nhận';
  /** symbol trong index.html; `danger` = vòng đỏ (xóa) */
  @Input() icon = '';
  @Input() danger = false;
  @Output() readonly ok = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closed.emit();
  }

  protected backdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }
}
