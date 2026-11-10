import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Conversation, Message } from '../../../core/models/social';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';
import { ChatService } from '../../../core/services/chat';
import { stripAccents } from '../../../core/utils/slug-helper';
import { formatDateTime, statusLabel } from '../../../core/utils/status-label';
import { isEnded, needsAction } from '../../orders/order-list/order-list';

/** Messenger: danh sách hội thoại + khung chat. Nhắn tin không đổi trạng thái đơn. */
@Component({
  selector: 'app-messenger',
  standalone: false,
  styleUrl: './messenger.css',
  templateUrl: './messenger.html',
})
export class Messenger implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgs') private msgs?: ElementRef<HTMLElement>;
  private lastKey = '';
  private lastHeight = 0;
  /** Đang ở cuối khung chat: nội dung nạp thêm (thẻ đơn, tin) thì bám theo xuống cuối */
  private stick = true;

  /** Cuộn xuống tin mới nhất khi đổi hội thoại, có tin mới, hoặc khung cao thêm lúc đang ở cuối */
  ngAfterViewChecked(): void {
    const el = this.msgs?.nativeElement;
    if (!el) return;
    // ảnh (thẻ đơn, tin có ảnh) tải xong sau khi đã cuộn: khung cao thêm thì bám xuống cuối
    if (!el.dataset['watch']) {
      el.dataset['watch'] = '1';
      el.addEventListener('load', () => { if (this.stick) el.scrollTop = el.scrollHeight; }, true);
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (this.stick) el.scrollTop = el.scrollHeight; }).observe(el);
      // tin mới vẽ ra (kể cả khi Angular chỉ vẽ lại phần tin, không gọi ngAfterViewChecked)
      new MutationObserver(() => { if (this.stick) el.scrollTop = el.scrollHeight; }).observe(el, { childList: true, subtree: true });
    }
    const key = `${this.selectedId()}:${this.selected()?.messages.length ?? 0}`;
    if (this.lastKey !== key) this.stick = true;
    if (this.lastKey !== key || (this.stick && el.scrollHeight !== this.lastHeight)) {
      this.lastKey = key;
      el.scrollTop = el.scrollHeight;
    }
    this.lastHeight = el.scrollHeight;
  }

  protected onScroll(el: HTMLElement): void {
    this.stick = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  /** Ngày (giờ máy) của một thời điểm: mốc ngày giữa hai tin khác ngày */
  protected dayOf(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  protected dayLabel(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  protected timeOf(iso: string): string {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  protected sizeText(b?: number): string {
    if (!b) return '';
    return b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  /** Tệp bất kỳ (PDF, Word…): tối đa 10MB; tệp nhỏ lưu luôn nội dung để tải lại được */
  async attachFiles(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        this.error.set(`"${f.name}" lớn hơn 10MB, chưa gửi được.`);
        continue;
      }
      const url = f.size <= 1024 * 1024
        ? await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(URL.createObjectURL(f)); r.readAsDataURL(f); })
        : URL.createObjectURL(f);
      this.sendMedia({ kind: 'file', url, name: f.name, size: f.size });
    }
  }

  /** Enter gửi, Shift+Enter xuống dòng */
  protected key(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  /** Ô nhập tự cao theo nội dung */
  protected grow(el: HTMLTextAreaElement): void {
    el.style.height = '44px';
    el.style.height = Math.min(120, el.scrollHeight) + 'px';
  }

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
  /** Mọi đơn/việc của người dùng (nạp một lần) — để hiện hết các đơn với người đang nhắn, không chỉ một đơn. */
  private readonly allOrders = signal<Order[]>([]);
  protected readonly showAllOrders = signal(false);
  private static readonly VISIBLE = 2;

  /** Các đơn giữa mình và người đang nhắn: đơn đang trao đổi lên đầu, rồi đơn còn chạy, rồi đơn đã xong (mới trước). */
  protected readonly related = computed(() => {
    const c = this.selected();
    if (!c) return [];
    const ctxId = c.context?.id;
    const rank = (o: Order) => (o._id === ctxId ? 0 : isEnded(o) ? 2 : 1);
    return this.allOrders()
      .filter((o) => o.counterpartName === c.withName)
      .sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  });
  protected readonly relatedShown = computed(() => (this.showAllOrders() ? this.related() : this.related().slice(0, Messenger.VISIBLE)));
  protected readonly relatedHidden = computed(() => Math.max(0, this.related().length - Messenger.VISIBLE));

  /** Các đơn với người đang nhắn, cũ trước mới sau: mỗi đơn hiện trong luồng chat đúng lúc đặt */
  private readonly orderTimeline = computed(() => [...this.related()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));

  /** Đơn đặt trong khoảng giữa tin liền trước và tin thứ i */
  protected cardsBefore(ms: Message[], i: number): Order[] {
    const prev = i > 0 ? Date.parse(ms[i - 1].createdAt) : -Infinity;
    const cur = Date.parse(ms[i].createdAt);
    return this.orderTimeline().filter((o) => Date.parse(o.createdAt) > prev && Date.parse(o.createdAt) <= cur);
  }

  /** Đơn đặt sau tin cuối cùng (hoặc chưa có tin nào) */
  protected cardsAfter(ms: Message[]): Order[] {
    const last = ms.length ? Date.parse(ms[ms.length - 1].createdAt) : -Infinity;
    return this.orderTimeline().filter((o) => Date.parse(o.createdAt) > last);
  }

  protected statusOf(o: Order): string {
    return statusLabel(o);
  }

  /** Chấm trạng thái giống danh sách đơn: cam = cần bạn làm, xanh = đang chạy, vàng = chờ người kia, xám = đã xong */
  protected dotOf(o: Order): string {
    if (needsAction(o)) return 'act';
    if (isEnded(o)) return 'end';
    return ['chosen', 'working', 'confirmed', 'preparing', 'delivering', 'ready'].includes(o.status as string) ? 'go' : 'wait';
  }

  protected orderLink(o: Order): string[] {
    return ['/orders', o._id];
  }

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
    const body = m.text || (m.media?.kind === 'image' ? 'Đã gửi một ảnh' : m.media?.kind === 'video' ? 'Đã gửi một video' : m.media?.kind === 'file' ? 'Đã gửi một tệp' : m.media ? 'Đã gửi một tin nhắn thoại' : '');
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

  /** Giờ cạnh tin cuối như khu Bán: hôm nay ghi giờ, hôm qua ghi "Hôm qua", cũ hơn ghi ngày */
  protected lastTime(c: Conversation): string {
    const m = c.messages[c.messages.length - 1];
    if (!m) return '';
    const d = new Date(m.createdAt);
    const today = new Date();
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (this.dayOf(m.createdAt) === this.dayOf(today.toISOString())) return this.timeOf(m.createdAt);
    if (this.dayOf(m.createdAt) === this.dayOf(y.toISOString())) return 'Hôm qua';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
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
    this.orders.getOrders().subscribe({ next: (l) => this.allOrders.set(l), error: () => undefined });
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
        // như Facebook: vào trang chưa mở cuộc nào, để các tin chưa đọc còn nổi bật cho tới khi bạn bấm vào
        if (wanted) this.select(wanted, true);
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
    this.showAllOrders.set(false);
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
    this.picMenu.set(false);
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

  // ----- chọn ảnh: chụp bằng camera hoặc lấy từ máy -----
  protected readonly picMenu = signal(false);
  protected readonly camOn = signal(false);
  private camStream: MediaStream | null = null;

  /** Video xem trước của camera: có phần tử trên màn hình là bật camera ngay */
  @ViewChild('cam') set camEl(v: ElementRef<HTMLVideoElement> | undefined) {
    if (v && !this.camStream) void this.openCam(v.nativeElement);
  }

  async openCam(video: HTMLVideoElement): Promise<void> {
    try {
      this.camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = this.camStream;
      await video.play();
    } catch {
      this.closeCam();
      this.error.set('Không mở được camera. Bạn hãy cho phép trình duyệt dùng camera rồi thử lại.');
    }
  }

  /** Menu "⋯" của một dòng trong danh sách (id hội thoại đang mở menu) */
  protected readonly rowMenu = signal<string | null>(null);

  protected toggleUnread(c: Conversation): void {
    this.rowMenu.set(null);
    const next = c.unread > 0 ? this.chat.markRead(c._id) : this.chat.markUnread(c._id);
    next.subscribe(() => this.conversations.update((l) => l.map((x) => (x._id === c._id ? { ...x, unread: c.unread > 0 ? 0 : 1 } : x))));
  }

  /** Bấm ra ngoài menu chọn ảnh (hoặc phím Esc) thì menu tự đóng */
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const el = e.target as HTMLElement;
    if (this.picMenu() && !el.closest('.picwrap')) this.picMenu.set(false);
    if (this.rowMenu() && !el.closest('.rowmore')) this.rowMenu.set(null);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.picMenu.set(false);
    this.rowMenu.set(null);
  }

  startCam(): void {
    this.picMenu.set(false);
    this.camOn.set(true);
  }

  snap(video: HTMLVideoElement): void {
    const cv = document.createElement('canvas');
    cv.width = video.videoWidth || 640;
    cv.height = video.videoHeight || 480;
    cv.getContext('2d')?.drawImage(video, 0, 0, cv.width, cv.height);
    this.sendMedia({ kind: 'image', url: cv.toDataURL('image/jpeg', 0.8) });
    this.closeCam();
  }

  closeCam(): void {
    this.camStream?.getTracks().forEach((t) => t.stop());
    this.camStream = null;
    this.camOn.set(false);
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
    this.stick = true;
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
    this.closeCam();
    document.body.classList.remove('no-footer');
  }
}
