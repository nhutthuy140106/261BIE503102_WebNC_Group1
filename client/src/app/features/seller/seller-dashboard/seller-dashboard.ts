import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Offer } from '../../../core/models/offer';
import { Order } from '../../../core/models/order';
import { Post } from '../../../core/models/post';
import { SellerService } from '../../../core/services/seller';
import { posterActions, sellerOrderActions } from '../../../core/utils/seller-state';

interface Stat {
  label: string;
  value: number;
  link: string;
  query?: Record<string, string>;
  hot?: boolean;
}

/** Tổng quan: chỉ đếm từ dữ liệu thật của tôi, không số giả. */
@Component({
  selector: 'app-seller-dashboard',
  standalone: false,
  styleUrl: './seller-dashboard.css',
  templateUrl: './seller-dashboard.html',
})
export class SellerDashboard implements OnInit {
  private readonly seller = inject(SellerService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly posts = signal<Post[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly offers = signal<Offer[]>([]);

  protected readonly stats = computed<Stat[]>(() => {
    const openPosts = this.posts().filter((p) => !p.closed).length;
    const ordersTodo = this.orders().filter((o) => sellerOrderActions(o).length > 0).length;
    const offersTodo = this.offers().filter((o) => posterActions(o).length > 0).length;
    return [
      { label: 'Bài đang mở', value: openPosts, link: '/seller/posts' },
      { label: 'Đơn cần xử lý', value: ordersTodo, link: '/seller/transactions', hot: ordersTodo > 0 },
      { label: 'Đề nghị nhận việc cần xử lý', value: offersTodo, link: '/seller/transactions', query: { tab: 'offers' }, hot: offersTodo > 0 },
    ];
  });

  ngOnInit(): void {
    forkJoin({ posts: this.seller.myPosts(), orders: this.seller.incomingOrders(), offers: this.seller.incomingOffers() }).subscribe({
      next: (r) => {
        this.posts.set(r.posts);
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
}
