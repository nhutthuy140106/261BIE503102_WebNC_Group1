import { Component, EventEmitter, HostListener, Output, computed, input, signal } from '@angular/core';
import { SellerJobView } from '../../../../core/services/seller-space';

/**
 * Hộp chọn người nhận việc. Mỗi đề nghị chỉ giữ thứ giúp quyết định: ★ (số việc đã làm), khu ở và lời giới thiệu.
 * Người đề nghị đã cam kết khung giờ trong bài nên không cần so giờ. Bấm thẻ để chọn, nút cam ở cuối xác nhận.
 */
@Component({
  selector: 'app-seller-pick-dialog',
  standalone: false,
  templateUrl: './pick-dialog.html',
  styleUrls: ['../../seller-ui.css', './pick-dialog.css'],
})
export class SellerPickDialog {
  readonly job = input.required<SellerJobView>();
  @Output() readonly chosen = new EventEmitter<string>();
  @Output() readonly closed = new EventEmitter<void>();

  protected readonly sel = signal<string | null>(null);
  protected readonly picked = computed(() => this.job().waiting.find((o) => o.id === this.sel()) ?? null);

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closed.emit();
  }

  protected backdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }

  protected confirm(): void {
    const id = this.sel();
    if (id) this.chosen.emit(id);
  }
}
