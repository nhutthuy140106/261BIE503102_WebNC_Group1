import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OFFER_STATE_LABEL, Offer } from '../../../core/models/offer';
import { Order } from '../../../core/models/order';
import { PLACED_STATUS_LABEL, PlacedStatus } from '../../../core/models/order';
import { SellerService } from '../../../core/services/seller';
import {
  POSTER_LABEL, PosterAction, SELLER_ORDER_LABEL, SellerOrderAction, posterActions, sellerOrderActions,
} from '../../../core/utils/seller-state';

type Tab = 'orders' | 'offers';

/** Giao dịch = mặt còn lại của trang Đơn hàng: đơn khách đặt + đề nghị nhận việc cho việc tôi đăng. */
@Component({
  selector: 'app-transactions',
  standalone: false,
  styleUrl: './transactions.css',
  templateUrl: './transactions.html',
})
export class Transactions implements OnInit {
  private readonly seller = inject(SellerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly orders = signal<Order[]>([]);
  protected readonly offers = signal<Offer[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('orders');

  protected readonly orderLabel = (o: Order) => PLACED_STATUS_LABEL[o.status as PlacedStatus];
  protected readonly offerLabel = (o: Offer) => OFFER_STATE_LABEL[o.state];
  protected readonly orderActions = sellerOrderActions;
  protected readonly offerActions = posterActions;
  protected readonly orderBtn = SELLER_ORDER_LABEL;
  protected readonly offerBtn = POSTER_LABEL;

  protected readonly orderTodo = computed(() => this.orders().filter((o) => sellerOrderActions(o).length > 0).length);
  protected readonly offerTodo = computed(() => this.offers().filter((o) => posterActions(o).length > 0).length);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => this.tab.set(p.get('tab') === 'offers' ? 'offers' : 'orders'));
    forkJoin({ orders: this.seller.incomingOrders(), offers: this.seller.incomingOffers() }).subscribe({
      next: (r) => {
        this.orders.set(r.orders);
        this.offers.set(r.offers);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  setTab(t: Tab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t === 'offers' ? 'offers' : null } });
  }

  runOrder(o: Order, a: SellerOrderAction): void {
    this.error.set(null);
    this.seller.orderAction(o._id, a).subscribe({
      next: (n) => this.orders.update((l) => l.map((x) => (x._id === n._id ? n : x))),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  runOffer(o: Offer, a: PosterAction): void {
    this.error.set(null);
    this.seller.offerAction(o._id, a).subscribe({
      next: (list) => this.offers.set(list),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
