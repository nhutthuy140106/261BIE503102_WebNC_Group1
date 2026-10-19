import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';
import { formatDateTime, statusLabel } from '../../../core/utils/status-label';

type Tab = 'all' | 'placed' | 'received' | 'history';

const FINISHED = ['done', 'cancelled', 'rejected', 'withdrawn'];
/** Việc đã nhận đang chờ chính người dùng bấm (Bắt đầu làm / Báo hoàn thành) */
const NEEDS_ACTION = ['chosen', 'working'];

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
  protected readonly label = statusLabel;
  protected readonly fmt = formatDateTime;

  protected readonly needsAction = computed(() =>
    this.tab() === 'history' ? [] : this.base().filter((o) => o.type === 'received' && NEEDS_ACTION.includes(o.status)),
  );
  protected readonly ongoing = computed(() => this.base().filter((o) => !this.needsAction().includes(o)));

  private readonly base = computed(() => {
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
