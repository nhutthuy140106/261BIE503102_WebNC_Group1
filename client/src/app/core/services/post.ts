import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, retry, throwError } from 'rxjs';
import { API_BASE, DATASET_BASE, USE_MOCK } from '../config/api.config';
import { Post, PostKind } from '../models/post';
import { stripAccents } from '../utils/slug-helper';

export interface PostFilter {
  q?: string;
  kind?: PostKind;
  min?: number;
  max?: number;
  block?: string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);
  private readonly url = USE_MOCK ? `${DATASET_BASE}/posts.json` : `${API_BASE}/posts`;

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(this.url).pipe(retry(3), catchError(this.handleError));
  }

  getPostById(id: string): Observable<Post | undefined> {
    return this.getPosts().pipe(map((list) => list.find((p) => p._id === id)));
  }

  /** Lọc phía client (mock). Khi có backend: đẩy filter lên query string. */
  search(filter: PostFilter): Observable<Post[]> {
    return this.getPosts().pipe(map((list) => list.filter((p) => matches(p, filter))));
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => new Error(error.message));
  }
}

function matches(p: Post, f: PostFilter): boolean {
  if (f.kind && p.kind !== f.kind) return false;
  if (f.block && p.block !== f.block) return false;
  if (f.min != null && p.price < f.min) return false;
  if (f.max != null && p.price > f.max) return false;
  if (f.q) {
    const q = stripAccents(f.q);
    if (!stripAccents(p.title).includes(q) && !stripAccents(p.description).includes(q)) {
      return false;
    }
  }
  return true;
}
