import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * Hộp "Bạn chắc chắn…?" trước khi đổi bước một đơn / việc:
 * hiện quy trình (bước hiện tại màu cam, bước sắp chuyển màu xanh đen) + tóm tắt đơn.
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
  @Input() flow: readonly string[] = [];
  /** Vị trí bước hiện tại trong flow */
  @Input() step = 0;
  @Input() thumb?: string;
  @Input() round = false;
  @Input() title = '';
  @Input() sub = '';
  @Input() okLabel = 'Xác nhận';
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
