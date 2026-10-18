import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';

type Tab = 'all' | 'placed' | 'received' | 'history';

const FINISHED = ['done', 'cancelled', 'rejected', 'withdrawn'];

/** Đơn hàng: Tất cả · Đơn đã đặt · Việc đã nhận · Lịch sử (đơn đã kết thúc). */
@Component({
  selector: 'app-order-list',
  standalone: false,
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderList implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('all');

  protected readonly visible = computed(() => {
    const t = this.tab();
    return this.orders().filter((o) => {
      const finished = FINISHED.includes(o.status);
      if (t === 'history') return finished;
      if (finished) return false;
      return t === 'all' || (t === 'placed' ? o.type === 'placed' : o.type === 'received');
    });
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => {
      const f = p.get('f');
      this.tab.set(f === 'placed' || f === 'received' || f === 'history' ? f : 'all');
    });
    this.orderService.getOrders().subscribe({
      next: (list) => {
        this.orders.set(list);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  setTab(t: Tab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { f: t === 'all' ? null : t } });
  }
}
