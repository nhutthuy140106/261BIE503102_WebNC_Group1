import { Component, HostListener, inject } from '@angular/core';
import { AreaService } from '../../services/area';

/** Hộp "Chọn khu vực đang xem": trang chủ và tìm kiếm chỉ hiện bài bán ở khu được chọn. */
@Component({
  selector: 'app-area-dialog',
  standalone: false,
  templateUrl: './area-dialog.html',
  styleUrl: './area-dialog.css',
})
export class AreaDialog {
  protected readonly area = inject(AreaService);

  protected pick(name: string): void {
    this.area.set(name);
    this.area.close();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.area.close();
  }
}
