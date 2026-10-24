import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ORDER_ACTION } from '../../../core/config/order-actions';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';
import { stripAccents } from '../../../core/utils/slug-helper';
import { formatDateTime, statusLabel } from '../../../core/utils/status-label';

type Tab = 'all' | 'todo' | 'placed' | 'received' | 'history';

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
  protected readonly act = ORDER_ACTION;
  protected readonly fmt = formatDateTime;

  protected readonly counts = computed(() => {
    const l = this.orders();
    const run = l.filter((o) => !isEnded(o));
    return {
      all: run.length,
      todo: run.filter(needsAction).length,
      placed: run.filter((o) => o.type === 'placed').length,
      received: run.filter((o) => o.type === 'received').length,
      history: l.filter(isEnded).length,
    };
  });

  protected readonly query = signal('');

  /** Đơn của tab đang chọn (+ ô tìm theo tên đơn, người bán/người đăng, mã đơn), đơn cần bạn xử lý xếp trước */
  protected readonly shown = computed(() => {
    const t = this.tab();
    const q = stripAccents(this.query().trim());
    return this.orders()
      .filter((o) => {
        if (t === 'history') return isEnded(o);
        if (isEnded(o)) return false;
        if (t === 'todo') return needsAction(o);
        return t === 'all' || (t === 'placed' ? o.type === 'placed' : o.type === 'received');
      })
      .filter((o) => !q || stripAccents(o.postTitle + ' ' + o.counterpartName + ' ' + o.code).includes(q))
      .sort((a, b) => Number(needsAction(b)) - Number(needsAction(a)));
  });

  protected isEnded(o: Order): boolean {
    return isEnded(o);
  }

  /** Chia danh sách theo nhóm như bản mẫu: Cần bạn xử lý · Đang diễn ra · Chờ xác nhận (Lịch sử giữ một danh sách phẳng) */
  protected readonly groups = computed(() => {
    const list = this.shown();
    if (this.tab() === 'history') return [{ key: 'history', title: '', items: list }].filter((g) => g.items.length);
    const need = list.filter(needsAction);
    const rest = list.filter((o) => !needsAction(o));
    return [
      { key: 'todo', title: 'Cần bạn xử lý', items: need },
      { key: 'go', title: 'Đang diễn ra', items: rest.filter((o) => this.dot(o) === 'go') },
      { key: 'wait', title: 'Chờ xác nhận', items: rest.filter((o) => this.dot(o) !== 'go') },
    ].filter((g) => g.items.length);
  });

  protected isTodo(o: Order): boolean {
    return needsAction(o);
  }

  /** Chấm trạng thái: cam = cần bạn làm, xanh = đang chạy, vàng = chờ người kia, xám = đã xong */
  protected dot(o: Order): string {
    if (needsAction(o)) return 'act';
    if (isEnded(o)) return 'end';
    return ['chosen', 'working', 'confirmed', 'preparing', 'delivering', 'ready'].includes(o.status as string) ? 'go' : 'wait';
  }

  /** Nút nhỏ trên thanh trạng thái: ghi rõ việc bạn cần làm tiếp (null = không cần làm gì) */
  protected next(o: Order): string | null {
    if (!needsAction(o)) return null;
    const A = ORDER_ACTION;
    if (o.type === 'received') return o.status === 'chosen' ? A.start : o.status === 'working' ? A.finish : !o.paid ? A.confirmPaid : A.rate;
    if (o.status === 'pricing') return A.approvePrice;
    if (o.resched?.by === 'seller') return A.approveResched;
    return A.viewIssue;
  }

  /** Nút chính khi đơn đã xong: đặt lại món/dịch vụ, hoặc tìm việc khác */
  protected side(o: Order): { label: string; link: unknown[]; params?: Record<string, string | undefined> } {
    return o.type === 'received'
      ? { label: ORDER_ACTION.findJob, link: ['/search'], params: { kind: 'job' } }
      : { label: ORDER_ACTION.reorder, link: ['/posts', o.postId] };
  }

  /** Một câu nói rõ đơn đang ở đâu và ai đang chờ ai */
  protected hint(o: Order): string {
    const n = o.counterpartName;
    const money = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
    const st = o.status as string;
    if (o.type === 'received') {
      const m: Record<string, string> = {
        offered: 'Chờ ' + n + ' chọn người',
        chosen: 'Bạn được chọn — đến giờ bấm Bắt đầu làm',
        working: 'Đang làm — xong thì báo hoàn thành',
        reported: 'Chờ ' + n + ' xác nhận (tự hoàn thành sau 24 giờ)',
        done: !o.paid ? 'Xong việc — xác nhận đã nhận ' + money(o.total) + ' tiền công' : !o.rated ? 'Đã nhận tiền công — mời bạn đánh giá' : 'Hoàn thành',
        rejected: n + ' đã chọn người khác',
        withdrawn: 'Bạn đã rút đề nghị',
        cancelled: 'Việc đã hủy',
      };
      return m[st] ?? '';
    }
    if (o.issue && o.issue.st !== 'closed') return o.issue.st === 'open' ? 'Đã gửi yêu cầu — chờ ' + n + ' trả lời' : n + ' đã trả lời yêu cầu của bạn';
    if (o.resched?.by === 'seller') return n + ' xin đổi giờ sang ' + o.resched.to;
    if (o.resched?.by === 'buyer') return 'Chờ ' + n + ' đồng ý đổi giờ';
    const m: Record<string, string> = {
      pending: 'Chờ ' + n + ' xác nhận',
      confirmed: n + ' đã nhận đơn',
      pricing: n + ' báo giá cuối ' + money(o.newPrice?.total ?? o.total) + ' (lúc đặt ' + money(o.total) + ') — chờ bạn đồng ý',
      preparing: o.kind === 'service' ? n + ' đang làm' : n + ' đang chuẩn bị',
      delivering: 'Đang giao tới bạn',
      ready: 'Sẵn sàng — bạn qua lấy',
      done: 'Đã nhận hàng',
      cancelled: o.cancelBy === 'seller' ? n + ' đã hủy đơn' : 'Đã hủy',
      declined: n + ' không nhận đơn',
    };
    return m[st] ?? '';
  }

  /** Mốc thời gian ở dòng đơn, chỉ ghi ngày giờ: đơn đặt = lúc đặt; việc đã nhận = lúc bắt đầu gửi đề nghị */
  protected when(o: Order): string {
    return formatDateTime(o.createdAt);
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => {
      const f = p.get('f');
      this.tab.set(f === 'todo' || f === 'placed' || f === 'received' || f === 'history' ? f : 'all');
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
