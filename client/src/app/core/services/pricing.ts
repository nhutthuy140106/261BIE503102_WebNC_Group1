import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { PostKind } from '../models/post';
import { PriceSuggestion, suggestPrice } from '../utils/price-suggest';
import { ApiService } from './api';
import { PostService } from './post';

/** Gợi ý giá khi đăng bài/việc. Mock: tính ở FE từ dữ liệu mẫu; thật: GET /pricing/suggest (kNN TF-IDF ở BE). */
@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly api = inject(ApiService);
  private readonly posts = inject(PostService);

  suggest(kind: PostKind, title: string): Observable<PriceSuggestion | null> {
    if (!useMock('recommend')) return this.api.get<PriceSuggestion | null>('/pricing/suggest', { kind, title });
    return this.posts.getPosts().pipe(map((all) => suggestPrice(kind, title, all)));
  }
}
