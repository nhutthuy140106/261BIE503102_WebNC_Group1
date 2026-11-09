import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL } from '../../../core/models/post';
import { SELLER_KIND_ICON, SellerChat } from '../../../core/models/seller';
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

  protected readonly tab = signal<'all' | 'order' | 'job'>('all');
  protected readonly term = signal('');
  protected readonly active = signal<string | null>(null);
  private lastKey = '';

  protected readonly list = computed(() => {
    const q = this.term().trim().toLowerCase();
    return this.seller.chats().filter(
      (c) => (this.tab() === 'all' || c.ctx?.type === this.tab()) && (c.name.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q))),
    );
  });
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

  protected key(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) this.send(e);
  }

  /** Ô nhập tự cao theo nội dung */
  protected grow(el: HTMLTextAreaElement): void {
    el.style.height = '44px';
    el.style.height = Math.min(120, el.scrollHeight) + 'px';
  }
}
