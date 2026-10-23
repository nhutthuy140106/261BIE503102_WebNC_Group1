import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { Conversation, Message } from '../models/social';
import { conversationFromApi, messageFromApi } from '../utils/api-mappers';
import { ApiService } from './api';
import { AuthService } from './auth';
import { MockDb } from './mock-db';

const COLLECTION = 'conversations';

/** Messenger (docs/api-buyer-job.md mục 9). Nhắn tin KHÔNG đổi trạng thái đơn. Realtime: chờ Q7. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);
  private readonly auth = inject(AuthService);

  list(): Observable<Conversation[]> {
    return useMock('chat') ? this.db.list<Conversation>(COLLECTION) : this.api.get<unknown[]>('/conversations').pipe(map((l) => l.map(conversationFromApi)));
  }

  /** Tin nhắn của một hội thoại (mock đã nằm sẵn trong hội thoại). */
  messages(conversationId: string): Observable<Message[]> {
    if (!useMock('chat')) {
      const me = this.auth.currentUser()?._id ?? '';
      return this.api.get<unknown[]>(`/conversations/${conversationId}/messages`, { limit: 100 }).pipe(
        map((l) => l.map((m) => messageFromApi(m, me)).reverse()),
      );
    }
    return this.db.list<Conversation>(COLLECTION).pipe(map((rows) => rows.find((c) => c._id === conversationId)?.messages ?? []));
  }

  send(conversationId: string, text: string, media?: Message['media']): Observable<Message> {
    if (!useMock('chat')) return this.api.post<unknown>(`/conversations/${conversationId}/messages`, { text }).pipe(
      map((m) => messageFromApi(m, this.auth.currentUser()?._id ?? '')),
    );
    return this.db.list<Conversation>(COLLECTION).pipe(
      map((rows) => {
        const t = text.trim();
        if ((!t && !media) || t.length > 2000) {
          throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [{ field: 'text', message: 'Tin nhắn dài 1–2000 ký tự.' }]);
        }
        const msg: Message = { _id: this.db.newId(), mine: true, text: t, ...(media ? { media } : {}), createdAt: new Date().toISOString() };
        this.db.save(
          COLLECTION,
          rows.map((c) => (c._id === conversationId ? { ...c, messages: [...c.messages, msg] } : c)),
        );
        return msg;
      }),
    );
  }

  /** Mở cuộc trò chuyện mới với một người (mock). Có rồi thì trả lại cuộc cũ. API thật: tạo theo id người nhận ở bước nối server. */
  start(withName: string, withAvatar?: string): Observable<Conversation> {
    return this.db.list<Conversation>(COLLECTION).pipe(
      map((rows) => {
        const cur = rows.find((c) => c.withName === withName);
        if (cur) return cur;
        const c: Conversation = { _id: this.db.newId(), withName, withAvatar, unread: 0, messages: [] };
        this.db.save(COLLECTION, [c, ...rows]);
        return c;
      }),
    );
  }

  markRead(conversationId: string): Observable<void> {
    if (!useMock('chat')) return this.api.post<void>(`/conversations/${conversationId}/read`);
    return this.db.list<Conversation>(COLLECTION).pipe(
      map((rows) => {
        this.db.save(COLLECTION, rows.map((c) => (c._id === conversationId ? { ...c, unread: 0 } : c)));
      }),
    );
  }
}
