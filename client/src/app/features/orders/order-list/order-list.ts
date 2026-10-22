import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';
import { formatDateTime, statusLabel } from '../../../core/utils/status-label';

type Tab = 'all' | 'placed' | 'received' | 'history';

/** Việc đã nhận đã xong hẳn: bị loại / rút / hủy, hoặc hoàn thành + đã nhận tiền + đã đánh giá */
function receivedEnded(o: Order): boolean {
  return ['rejected', 'withdrawn', 'cancelled'].includes(o.status as string) || (o.status === 'done' && !!o.paid && !!o.rated);
}

/** Đơn đã đặt đã xong hẳn: hoàn thành / hủy / bị từ chối và không còn yêu cầu báo vấn đề đang xử lý */
function placedEnded(o: Order): boolean {
  return ['done', 'cancelled', 'declined'].includes(o.status as string) && !(o.issue && o.issue.st !== 'closed');
}

export function isEnded(o: Order): boolean {
  return o.type === 'received' ? receivedEnded(o) : placedEnded(o);
}

/** Đơn đang chờ chính người dùng bấm bước tiếp theo */
export function needsAction(o: Order): boolean {
  if (isEnded(o)) return false;
  if (o.type === 'received') {
    return ['chosen', 'working'].includes(o.status as string) || (o.status === 'done' && (!o.paid || !o.rated));
  }
  return o.status === 'pricing' || o.resched?.by === 'seller' || (!!o.issue && o.issue.st !== 'closed' && o.issue.st !== 'open');
}

/** Đơn hàng: Tất cả · Đơn đã đặt · Việc đã nhận · Lịch sử. Thanh tab chữ, dòng đơn phẳng. */
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

  protected readonly counts = computed(() => {
    const l = this.orders();
    const run = l.filter((o) => !isEnded(o));
    return {
      all: run.length,
      placed: run.filter((o) => o.type === 'placed').length,
      received: run.filter((o) => o.type === 'received').length,
      history: l.filter(isEnded).length,
    };
  });

  private readonly base = computed(() => {
    const t = this.tab();
    return this.orders().filter((o) => {
      if (t === 'history') return isEnded(o);
      if (isEnded(o)) return false;
      return t === 'all' || (t === 'placed' ? o.type === 'placed' : o.type === 'received');
    });
  });
  protected readonly todo = computed(() => (this.tab() === 'history' ? [] : this.base().filter(needsAction)));
  protected readonly ongoing = computed(() => (this.tab() === 'history' ? this.base() : this.base().filter((o) => !needsAction(o))));

  protected isTodo(o: Order): boolean {
    return needsAction(o);
  }

  /** Chấm trạng thái: cam = cần bạn làm, xanh = đang chạy, vàng = chờ người kia, xám = đã xong */
  protected dot(o: Order): string {
    if (needsAction(o)) return 'act';
    if (isEnded(o)) return 'end';
    return ['chosen', 'working', 'confirmed', 'preparing', 'delivering', 'ready'].includes(o.status as string) ? 'go' : 'wait';
  }

  /** Việc bạn cần làm tiếp (nút đầu thẻ, màu cam); null = không có */
  protected next(o: Order): string | null {
    if (!needsAction(o)) return null;
    if (o.type === 'received') return o.status === 'chosen' ? 'Bắt đầu làm' : o.status === 'working' ? 'Báo hoàn thành' : !o.paid ? 'Xác nhận tiền công' : 'Đánh giá';
    if (o.status === 'pricing') return 'Duyệt giá';
    if (o.resched?.by === 'seller') return 'Duyệt giờ mới';
    return 'Xem phản hồi';
  }

  /** Nút phụ đầu thẻ khi không có việc cần làm: đơn xong → đặt lại / tìm việc khác, đơn đang chạy → nhắn tin */
  protected side(o: Order): { label: string; link: unknown[]; params?: Record<string, string | undefined> } {
    if (isEnded(o)) {
      return o.type === 'received'
        ? { label: 'Tìm việc khác', link: ['/search'], params: { kind: 'job' } }
        : { label: 'Đặt lại', link: ['/posts', o.postId] };
    }
    return { label: 'Nhắn tin', link: ['/messenger'], params: { to: o.counterpartName, av: o.counterpartAvatar } };
  }

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
