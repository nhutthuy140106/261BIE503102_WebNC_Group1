import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { KIND_LABEL } from '../../../core/models/post';
import { SELLER_KIND_ICON } from '../../../core/models/seller';
import { SellerJobView, SellerOrderView, SellerSpaceService, dayLabel } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';

type Filter = '' | 'placed' | 'jobs' | 'hist';
interface Row {
  key: string;
  link: string[];
  ended: boolean;
  need: boolean;
  image?: string;
  icon: string;
  iconText: string;
  tag: string;
  job: boolean;
  title: string;
  sub: string;
  amount: number;
  stat: string;
  cls: string;
}

/**
 * Giao dịch — mặt còn lại của trang Đơn hàng phía Mua (design/mockups/seller-orders.html):
 * cùng mã đơn, cùng tên bước. Tất cả / Đơn khách đặt / Việc bạn đăng / Lịch sử; nhóm Cần bạn xử lý · Đang diễn ra.
 */
@Component({
  selector: 'app-seller-orders',
  standalone: false,
  templateUrl: './seller-orders.html',
  styleUrls: ['../seller-ui.css', './seller-orders.css'],
})
export class SellerOrders implements OnInit {
  private readonly seller = inject(SellerSpaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly f = toSignal(this.route.queryParamMap.pipe(map((q) => (q.get('f') ?? '') as Filter)), { initialValue: '' as Filter });

  private readonly rows = computed<Row[]>(() => [
    ...this.seller.orders().map((o) => this.orderRow(o)),
    ...this.seller.jobs().map((j) => this.jobRow(j)),
  ]);

  protected readonly counts = computed(() => {
    const r = this.rows();
    return {
      placed: r.filter((x) => !x.job && !x.ended).length,
      jobs: r.filter((x) => x.job && !x.ended).length,
      hist: r.filter((x) => x.ended).length,
    };
  });

  private readonly shown = computed(() => {
    const f = this.f();
    if (f === 'hist') return this.rows().filter((x) => x.ended);
    return this.rows().filter((x) => !x.ended && (!f || (f === 'placed') === !x.job));
  });
  protected readonly need = computed(() => this.shown().filter((x) => x.need && !x.ended));
  protected readonly active = computed(() => this.shown().filter((x) => !x.need && !x.ended));
  protected readonly old = computed(() => this.shown().filter((x) => x.ended));

  ngOnInit(): void {
    this.seller.load().subscribe();
  }

  protected setF(f: Filter): void {
    this.router.navigate([], { queryParams: { f: f || null }, replaceUrl: true });
  }

  protected reset(e: Event): void {
    e.preventDefault();
    this.seller.reset().subscribe(() => this.toast.show('Đã đặt lại dữ liệu mẫu'));
  }

  private orderRow(o: SellerOrderView): Row {
    const how = o.fulfil === 'pickup' ? 'Tự lấy' : o.fulfil === 'home' ? 'Làm tại nhà' : 'Giao';
    return {
      key: o.id, link: ['/seller/orders', o.id], ended: o.ended, need: o.need, image: o.image, icon: o.icon ?? SELLER_KIND_ICON[o.kind], iconText: KIND_LABEL[o.kind],
      tag: 'Đơn khách đặt', job: false, title: o.title, sub: `${o.buyer.name} · ${how} ${o.time} · ${dayLabel(o.day).toLowerCase()} · ${o.code}`,
      amount: o.total, stat: o.cancelRequest ? 'Khách xin hủy' : o.label, cls: o.cls,
    };
  }

  private jobRow(j: SellerJobView): Row {
    const reported = j.offers.some((o) => o.state === 'reported');
    const asked = j.questions.some((q) => !q.answer) && !j.waiting.length;
    return {
      key: j.id, link: ['/seller/jobs', j.id], ended: !!j.closed, need: j.need, icon: 'hand', iconText: j.category,
      tag: 'Việc bạn đăng', job: true, title: j.title, sub: `${j.when} · ${j.offers.length} người đề nghị · ${j.code}`,
      amount: j.pay, stat: j.need && reported ? 'Đã báo xong' : asked ? 'Có câu hỏi mới' : j.label, cls: j.cls,
    };
  }
}
