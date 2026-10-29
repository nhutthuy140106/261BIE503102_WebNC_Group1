import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Hạt bung ra quanh kiến lúc đổi dáng. */
interface Puff {
  id: number;
  left: number;
  top: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  dur: number;
  delay: number;
}

/** Trạng thái chữ "AntGo" ở màn mở đầu: ẩn → hiện (xám) → đậm màu → tan đi. */
type WordState = 'hidden' | 'in' | 'ink' | 'out';

const FLY_MS = 1000;
const PUFF_COLORS = ['255,214,107', '255,200,92', '255,232,160', '250,180,90', '255,255,255', '255,220,200'];
// ma trận đưa ảnh "giơ tay" (783×578) trùng máy bay của ảnh "vẫy tay" (769×608), đo từ 3 điểm mốc: đầu cánh, mũi, đuôi
const MATRIX = [0.94652, 0.06948, -0.11614, 1.10518, 47.21, -51.77];
const GREETINGS = ['Cần gì <i>cứ gọi</i>!', 'Có <i>mình</i> đây!', 'Ghé chơi <i>nha</i>!'];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

@Component({
  selector: 'app-landing',
  standalone: false,
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  private readonly flyer = viewChild.required<ElementRef<HTMLElement>>('flyer');
  private readonly bob = viewChild.required<ElementRef<HTMLElement>>('bob');
  private readonly swapper = viewChild.required<ElementRef<HTMLElement>>('swapper');
  private readonly flash = viewChild.required<ElementRef<HTMLElement>>('flash');

  // trạng thái giao diện (template đọc để gắn class)
  protected readonly intro = signal(true);
  protected readonly pre = signal(true);
  protected readonly idle = signal(false);
  protected readonly pointing = signal(true);
  protected readonly heroHidden = signal(true);
  protected readonly introUi = signal(false);
  protected readonly word = signal<WordState>('hidden');
  protected readonly flyerShown = signal(false);
  /** Chỉ nhận chuỗi cố định do code viết, không chứa dữ liệu người dùng → an toàn với [innerHTML]. */
  protected readonly bubbleHtml = signal('Chào <i>hàng xóm</i>!');
  protected readonly bubbleShow = signal(false);
  protected readonly puffs = signal<Puff[]>([]);
  protected readonly scrollY = signal(0);

  /** Chữ mở đầu mờ dần + mây trôi chậm khi cuộn. */
  protected readonly textOpacity = computed(() => Math.max(0, 1 - this.scrollY() / (innerHeight * 0.55)));
  protected readonly textShift = computed(() => this.scrollY() * 0.25);
  protected cloudShift(speed: number): string {
    return `0 ${-this.scrollY() * speed}px`;
  }

  private readonly reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private ready = false;
  private win = { wx: 0, wy: 0 };
  private winRaf = 0;
  private puffId = 0;
  private swapperWidth = 1;

  ngAfterViewInit(): void {
    // ẩn thanh cuộn: lúc mở màn trang khóa cuộn, thanh cuộn ẩn/hiện làm cả trang xê dịch
    this.document.documentElement.style.scrollbarWidth = 'none';
    this.setMatrix();
    Promise.all([this.document.fonts.ready, ...this.heroImages().map((i) => i.decode().catch(() => {}))]).then(() =>
      this.later(() => this.play(), 200),
    );
  }

  ngOnDestroy(): void {
    this.clearTimers();
    cancelAnimationFrame(this.winRaf);
    this.document.documentElement.style.scrollbarWidth = '';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.reduce) this.scrollY.set(scrollY);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.setMatrix();
  }

  protected onFlyerClick(): void {
    if (this.ready) this.say(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }

  // ---------- màn mở đầu (~3 giây) ----------
  protected play(): void {
    this.setup();
    if (this.reduce) {
      this.heroHidden.set(false);
      this.pre.set(false);
      this.pointing.set(false);
      this.flyerShown.set(true);
      this.finish();
      this.idle.set(true);
      this.ready = true;
      this.say('Chào <i>hàng xóm</i>!');
      return;
    }
    const vw = (v: number) => (innerWidth * v) / 100;
    const vh = (v: number) => (innerHeight * v) / 100;
    this.later(() => this.introUi.set(true), 80);
    // chữ AntGo hiện dần, từ xám sang xanh đen
    this.later(() => this.word.set('in'), 250);
    this.later(() => this.word.set('ink'), 600);
    // cửa sổ trời mở thành ô vuông, mây trồi lên
    this.later(() => {
      this.heroHidden.set(false);
      const q = Math.min(vw(15), vh(22));
      this.setWindow(q, q, 900);
      this.pre.set(false);
    }, 650);
    // chữ AntGo tan đi, cửa sổ mở rộng ra toàn màn hình
    this.later(() => {
      this.word.set('out');
      this.setWindow(vw(44), vh(40), 650);
    }, 1900);
    this.later(() => {
      this.setWindow(vw(51), vh(51), 550, easeOut);
      this.introUi.set(false);
    }, 2500);
    this.later(() => this.finish(), 3080);
    // trời vừa mở rộng thì kiến bay vụt vào; dừng hẳn rồi mới đổi dáng giơ tay → vẫy tay, rồi chào
    const t = 2350;
    this.later(() => this.flyIn(), t);
    this.later(() => {
      this.stopFly();
      this.idle.set(true); // nhún nhẹ chỉ bắt đầu sau khi máy bay dừng hẳn nên không giật
    }, t + FLY_MS);
    this.later(() => this.setRider(false), t + FLY_MS + 160);
    this.later(() => {
      this.ready = true;
      this.say('Chào <i>hàng xóm</i>!');
    }, t + FLY_MS + 550);
  }

  private setup(): void {
    this.clearTimers();
    this.ready = false;
    this.stopFly();
    scrollTo(0, 0);
    this.intro.set(true);
    this.pre.set(true);
    this.idle.set(false);
    this.heroHidden.set(true);
    this.bubbleShow.set(false);
    this.setWindow(70, 70, 0);
    this.flyerShown.set(false);
    this.pointing.set(true);
    this.introUi.set(false);
    this.word.set('hidden');
  }

  private finish(): void {
    this.intro.set(false);
    this.introUi.set(false);
    this.word.set('out');
    this.flyerShown.set(true);
  }

  /** Cửa sổ trời: --wx / --wy là nửa chiều rộng / cao, đổi mượt trong ms mili giây (0 = ngay lập tức). */
  private setWindow(wx: number, wy: number, ms: number, ease: (t: number) => number = easeInOut): void {
    cancelAnimationFrame(this.winRaf);
    const apply = () => {
      const style = this.host.nativeElement.style;
      style.setProperty('--wx', `${this.win.wx}px`);
      style.setProperty('--wy', `${this.win.wy}px`);
    };
    if (!ms) {
      this.win = { wx, wy };
      return apply();
    }
    const from = { ...this.win };
    const t0 = performance.now();
    const step = () => {
      const k = ease(Math.min(1, (performance.now() - t0) / ms));
      this.win = { wx: from.wx + (wx - from.wx) * k, wy: from.wy + (wy - from.wy) * k };
      apply();
      if (k < 1) this.winRaf = requestAnimationFrame(step);
    };
    this.winRaf = requestAnimationFrame(step);
  }

  // ---------- kiến cưỡi máy bay ----------
  private setMatrix(): void {
    this.swapperWidth = this.swapper().nativeElement.offsetWidth || 1;
    const k = this.swapperWidth / 769;
    const [a, b, c, d, e, f] = MATRIX;
    this.host.nativeElement.style.setProperty('--mA', `matrix(${a},${b},${c},${d},${(e * k).toFixed(2)},${(f * k).toFixed(2)})`);
  }

  /** Bay vào từ ngoài mép trái theo hướng mũi máy bay, lướt quá đích một chút rồi dừng. */
  private flyIn(): void {
    this.stopFly();
    this.flyerShown.set(true);
    const o: KeyframeAnimationOptions = { duration: FLY_MS, fill: 'both' };
    this.flyer().nativeElement.animate(
      [{ transform: `translate3d(${-0.85 * innerWidth}px,0,0)` }, { transform: 'none' }],
      { ...o, easing: 'cubic-bezier(.25,.75,.3,1.035)' },
    );
    this.bob().nativeElement.animate(
      [{ transform: `translate3d(0,${0.3 * innerHeight}px,0)` }, { transform: 'none' }],
      { ...o, easing: 'cubic-bezier(.35,.65,.4,1)' },
    );
    this.swapper().nativeElement.animate(
      [{ transform: 'rotate(-5deg) scale(.82)' }, { transform: 'none' }],
      { ...o, easing: 'cubic-bezier(.3,.7,.35,1)' },
    );
  }

  private stopFly(): void {
    [this.flyer(), this.bob(), this.swapper()].forEach((el) =>
      el.nativeElement.getAnimations().forEach((a) => {
        // giữ lại animation CSS (nhún nhẹ), chỉ hủy các animation bay vào
        if (!(window.CSSAnimation && a instanceof CSSAnimation)) a.cancel();
      }),
    );
  }

  /** Đổi dáng: nén lại → lóe sáng + hạt bung che chỗ đổi → bật lên. */
  protected setRider(pointing: boolean): void {
    if (this.pointing() === pointing) return;
    const sw = this.swapper().nativeElement;
    const duration = 560;
    const at = 0.32;
    sw.getAnimations().forEach((a) => a.cancel());
    sw.animate(
      [
        { transform: 'none', easing: 'cubic-bezier(.4,0,.6,1)' },
        { transform: 'translateY(5px) scale(1.035,.95)', offset: at, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: 'translateY(-7px) scale(.975,1.045)', offset: 0.62, easing: 'cubic-bezier(.4,0,.3,1)' },
        { transform: 'none' },
      ],
      { duration },
    );
    this.flash().nativeElement.animate(
      [
        { opacity: 0, transform: 'scale(.6)' },
        { opacity: 1, transform: 'scale(1)', offset: at },
        { opacity: 0, transform: 'scale(1.25)' },
      ],
      { duration: duration * 0.62, easing: 'ease-out' },
    );
    this.later(() => {
      this.pointing.set(pointing);
      this.burst();
    }, duration * at);
  }

  private burst(): void {
    const w = this.swapperWidth;
    const h = w * 0.79;
    const made: Puff[] = Array.from({ length: 46 }, (_, i) => {
      const a = Math.random() * 6.283;
      const r = 50 + Math.random() * 110;
      return {
        id: ++this.puffId,
        left: w * 0.52 + Math.cos(a) * w * (0.08 + Math.random() * 0.14),
        top: h * 0.38 + Math.sin(a) * h * (0.1 + Math.random() * 0.18),
        size: 3 + Math.random() * 7,
        color: `rgb(${PUFF_COLORS[i % PUFF_COLORS.length]})`,
        vx: Math.cos(a) * r,
        vy: Math.sin(a) * r - 20,
        dur: 0.6 + Math.random() * 0.45,
        delay: Math.random() * 0.08,
      };
    });
    const ids = new Set(made.map((p) => p.id));
    this.puffs.update((list) => [...list, ...made]);
    this.later(() => this.puffs.update((list) => list.filter((p) => !ids.has(p.id))), 1200);
  }

  /** Rê chuột vào nút chính: kiến chỉ tay + nghiêng; bỏ ra thì vẫy tay lại. */
  protected onCtaEnter(): void {
    if (!this.ready) return;
    this.setRider(true);
    this.say('Đi <i>thôi</i>!', 1800);
  }

  protected onCtaLeave(): void {
    if (this.ready) this.setRider(false);
  }

  private say(html: string, ms = 2600): void {
    this.bubbleHtml.set(html);
    this.bubbleShow.set(true);
    this.later(() => this.bubbleShow.set(false), ms);
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private heroImages(): HTMLImageElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLImageElement>('img')).slice(0, 8);
  }
}
