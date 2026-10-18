import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';

@Component({
  selector: 'app-order-detail',
  standalone: false,
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) =>
          this.orderService.getOrders().pipe(map((list) => list.find((o) => o._id === params.get('id')))),
        ),
      )
      .subscribe({
        next: (o) => {
          this.order.set(o ?? null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
