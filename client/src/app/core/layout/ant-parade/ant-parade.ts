import { Component, ElementRef, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

/** Trang không hiện đàn kiến: game cần tập trung. */
const QUIET = ['/vuon/hai-xu', '/vuon/tuoi-cay', '/vuon/thu-cung'];

const SPEED = 78; // px / giây
const TURN = 1.7; // rad / giây — tốc độ quay đầu tối đa của kiến đầu đàn, để đường đi cong mềm thay vì gấp khúc
const GAP = 40; // khoảng cách (px) giữa hai con liền nhau trên đường đi
const SIZE = 34;

interface Pt {
  x: number;
  y: number;
}

/**
 * Đàn kiến nhỏ lâu lâu bò vòng vòng khắp màn hình (trang trí): một con đầu đàn đi qua vài điểm ngẫu nhiên rồi ra khỏi màn hình,
 * các con còn lại bám theo đúng đường nó đã đi. Không chặn chuột, nằm dưới nút chat, tắt khi người dùng bật "giảm chuyển động",
 * khi tab bị ẩn và ở các trang game. Dùng lại ảnh kiến chạy (`ant-run.png`) của hiệu ứng tải trang.
 */
@Component({
  selector: 'app-ant-parade',
  standalone: false,
  templateUrl: './ant-parade.html',
  styleUrl: './ant-parade.css',
})
export class AntParade implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Số con trong đàn đang bò (0 = không có đàn) */
  protected readonly ants = signal<number[]>([]);

  private timer?: ReturnType<typeof setTimeout>;
  private raf = 0;
  private quiet = false;

  // trạng thái đàn đang bò
  private head: Pt = { x: 0, y: 0 };
  private heading = 0;
  private route: Pt[] = [];
  private trail: { p: Pt; d: number }[] = []; // lịch sử đường đi của con đầu đàn, kèm quãng đường tích lũy
  private dist = 0;
  private last = 0;

  ngOnInit(): void {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.quiet = QUIET.some((p) => e.urlAfterRedirects.startsWith(p));
    });
    this.zone.runOutsideAngular(() => this.schedule(8000 + Math.random() * 5000)); // lần đầu sau ~10 giây để người dùng kịp thấy
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
  }

  private schedule(ms: number): void {
    this.timer = setTimeout(() => {
      if (document.hidden || this.quiet) return this.schedule(8000); // không phải lúc: thử lại sớm
      this.begin();
    }, ms);
  }

  private begin(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const n = 4 + Math.floor(Math.random() * 3); // 4–6 con
    // vào từ một mép, đi qua 4–6 điểm trong màn hình, ra ở mép khác
    const edge = (): Pt => {
      const side = Math.floor(Math.random() * 4);
      const m = 40;
      return [{ x: -m, y: Math.random() * h }, { x: w + m, y: Math.random() * h }, { x: Math.random() * w, y: -m }, { x: Math.random() * w, y: h + m }][side];
    };
    const inner = (): Pt => ({ x: 60 + Math.random() * (w - 120), y: 80 + Math.random() * (h - 160) });
    const start = edge();
    this.route = [start, ...Array.from({ length: 4 + Math.floor(Math.random() * 3) }, inner), edge()];
    this.head = { ...start };
    const first = this.route[1];
    this.heading = Math.atan2(first.y - start.y, first.x - start.x);
    this.trail = [{ p: { ...start }, d: 0 }];
    this.dist = 0;
    this.route.shift();
    this.zone.run(() => this.ants.set(Array.from({ length: n }, (_, i) => i)));
    this.last = performance.now();
    setTimeout(() => (this.raf = requestAnimationFrame(this.frame)), 30); // chờ Angular vẽ xong các con kiến
  }

  private frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const els = this.host.nativeElement.querySelectorAll<HTMLElement>('.w');
    const target = this.route[0];

    if (target) {
      // quay dần về phía điểm đích rồi tiến lên
      const want = Math.atan2(target.y - this.head.y, target.x - this.head.x);
      let diff = ((want - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      diff = Math.max(-TURN * dt, Math.min(TURN * dt, diff));
      this.heading += diff;
      this.head.x += Math.cos(this.heading) * SPEED * dt;
      this.head.y += Math.sin(this.heading) * SPEED * dt;
      this.dist += SPEED * dt;
      this.trail.push({ p: { ...this.head }, d: this.dist });
      if (this.trail.length > 4000) this.trail.splice(0, 1000);
      if (Math.hypot(target.x - this.head.x, target.y - this.head.y) < 38) this.route.shift();
    } else {
      // đã đi hết đường: đầu đàn tiếp tục thẳng ra ngoài, các con sau nối đuôi
      this.dist += SPEED * dt;
      this.head.x += Math.cos(this.heading) * SPEED * dt;
      this.head.y += Math.sin(this.heading) * SPEED * dt;
      this.trail.push({ p: { ...this.head }, d: this.dist });
    }

    let alive = 0;
    els.forEach((el, i) => {
      const at = this.at(this.dist - i * GAP);
      const back = this.at(this.dist - i * GAP - 8);
      const ang = Math.atan2(at.y - back.y, at.x - back.x);
      const left = Math.cos(ang) < 0;
      // sprite quay mặt sang phải: đi sang trái thì lật ngang, góc nghiêng giữ trong ±55° cho kiến không bị lộn ngược
      const tilt = left ? ang + Math.PI : ang;
      const t = Math.max(-0.96, Math.min(0.96, ((tilt + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
      el.style.transform = `translate(${at.x - SIZE / 2}px, ${at.y - SIZE / 2}px) rotate(${t}rad) scaleX(${left ? -1 : 1})`;
      if (at.x > -80 && at.x < window.innerWidth + 80 && at.y > -80 && at.y < window.innerHeight + 80) alive++;
    });

    // cả đàn đã ra khỏi màn hình sau khi đi hết đường → kết thúc, hẹn lần sau
    if (!target && alive === 0) {
      this.zone.run(() => this.ants.set([]));
      this.schedule(35000 + Math.random() * 40000); // lâu lâu: 35–75 giây một lần
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Vị trí trên đường đi tại quãng đường d (d < 0: con kiến chưa vào màn hình, nằm ngoài đầu đường). */
  private at(d: number): Pt {
    const t = this.trail;
    if (d <= 0) {
      const a = t[0].p;
      return { x: a.x + (d * Math.cos(this.startHeading())), y: a.y + (d * Math.sin(this.startHeading())) };
    }
    let lo = 0;
    let hi = t.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (t[mid].d < d) lo = mid + 1;
      else hi = mid;
    }
    const b = t[lo];
    const a = t[Math.max(0, lo - 1)];
    const k = b.d === a.d ? 0 : (d - a.d) / (b.d - a.d);
    return { x: a.p.x + (b.p.x - a.p.x) * k, y: a.p.y + (b.p.y - a.p.y) * k };
  }

  private startHeading(): number {
    const t = this.trail;
    return t.length > 1 ? Math.atan2(t[1].p.y - t[0].p.y, t[1].p.x - t[0].p.x) : this.heading;
  }
}
