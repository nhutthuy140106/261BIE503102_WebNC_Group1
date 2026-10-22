import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../../../core/models/order';
import { AreaService } from '../../../core/services/area';
import { AuthService } from '../../../core/services/auth';
import { DrawerService } from '../../../core/services/drawer';
import { OrderService } from '../../../core/services/order';
import { XuService } from '../../../core/services/xu';

const FINISHED = ['done', 'cancelled', 'rejected', 'withdrawn'];

/** Tôi — bê từ design/mockups/profile.html: đã lưu, địa chỉ, hoạt động, khu vực & AntXu, đăng xuất. */
@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly area = inject(AreaService);
  protected readonly xu = inject(XuService);
  protected readonly drawer = inject(DrawerService);
  private readonly orders = inject(OrderService);
  private readonly router = inject(Router);

  protected readonly stats = signal({ placed: 0, received: 0, running: 0, history: 0 });
  protected readonly showAllXu = signal(false);

  ngOnInit(): void {
    this.orders.getOrders().subscribe({
      next: (list: Order[]) =>
        this.stats.set({
          placed: list.filter((o) => o.type === 'placed' && !FINISHED.includes(o.status)).length,
          received: list.filter((o) => o.type === 'received' && !FINISHED.includes(o.status)).length,
          running: list.filter((o) => !FINISHED.includes(o.status)).length,
          history: list.filter((o) => FINISHED.includes(o.status)).length,
        }),
      error: () => undefined,
    });
  }

  protected date(ms: number): string {
    return new Date(ms).toLocaleDateString('vi-VN');
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/']));
  }
}
