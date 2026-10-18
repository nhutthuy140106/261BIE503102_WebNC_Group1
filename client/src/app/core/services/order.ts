import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, retry, throwError } from 'rxjs';
import { API_BASE, DATASET_BASE, USE_MOCK } from '../config/api.config';
import { Order } from '../models/order';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly url = USE_MOCK ? `${DATASET_BASE}/orders.json` : `${API_BASE}/orders`;

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.url, { withCredentials: true }).pipe(
      retry(3),
      catchError((e: HttpErrorResponse) => throwError(() => new Error(e.message))),
    );
  }
}
