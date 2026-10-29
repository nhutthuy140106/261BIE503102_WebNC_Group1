import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { localAssistant } from '../utils/assistant-local';
import { ApiService } from './api';
import { OrderService } from './order';
import { PostService } from './post';

/** Thẻ bài trợ lý gợi ý (server trả từ kho bài đăng thật). */
export interface AssistantCard {
  id: string;
  kind: 'food' | 'goods' | 'service' | 'job';
  title: string;
  price: number;
  unit?: string;
  sellerName: string;
  area?: string;
  image?: string;
  slug?: string;
}

export interface AssistantReply {
  reply: string;
  cards: AssistantCard[];
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Chatbot tư vấn (POST /assistant/chat — Gemini hoặc bộ trả lời cơ bản ở server). */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = inject(ApiService);
  private readonly posts = inject(PostService);
  private readonly orders = inject(OrderService);

  ask(history: AssistantTurn[]): Observable<AssistantReply> {
    if (useMock('assistant')) {
      // Dữ liệu mẫu: trả lời ngay trên trình duyệt (không cần máy chủ). Mở `?mock=0` để dùng trợ lý AI của máy chủ.
      const users = history.filter((t) => t.role === 'user');
      const last = users[users.length - 1]?.content ?? '';
      const prev = users[users.length - 2]?.content;
      return forkJoin({ posts: this.posts.getPosts(), orders: this.orders.getOrders() }).pipe(
        map(({ posts, orders }) =>
          localAssistant(last, prev, posts, orders.filter((o) => o.type === 'placed' && !['done', 'cancelled', 'declined'].includes(o.status)).slice(0, 5).map((o) => `• ${o.code} · ${o.postTitle} — ${o.total.toLocaleString('vi-VN')}đ`)),
        ),
      );
    }
    return this.api.post<AssistantReply>('/assistant/chat', { messages: history });
  }
}

/** Chỉ gửi tối đa 10 lượt gần nhất, mỗi lượt cắt 500 ký tự (khớp giới hạn của server). */
export function trimHistory(turns: AssistantTurn[]): AssistantTurn[] {
  const last = turns.slice(-10).map((t) => ({ role: t.role, content: t.content.slice(0, 500) }));
  // server yêu cầu tin đầu là của người dùng
  while (last.length && last[0].role !== 'user') last.shift();
  return last;
}
