import { Injectable, computed, signal } from '@angular/core';

export interface CartLine {
  postId: string;
  title: string;
  price: number;
  quantity: number;
}

/**
 * Nháp đơn tạm. Hiện giữ trong bộ nhớ trình duyệt;
 * khi có backend sẽ chuyển sang session phía server (POST /api/cart/add, GET /api/cart).
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  readonly lines = signal<CartLine[]>([]);
  readonly total = computed(() => this.lines().reduce((s, l) => s + l.price * l.quantity, 0));

  add(line: Omit<CartLine, 'quantity'>, quantity = 1): void {
    this.lines.update((ls) => {
      const found = ls.find((l) => l.postId === line.postId);
      return found
        ? ls.map((l) => (l === found ? { ...l, quantity: l.quantity + quantity } : l))
        : [...ls, { ...line, quantity }];
    });
  }

  clear(): void {
    this.lines.set([]);
  }
}
