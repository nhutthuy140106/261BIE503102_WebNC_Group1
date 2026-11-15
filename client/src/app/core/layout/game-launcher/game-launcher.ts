import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const KEY = 'antgo_game_bubble';
/** Mỗi ngày chỉ nhắc tối đa chừng này lần, bấm đóng thì thôi cả ngày — tránh làm phiền */
const MAX_PER_DAY = 3;

/**
 * Nút nổi góc dưới bên trái (đối diện trợ lý): rủ người dùng thử Quay món và Vườn AntGo.
 * Bấm vào mở bảng 2 lựa chọn; thỉnh thoảng có bong bóng chữ nhắc nhẹ. Ẩn ngay trên hai trang đó.
 */
@Component({
  selector: 'app-game-launcher',
  standalone: false,
  templateUrl: './game-launcher.html',
  styleUrl: './game-launcher.css',
})
export class GameLauncher implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly url = signal(this.router.url);
  private timers: ReturnType<typeof setTimeout>[] = [];

  protected readonly open = signal(false);
  protected readonly bubble = signal(false);
  protected readonly visible = computed(() => !/^\/(quay-mon|vuon)(\/|\?|$)/.test(this.url()));

  ngOnInit(): void {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.url.set(e.urlAfterRedirects);
      this.open.set(false);
    });
    // sau vài giây mới nhắc, hiện một lúc rồi tự ẩn; lát sau có thể nhắc lại nếu hôm nay còn lượt
    const schedule = (delay: number): void => {
      this.timers.push(
        setTimeout(() => {
          if (this.open() || !this.visible() || !this.takeTurn()) return;
          this.bubble.set(true);
          this.timers.push(setTimeout(() => this.bubble.set(false), 7000));
          schedule(60000);
        }, delay),
      );
    };
    schedule(5000);
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  protected toggle(): void {
    this.open.update((v) => !v);
    this.bubble.set(false);
  }

  /** Bấm × trên bong bóng: hôm nay không nhắc nữa */
  protected dismiss(e: Event): void {
    e.stopPropagation();
    this.bubble.set(false);
    this.save({ d: this.today(), n: MAX_PER_DAY });
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected outside(e: Event): void {
    if (this.open() && !(e.target as HTMLElement).closest('app-game-launcher')) this.open.set(false);
  }

  private today(): string {
    return new Date().toDateString();
  }

  private read(): { d: string; n: number } {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (v && v.d === this.today() && typeof v.n === 'number') return v;
    } catch {
      /* trình duyệt chặn lưu trữ: coi như chưa nhắc */
    }
    return { d: this.today(), n: 0 };
  }

  private save(v: { d: string; n: number }): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* bỏ qua */
    }
  }

  /** Còn lượt nhắc hôm nay thì trừ một lượt và cho phép hiện */
  private takeTurn(): boolean {
    const v = this.read();
    if (v.n >= MAX_PER_DAY) return false;
    this.save({ d: v.d, n: v.n + 1 });
    return true;
  }
}
