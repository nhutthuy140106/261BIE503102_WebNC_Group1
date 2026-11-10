import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL } from '../../../core/models/post';
import { SELLER_KIND_ICON, SellerChat, SellerMsg } from '../../../core/models/seller';
import { SellerSpaceService } from '../../../core/services/seller-space';

/** Mẫu trả lời nhanh theo loại hội thoại */
const QUICK = {
  order: ['Cảm ơn bạn, mình nhận đơn rồi nhé!', 'Đơn đang chuẩn bị, khoảng 15 phút nữa giao.', 'Mình tới sảnh rồi, bạn xuống nhận giúp nhé.', 'Xin lỗi bạn, món này hôm nay hết rồi.'],
  job: ['Được em, cứ làm như mô tả nhé.', 'Em có mặt ở bếp lúc 10:55 giúp chị.', 'Chị đã gửi địa chỉ chính xác trong trang việc.', 'Cảm ơn em, chị xác nhận hoàn thành rồi.'],
};

/**
 * Messenger của người bán (design/mockups/seller-messenger.html), tách khỏi Messenger phía Mua:
 * khách hỏi về đơn, người nhận việc hỏi về việc. Vừa một màn hình — chỉ danh sách và nội dung hội thoại cuộn.
 * `?to=<tên>&order=<id>` hoặc `&job=<id>` mở đúng người + đơn / việc (nút "Nhắn" ở các trang Bán).
 */
@Component({
  selector: 'app-seller-messenger',
  standalone: false,
  templateUrl: './seller-messenger.html',
  styleUrls: ['../seller-ui.css', './seller-messenger.css'],
})
export class SellerMessenger implements OnInit, OnDestroy, AfterViewChecked {
  private readonly seller = inject(SellerSpaceService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('msgs') private msgs?: ElementRef<HTMLElement>;
  @ViewChild('draft') private draft?: ElementRef<HTMLTextAreaElement>;

  protected readonly tab = signal<'all' | 'unread'>('all');
  protected readonly term = signal('');
  protected readonly active = signal<string | null>(null);
  private lastKey = '';

  protected readonly list = computed(() => {
    const q = this.term().trim().toLowerCase();
    return this.seller.chats().filter(
      // Chưa đọc: giữ hội thoại đang mở trong danh sách dù vừa đọc xong
      (c) => (this.tab() === 'all' || c.unread > 0 || c.id === this.active()) && (c.name.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q))),
    );
  });
  protected readonly unreadCount = computed(() => this.seller.chats().filter((c) => c.unread > 0).length);
  protected readonly cur = computed(() => this.seller.chats().find((c) => c.id === this.active()) ?? null);
  protected readonly quick = computed(() => QUICK[this.cur()?.ctx?.type ?? 'order']);

  /** Thẻ đơn / việc đang nói tới, trạng thái lấy từ dữ liệu chung */
  protected ctxOf(c: SellerChat) {
    if (!c.ctx) return null;
    if (c.ctx.type === 'order') {
      const o = this.seller.orders().find((x) => x.id === c.ctx!.id);
      if (!o) return null;
      return { link: ['/seller/orders', o.id], image: o.image, icon: o.icon ?? SELLER_KIND_ICON[o.kind], title: `${o.code} · ${o.title}`, sub: 'Đơn khách đặt', cls: o.cls, st: o.cancelRequest ? 'Khách xin hủy' : o.label, kind: KIND_LABEL[o.kind] };
    }
    const j = this.seller.jobs().find((x) => x.id === c.ctx!.id);
    if (!j) return null;
    return { link: ['/seller/jobs', j.id], image: undefined, icon: 'hand', title: j.title, sub: 'Việc bạn đăng', cls: j.cls, st: j.label, kind: 'Việc làm' };
  }

  ngOnInit(): void {
    document.body.classList.add('no-footer');
    this.seller.load().subscribe(() => {
      const q = this.route.snapshot.queryParamMap;
      const to = q.get('to');
      if (to) {
        const ctx = q.get('order') ? { type: 'order' as const, id: q.get('order')! } : q.get('job') ? { type: 'job' as const, id: q.get('job')! } : null;
        this.open(this.seller.openChat(to, ctx));
      } else if (this.seller.chats()[0]) {
        this.open(this.seller.chats()[0].id);
      }
    });
  }

  ngOnDestroy(): void {
    this.closeCam();
    document.body.classList.remove('no-footer');
  }

  /** Cuộn xuống tin mới nhất khi đổi hội thoại hoặc có tin mới */
  ngAfterViewChecked(): void {
    const key = `${this.active()}:${this.cur()?.messages.length ?? 0}`;
    if (this.msgs && this.lastKey !== key) {
      this.lastKey = key;
      this.msgs.nativeElement.scrollTop = this.msgs.nativeElement.scrollHeight;
    }
  }

  protected open(id: string): void {
    this.active.set(id);
    this.seller.markRead(id);
  }

  protected last(c: SellerChat) {
    return c.messages[c.messages.length - 1];
  }

  protected useQuick(t: string): void {
    if (!this.draft) return;
    this.draft.nativeElement.value = t;
    this.draft.nativeElement.focus();
  }

  protected send(e?: Event): void {
    e?.preventDefault();
    const el = this.draft?.nativeElement;
    const c = this.cur();
    if (!el || !c || !el.value.trim()) return;
    this.seller.sendMessage(c.id, el.value.trim());
    el.value = '';
    el.style.height = '44px';
    el.focus();
  }

  /** Dòng xem trước trong danh sách hội thoại */
  protected preview(m: SellerMsg): string {
    if (m.text) return m.text;
    return ({ image: 'Đã gửi một ảnh', video: 'Đã gửi một video', audio: 'Đã gửi một tin nhắn thoại', file: 'Đã gửi một tệp' } as const)[m.media?.kind ?? 'file'];
  }

  protected sizeText(b?: number): string {
    if (!b) return '';
    return b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ----- đính kèm: ảnh / video / tệp / ghi âm / chụp ảnh (bản mẫu: lưu trong trình duyệt) -----
  protected readonly err = signal('');
  protected readonly picMenu = signal(false);
  protected readonly camOn = signal(false);
  protected readonly recording = signal(false);
  protected readonly recSec = signal(0);
  private camStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private recChunks: Blob[] = [];
  private recTimer: ReturnType<typeof setInterval> | null = null;
  private recCancel = false;
  private static readonly MAX_FILE = 10 * 1024 * 1024;

  private sendMedia(media: NonNullable<SellerMsg['media']>): void {
    const c = this.cur();
    if (!c) return;
    this.err.set('');
    this.seller.sendMessage(c.id, '', media);
  }

  /** Ảnh thu nhỏ lưu dạng data URL; video giữ link tạm trong phiên */
  protected async attachMedia(input: HTMLInputElement): Promise<void> {
    this.picMenu.set(false);
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const f of files) {
      if (f.type.startsWith('video/')) this.sendMedia({ kind: 'video', url: URL.createObjectURL(f) });
      else if (f.type.startsWith('image/')) this.sendMedia({ kind: 'image', url: await this.shrink(f) });
    }
  }

  /** Tệp bất kỳ (PDF, Word…): tối đa 10MB; tệp nhỏ lưu luôn nội dung để tải lại được */
  protected async attachFiles(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const f of files) {
      if (f.size > SellerMessenger.MAX_FILE) {
        this.err.set(`"${f.name}" lớn hơn 10MB, chưa gửi được.`);
        continue;
      }
      const url = f.size <= 1024 * 1024 ? await this.readUrl(f) : URL.createObjectURL(f);
      this.sendMedia({ kind: 'file', url, name: f.name, size: f.size });
    }
  }

  private readUrl(f: File): Promise<string> {
    return new Promise((ok) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = () => ok(URL.createObjectURL(f));
      r.readAsDataURL(f);
    });
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

  /** Video xem trước của camera: có phần tử trên màn hình là bật camera ngay */
  @ViewChild('cam') set camEl(v: ElementRef<HTMLVideoElement> | undefined) {
    if (v && !this.camStream) void this.openCam(v.nativeElement);
  }

  private async openCam(video: HTMLVideoElement): Promise<void> {
    try {
      this.camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = this.camStream;
      await video.play();
    } catch {
      this.closeCam();
      this.err.set('Không mở được camera. Hãy cho phép trình duyệt dùng camera rồi thử lại.');
    }
  }

  protected startCam(): void {
    this.picMenu.set(false);
    this.camOn.set(true);
  }

  protected snap(video: HTMLVideoElement): void {
    const cv = document.createElement('canvas');
    cv.width = video.videoWidth || 640;
    cv.height = video.videoHeight || 480;
    cv.getContext('2d')?.drawImage(video, 0, 0, cv.width, cv.height);
    this.sendMedia({ kind: 'image', url: cv.toDataURL('image/jpeg', 0.8) });
    this.closeCam();
  }

  protected closeCam(): void {
    this.camStream?.getTracks().forEach((t) => t.stop());
    this.camStream = null;
    this.camOn.set(false);
  }

  protected async startRec(): Promise<void> {
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
      this.err.set('Không mở được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.');
    }
  }

  protected stopRec(cancel = false): void {
    this.recCancel = cancel;
    this.recorder?.stop();
  }

  protected clock(s: number): string {
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  /** Bấm ra ngoài menu chọn ảnh hoặc Esc thì đóng menu */
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (this.picMenu() && !(e.target as HTMLElement).closest('.picwrap')) this.picMenu.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.picMenu.set(false);
  }

  protected key(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) this.send(e);
  }

  /** Ô nhập tự cao theo nội dung */
  protected grow(el: HTMLTextAreaElement): void {
    el.style.height = '44px';
    el.style.height = Math.min(120, el.scrollHeight) + 'px';
  }
}
