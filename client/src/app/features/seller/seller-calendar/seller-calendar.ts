import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CalItem, SellerSpaceService, dateOf, toMin } from '../../../core/services/seller-space';

interface Stack {
  top: number;
  items: CalItem[];
}
interface DayCol {
  d: number;
  date: number;
  today: boolean;
  items: CalItem[];
  stacks: Stack[];
  open: { top: number; h: number } | null;
  now: number | null;
}

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

/**
 * Lịch tuần kiểu Google Calendar (design/mockups/seller-calendar.html): đơn đã xác nhận có giờ, lịch dịch vụ, việc đã chọn người.
 * Thẻ nhỏ giống trang Hôm nay; mốc bắt đầu khi thẻ trước còn chiếm chỗ thì vào chung chồng (rê chuột xòe ra).
 */
@Component({
  selector: 'app-seller-calendar',
  standalone: false,
  templateUrl: './seller-calendar.html',
  styleUrls: ['../seller-ui.css', './seller-calendar.css'],
})
export class SellerCalendar implements OnInit, AfterViewChecked {
  private readonly seller = inject(SellerSpaceService);
  @ViewChild('wbody') private wbody?: ElementRef<HTMLElement>;

  protected readonly days = DAYS;
  protected readonly H0 = 6;
  protected readonly H1 = 21;
  protected readonly PX = 80;
  private readonly CH = 64;
  protected readonly hours = Array.from({ length: this.H1 - this.H0 - 1 }, (_, i) => this.H0 + i + 1);

  /** 0 = tuần này */
  protected readonly week = signal(0);
  private scrolledFor: number | null = null;
  private readonly yOf = (t: string) => ((toMin(t) - this.H0 * 60) / 60) * this.PX;

  private readonly monday = computed(() => -this.seller.weekday(0) + this.week() * 7);

  protected readonly cols = computed<DayCol[]>(() => {
    const m = this.monday();
    // đọc orders / jobs để lịch cập nhật khi dữ liệu đổi
    this.seller.orders();
    this.seller.jobs();
    return Array.from({ length: 7 }, (_, i) => {
      const d = m + i;
      const items = this.seller.calItems(d);
      const stacks: Stack[] = [];
      for (const a of items) {
        const y = Math.max(0, this.yOf(a.time));
        const last = stacks[stacks.length - 1];
        if (last && y < last.top + this.CH) last.items.push(a);
        else stacks.push({ top: y, items: [a] });
      }
      const hrs = this.seller.hours()[this.seller.weekday(d)];
      const h = hrs?.on ? hrs : null;
      const n = new Date();
      const mm = n.getHours() * 60 + n.getMinutes();
      return {
        d, date: dateOf(d).getDate(), today: d === 0, items, stacks,
        open: h ? { top: this.yOf(h.from), h: this.yOf(h.to) - this.yOf(h.from) } : null,
        now: d === 0 && mm >= this.H0 * 60 && mm <= this.H1 * 60 ? ((mm - this.H0 * 60) / 60) * this.PX : null,
      };
    });
  });

  protected readonly all = computed(() => this.cols().flatMap((c) => c.items));
  protected readonly orderCount = computed(() => this.all().filter((x) => x.kind !== 'job').length);
  protected readonly jobCount = computed(() => this.all().filter((x) => x.kind === 'job').length);

  protected readonly label = computed(() => {
    const f = (d: number) => dateOf(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${f(this.monday())} – ${f(this.monday() + 6)}`;
  });

  ngOnInit(): void {
    this.seller.load().subscribe();
  }

  /** Mở lịch ở mốc đầu tiên của tuần (mỗi lần đổi tuần) */
  ngAfterViewChecked(): void {
    if (!this.wbody || this.scrolledFor === this.week() || !this.seller.ready()) return;
    this.scrolledFor = this.week();
    const first = this.all()[0];
    this.wbody.nativeElement.scrollTop = Math.max(0, this.yOf(first ? first.time : '09:00') - 40);
  }

  protected go(d: number): void {
    this.week.update((w) => (d === 0 ? 0 : w + d));
  }
}
