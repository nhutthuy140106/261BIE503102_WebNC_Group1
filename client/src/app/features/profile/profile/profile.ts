import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../../core/models/order';
import { AreaService } from '../../../core/services/area';
import { AuthService } from '../../../core/services/auth';
import { OrderService } from '../../../core/services/order';
import { SavedService } from '../../../core/services/saved';
import { XuService } from '../../../core/services/xu';

const FINISHED = ['done', 'cancelled', 'rejected', 'withdrawn'];

type Tab = 'overview' | 'saved' | 'addresses' | 'xu' | 'area';

/**
 * Tôi — trung tâm tài khoản kiểu "Tài khoản của tôi": menu bên trái, mỗi mục một khung nội dung riêng
 * (thay cho một trang dài xếp chồng nhiều mục). Mục đang mở nằm trên URL: /profile?tab=xu.
 */
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
  protected readonly saved = inject(SavedService);
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tab = signal<Tab>('overview');
  protected readonly stats = signal({ placed: 0, received: 0, history: 0 });
  protected readonly showAllXu = signal(false);
  protected readonly ledger = computed(() => (this.showAllXu() ? this.xu.ledger() : this.xu.ledger().slice(0, 6)));

  protected readonly menu: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'saved', label: 'Bài đã lưu' },
    { key: 'addresses', label: 'Địa chỉ của tôi' },
    { key: 'xu', label: 'AntXu & voucher' },
    { key: 'area', label: 'Khu vực' },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => {
      const t = p.get('tab') as Tab | null;
      this.tab.set(t && this.menu.some((m) => m.key === t) ? t : 'overview');
    });
    this.orders.getOrders().subscribe({
      next: (list: Order[]) =>
        this.stats.set({
          placed: list.filter((o) => o.type === 'placed' && !FINISHED.includes(o.status as string)).length,
          received: list.filter((o) => o.type === 'received' && !FINISHED.includes(o.status as string)).length,
          history: list.filter((o) => FINISHED.includes(o.status as string)).length,
        }),
      error: () => undefined,
    });
  }

  protected go(t: Tab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t === 'overview' ? null : t } });
  }

  protected badge(t: Tab): string {
    return t === 'xu' ? String(this.xu.balance()) : '';
  }

  protected date(ms: number): string {
    return new Date(ms).toLocaleDateString('vi-VN');
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/']));
  }
}
