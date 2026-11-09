import { AfterViewInit, Component, ElementRef, Input, ViewChild, computed, inject, signal } from '@angular/core';
import { PostKind } from '../../../../core/models/post';
import { CalItem, SellerSpaceService, toMin } from '../../../../core/services/seller-space';

interface Stack {
  time: string;
  items: CalItem[];
  top: number;
  h: number;
  col: number;
  n: number;
}

/**
 * Lịch một ngày kiểu Google Calendar: trục giờ dọc, mỗi đơn là một thẻ nhỏ đặt đúng giờ.
 * Đơn cùng giờ xếp chồng lệch nhau (rê chuột thì xòe ra); các chồng chồng lấn nhau thì chia cột.
 */
@Component({
  selector: 'app-seller-day-agenda',
  standalone: false,
  templateUrl: './day-agenda.html',
  styleUrls: ['../../seller-ui.css', './day-agenda.css'],
})
export class SellerDayAgenda implements AfterViewInit {
  private readonly seller = inject(SellerSpaceService);
  @ViewChild('box') private box?: ElementRef<HTMLElement>;

  /** Số ngày so với hôm nay */
  @Input() day = 0;
  /** Lọc theo mảng ('all' = tất cả) */
  @Input() set kind(v: PostKind | 'all') {
    this.kindSig.set(v);
  }
  private readonly kindSig = signal<PostKind | 'all'>('all');

  protected readonly H0 = 8;
  protected readonly H1 = 19;
  protected readonly PX = 72;
  private readonly CH = 64;
  protected readonly hours = Array.from({ length: this.H1 - this.H0 + 1 }, (_, i) => this.H0 + i);

  private readonly yOf = (t: string) => ((toMin(t) - this.H0 * 60) / 60) * this.PX;

  protected readonly stacks = computed<Stack[]>(() => {
    const k = this.kindSig();
    const items = this.seller.calItems(this.day).filter((a) => k === 'all' || a.kind === k);
    const stacks: Stack[] = [];
    for (const a of items) {
      const last = stacks[stacks.length - 1];
      if (last && last.time === a.time) last.items.push(a);
      else stacks.push({ time: a.time, items: [a], top: 0, h: 0, col: 0, n: 1 });
    }
    let cluster: Stack[] = [];
    let ends: number[] = [];
    const flush = () => {
      cluster.forEach((s) => (s.n = ends.length));
      cluster = [];
      ends = [];
    };
    for (const s of stacks) {
      s.top = this.yOf(s.time);
      s.h = this.CH + (s.items.length - 1) * 6;
      if (cluster.length && s.top >= Math.max(...ends)) flush();
      let c = ends.findIndex((e) => e <= s.top);
      if (c < 0) {
        c = ends.length;
        ends.push(0);
      }
      ends[c] = s.top + s.h + 4;
      s.col = c;
      cluster.push(s);
    }
    flush();
    return stacks;
  });

  protected readonly open = computed(() => {
    const h = this.seller.openOf(this.day);
    return h ? { top: this.yOf(h.from), h: this.yOf(h.to) - this.yOf(h.from), text: `Nhận đơn ${h.from} – ${h.to}` } : null;
  });

  protected readonly now = computed(() => {
    if (this.day !== 0) return null;
    const d = new Date();
    const m = d.getHours() * 60 + d.getMinutes();
    return m >= this.H0 * 60 && m <= this.H1 * 60 ? ((m - this.H0 * 60) / 60) * this.PX : null;
  });

  /** Mở lịch ở đơn đầu tiên trong ngày */
  ngAfterViewInit(): void {
    const first = this.stacks()[0];
    const o = this.open();
    if (this.box) this.box.nativeElement.scrollTop = Math.max(0, (first ? first.top : o ? o.top : 0) - 30);
  }
}
