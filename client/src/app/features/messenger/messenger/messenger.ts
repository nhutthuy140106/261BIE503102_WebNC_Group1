import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Conversation, Message } from '../../../core/models/social';
import { ChatService } from '../../../core/services/chat';
import { stripAccents } from '../../../core/utils/slug-helper';
import { formatDateTime } from '../../../core/utils/status-label';

/** Messenger: danh sách hội thoại + khung chat. Nhắn tin không đổi trạng thái đơn. */
@Component({
  selector: 'app-messenger',
  standalone: false,
  styleUrl: './messenger.css',
  templateUrl: './messenger.html',
})
export class Messenger implements OnInit, OnDestroy {
  private readonly chat = inject(ChatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly fmt = formatDateTime;
  protected readonly input = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] });

  protected readonly query = signal('');
  protected readonly shown = computed(() => {
    const q = stripAccents(this.query().trim());
    return this.conversations().filter((c) => !q || stripAccents(c.withName + ' ' + (c.context?.label ?? '')).includes(q));
  });

  protected readonly selected = computed(() => this.conversations().find((c) => c._id === this.selectedId()) ?? null);

  /** Dòng xem trước dưới tên: tin cuối ("Bạn: …" nếu là tin của mình) */
  protected preview(c: Conversation): string {
    const m = c.messages[c.messages.length - 1];
    return m ? (m.mine ? 'Bạn: ' : '') + m.text : (c.context?.label ?? '');
  }

  /** Link tới bài / đơn gắn với cuộc trò chuyện */
  protected ctxLink(c: Conversation): string[] {
    const x = c.context;
    if (!x) return ['/orders'];
    return x.type === 'post' ? ['/posts', x.id] : x.type === 'job' ? ['/posts/job', x.id] : ['/orders', x.id];
  }

  protected ctxText(c: Conversation): string {
    return c.context?.type === 'post' || c.context?.type === 'job' ? 'Xem bài gốc' : 'Xem đơn hàng';
  }

  /** Hai tin cách nhau trên 30 phút thì chèn mốc giờ giữa chúng */
  protected gap(a: Message, b: Message): boolean {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() > 30 * 60 * 1000;
  }

  ngOnInit(): void {
    document.body.classList.add('no-footer');
    this.chat.list().subscribe({
      next: (rows) => {
        this.conversations.set(rows);
        this.loading.set(false);
        // /messenger/:chatId mở đúng hội thoại; id lạ hoặc không có thì mở hội thoại đầu
        const to = this.route.snapshot.queryParamMap.get('to');
        if (to) {
          this.chat.start(to, this.route.snapshot.queryParamMap.get('av') ?? undefined).subscribe((c) => {
            this.conversations.set(rows.some((x) => x._id === c._id) ? rows : [c, ...rows]);
            this.select(c);
          });
          return;
        }
        const wanted = rows.find((c) => c._id === this.route.snapshot.paramMap.get('chatId'));
        const first = wanted ?? rows[0];
        if (first) this.select(first, !!wanted);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  select(c: Conversation, keepUrl = false): void {
    this.selectedId.set(c._id);
    if (!keepUrl) this.router.navigate(['/messenger', c._id], { replaceUrl: true });
    // Tin nhắn nạp riêng cho từng hội thoại (API thật); mock trả lại đúng tin đã có
    this.chat.messages(c._id).subscribe((ms) => this.conversations.update((l) => l.map((x) => (x._id === c._id ? { ...x, messages: ms } : x))));
    if (c.unread > 0) {
      this.chat.markRead(c._id).subscribe(() =>
        this.conversations.update((l) => l.map((x) => (x._id === c._id ? { ...x, unread: 0 } : x))),
      );
    }
  }

  send(): void {
    const c = this.selected();
    if (!c || this.input.invalid || !this.input.value.trim()) return;
    this.chat.send(c._id, this.input.value).subscribe({
      next: (m) => {
        this.conversations.update((l) => l.map((x) => (x._id === c._id ? { ...x, messages: [...x.messages, m] } : x)));
        this.input.reset();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('no-footer');
  }
}
