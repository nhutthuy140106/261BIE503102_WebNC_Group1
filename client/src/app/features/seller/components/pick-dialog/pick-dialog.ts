import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { SellerJobView } from '../../../../core/services/seller-space';

/** Hộp chọn người nhận việc: so sánh các đề nghị (★, số việc đã làm, khu, khung giờ, lời giới thiệu) kiểu Airtasker. */
@Component({
  selector: 'app-seller-pick-dialog',
  standalone: false,
  templateUrl: './pick-dialog.html',
  styleUrls: ['../../seller-ui.css', './pick-dialog.css'],
})
export class SellerPickDialog {
  @Input({ required: true }) job!: SellerJobView;
  @Output() readonly chosen = new EventEmitter<string>();
  @Output() readonly closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closed.emit();
  }

  protected backdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }
}
