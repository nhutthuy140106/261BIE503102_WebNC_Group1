import { Component, HostListener, inject } from '@angular/core';
import { AuthService } from '../../services/auth';
import { XuService } from '../../services/xu';

/** Ngăn kéo AntXu bên phải: mở khi bấm "… Xu" ở header, đóng bằng Esc / bấm nền / nút ×. */
@Component({
  selector: 'app-xu-drawer',
  standalone: false,
  templateUrl: './xu-drawer.html',
  styleUrl: './xu-drawer.css',
})
export class XuDrawer {
  protected readonly xu = inject(XuService);
  protected readonly auth = inject(AuthService);

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.xu.hide();
  }
}
