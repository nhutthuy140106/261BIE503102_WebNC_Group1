import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DayHours, SellerPause, SellerShop } from '../models/seller';
import { ApiService } from './api';

/** Trang gian hàng công khai của server (GET /shops/:sellerId): hồ sơ + số liệu thật + người xem đã theo dõi chưa */
export interface PublicShop {
  shop: SellerShop;
  hours: DayHours[];
  pause: SellerPause | null;
  following: boolean;
}

/** Chỉ dùng ở chế độ thật; chế độ mẫu trang gian hàng tự đọc từ bài và lưu theo dõi trong trình duyệt */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly api = inject(ApiService);

  info(sellerId: string): Observable<PublicShop> {
    return this.api.get<PublicShop>(`/shops/${sellerId}`);
  }

  follow(sellerId: string): Observable<{ following: boolean; followers: number }> {
    return this.api.post(`/shops/${sellerId}/follow`);
  }

  unfollow(sellerId: string): Observable<{ following: boolean; followers: number }> {
    return this.api.deleteData<{ following: boolean; followers: number }>(`/shops/${sellerId}/follow`);
  }
}
