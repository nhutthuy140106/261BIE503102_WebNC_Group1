import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Conversation, Message } from '../../../core/models/social';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';
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
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly fmt = formatDateTime;
  protected readonly input = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] });

  /** Đơn gắn với cuộc trò chuyện đang mở: lấy từ dữ liệu đơn thật để hiện ảnh + tên như trang Đơn hàng */
  protected readonly ctxOrder = signal<Order | null>(null);
  protected readonly query = signal('');
  protected readonly onlyUnread = signal(false);
  protected readonly unreadCount = computed(() => this.conversations().filter((c) => c.unread > 0).length);
  protected readonly shown = computed(() => {
    const q = stripAccents(this.query().trim());
    return this.conversations().filter((c) => (!this.onlyUnread() || c.unread > 0) && (!q || stripAccents(c.withName + ' ' + (c.context?.label ?? '')).includes(q)));
  });

  protected readonly selected = computed(() => this.conversations().find((c) => c._id === this.selectedId()) ?? null);

  /** Dòng xem trước dưới tên: tin cuối ("Bạn: …" nếu là tin của mình) */
  protected preview(c: Conversation): string {
    const m = c.messages[c.messages.length - 1];
    if (!m) return c.context?.label ?? '';
    const body = m.text || (m.media?.kind === 'image' ? 'Đã gửi một hình ảnh' : m.media?.kind === 'video' ? 'Đã gửi một video' : m.media ? 'Tin nhắn thoại' : '');
    return (m.mine ? 'Bạn: ' : '') + body;
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

  /** "5 phút", "2 giờ", "3 ngày" — thời gian ngắn gọn cạnh tin cuối (như Facebook) */
  protected short(iso: string): string {
    const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return 'Vừa xong';
    if (m < 60) return m + ' phút';
    if (m < 1440) return Math.floor(m / 60) + ' giờ';
    return Math.floor(m / 1440) + ' ngày';
  }

  protected lastTime(c: Conversation): string {
    const m = c.messages[c.messages.length - 1];
    return m ? this.short(m.createdAt) : '';
  }

  /** Vị trí của tin trong cụm tin liên tiếp cùng người gửi: bo góc nối liền như Facebook */
  protected pos(ms: Message[], i: number): string {
    const joined = (a?: Message, b?: Message) => !!a && !!b && a.mine === b.mine && !this.gap(a, b);
    const prev = joined(ms[i - 1], ms[i]);
    const next = joined(ms[i], ms[i + 1]);
    return prev && next ? 'mid' : prev ? 'last' : next ? 'first' : 'solo';
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
    this.ctxOrder.set(null);
    if (c.context && (c.context.type === 'order' || c.context.type === 'offer')) {
      this.orders.getOrder(c.context.id).subscribe({ next: (o) => this.selectedId() === c._id && this.ctxOrder.set(o), error: () => undefined });
    }
    if (!keepUrl) this.router.navigate(['/messenger', c._id], { replaceUrl: true });
    // Tin nhắn nạp riêng cho từng hội thoại (API thật); mock trả lại đúng tin đã có
    this.chat.messages(c._id).subscribe((ms) => this.conversations.update((l) => l.map((x) => (x._id === c._id ? { ...x, messages: ms } : x))));
    if (c.unread > 0) {
      this.chat.markRead(c._id).subscribe(() =>
        this.conversations.update((l) => l.map((x) => (x._id === c._id ? { ...x, unread: 0 } : x))),
      );
    }
  }

  /** Chọn hình / video: ảnh thu nhỏ rồi lưu dạng data URL, video giữ link tạm trong phiên */
  async attach(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const f of files) {
      if (f.type.startsWith('video/')) this.sendMedia({ kind: 'video', url: URL.createObjectURL(f) });
      else if (f.type.startsWith('image/')) this.sendMedia({ kind: 'image', url: await this.shrink(f) });
    }
  }

  private shrink(f: File): Promise<string> {
    return new Promise((ok) => {
      const img = new Image();
      const src = URL.createObjectURL(f);
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext('2d')?.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(src);
        ok(cv.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => ok(src);
      img.src = src;
    });
  }

  // ----- ghi âm giọng nói -----
  protected readonly recording = signal(false);
  protected readonly recSec = signal(0);
  private recorder: MediaRecorder | null = null;
  private recChunks: Blob[] = [];
  private recTimer: ReturnType<typeof setInterval> | null = null;
  private recCancel = false;

  async startRec(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recChunks = [];
      this.recCancel = false;
      this.recorder = new MediaRecorder(stream);
      this.recorder.ondataavailable = (e) => this.recChunks.push(e.data);
      this.recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (this.recTimer) clearInterval(this.recTimer);
        const sec = this.recSec();
        this.recording.set(false);
        if (!this.recCancel && sec > 0) this.sendMedia({ kind: 'audio', url: URL.createObjectURL(new Blob(this.recChunks, { type: 'audio/webm' })), sec });
      };
      this.recorder.start();
      this.recSec.set(0);
      this.recording.set(true);
      this.recTimer = setInterval(() => this.recSec.update((s) => s + 1), 1000);
    } catch {
      this.error.set('Không mở được micro. Bạn hãy cho phép trình duyệt dùng micro rồi thử lại.');
    }
  }

  stopRec(cancel = false): void {
    this.recCancel = cancel;
    this.recorder?.stop();
  }

  protected clock(s: number): string {
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  private sendMedia(media: NonNullable<Message['media']>): void {
    const c = this.selected();
    if (!c) return;
    this.chat.send(c._id, '', media).subscribe({
      next: (m) => this.conversations.update((l) => l.map((x) => (x._id === c._id ? { ...x, messages: [...x.messages, m] } : x))),
      error: (e: Error) => this.error.set(e.message),
    });
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
