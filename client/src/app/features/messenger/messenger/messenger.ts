import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Conversation } from '../../../core/models/social';
import { ChatService } from '../../../core/services/chat';
import { formatDateTime } from '../../../core/utils/status-label';

/** Messenger: danh sách hội thoại + khung chat. Nhắn tin không đổi trạng thái đơn. */
@Component({
  selector: 'app-messenger',
  standalone: false,
  styleUrl: './messenger.css',
  templateUrl: './messenger.html',
})
export class Messenger implements OnInit {
  private readonly chat = inject(ChatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly fmt = formatDateTime;
  protected readonly input = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] });

  protected readonly selected = computed(() => this.conversations().find((c) => c._id === this.selectedId()) ?? null);

  ngOnInit(): void {
    this.chat.list().subscribe({
      next: (rows) => {
        this.conversations.set(rows);
        this.loading.set(false);
        // /messenger/:chatId mở đúng hội thoại; id lạ hoặc không có thì mở hội thoại đầu
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
}
