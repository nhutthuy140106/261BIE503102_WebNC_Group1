import { Component, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

interface Walker {
  delay: number;
  lane: number;
  size: number;
}

interface Parade {
  id: number;
  rtl: boolean;
  duration: number;
  ants: Walker[];
}

/** Trang không hiện đàn kiến: game cần tập trung, bản đồ/giỏ đặt hàng tránh rối mắt. */
const QUIET = ['/vuon/hai-xu', '/vuon/tuoi-cay', '/vuon/thu-cung'];

/**
 * Đàn kiến nhỏ lâu lâu chạy ngang đáy màn hình (trang trí). Không chặn thao tác chuột, tắt khi người dùng bật "giảm chuyển động",
 * khi tab bị ẩn, và ở các trang game. Dùng lại ảnh kiến chạy (`ant-run.png`) của hiệu ứng tải trang.
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

  protected readonly parade = signal<Parade | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  private seq = 0;
  private quiet = false;

  ngOnInit(): void {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.quiet = QUIET.some((p) => e.urlAfterRedirects.startsWith(p));
    });
    this.zone.runOutsideAngular(() => this.schedule(9000 + Math.random() * 6000)); // lần đầu sau ~10 giây để người dùng kịp thấy
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  private schedule(ms: number): void {
    this.timer = setTimeout(() => {
      if (document.hidden || this.quiet) return this.schedule(8000); // không phải lúc: thử lại sớm
      this.zone.run(() => this.start());
    }, ms);
  }

  private start(): void {
    const n = 3 + Math.floor(Math.random() * 3); // 3–5 con
    const duration = 15 + Math.random() * 6;
    this.parade.set({
      id: ++this.seq,
      rtl: Math.random() < 0.5,
      duration,
      ants: Array.from({ length: n }, (_, i) => ({ delay: i * (0.8 + Math.random() * 0.5), lane: (Math.random() - 0.5) * 8, size: 0.85 + Math.random() * 0.3 })),
    });
    const total = (duration + n * 1.4 + 1) * 1000;
    this.zone.runOutsideAngular(() =>
      setTimeout(() => {
        this.zone.run(() => this.parade.set(null));
        this.schedule(35000 + Math.random() * 40000); // lâu lâu: 35–75 giây một lần
      }, total),
    );
  }
}
