import { AfterViewInit, Component, ElementRef, Input, OnDestroy, inject } from '@angular/core';
import { StepItem } from '../../../../core/models/seller';

/**
 * Thanh tiến trình đơn / việc — cùng tên bước và cùng kiểu với .stepper ở chi tiết đơn phía Mua:
 * bước đã qua ✓ xanh đen, bước hiện tại viền cam có quầng, bước hủy ✕, giờ dưới từng bước.
 * Đường nối vẽ trong từng cột (nửa trái theo bước này, nửa phải theo bước sau) nên cột rộng hẹp khác nhau vẫn nối liền.
 */
@Component({
  selector: 'app-seller-steps',
  standalone: false,
  template: `<div class="stepper">
    @for (s of items; track $index) {
      @let nx = items[$index + 1];
      <div class="s" [class.ok]="s.cls === 'ok'" [class.cur]="s.cls === 'cur'" [class.cut]="s.cls === 'cut'" [class.nx]="nx?.cls === 'ok' || nx?.cls === 'cur'">
        <span class="dot">{{ s.cls === 'ok' ? '✓' : s.cls === 'cut' ? '✕' : $index + 1 }}</span><span class="lb">{{ s.label }}</span>
        @if (s.time) { <small>{{ s.time }}</small> }
      </div>
    }
  </div>`,
  styles: [`
    .stepper { display: flex; }
    .s { position: relative; flex: 1; display: grid; align-content: start; justify-items: center; text-align: center; gap: 6px; font-size: 13px; color: var(--fog); }
    .s::before, .s::after { content: ""; position: absolute; top: 14px; width: 50%; height: 2px; background: var(--border); z-index: 0; }
    .s::before { left: 0; }
    .s::after { right: 0; }
    .s:first-child::before, .s:last-child::after { display: none; }
    .s.ok::before, .s.cur::before, .s.nx::after { background: var(--ink); }
    .dot { position: relative; z-index: 1; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #fff; border: 2px solid var(--border); font-weight: 700; font-size: 13px; }
    .s.ok, .s.cur { color: var(--ink); }
    .s.ok .dot { background: var(--ink); border-color: var(--ink); color: #fff; }
    .s.cur { font-weight: 700; }
    .s.cur .dot { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 0 5px var(--accent-soft); }
    .s.cut .dot { border-color: var(--fog); color: var(--fog); }
    small { font-size: 12px; font-weight: 400; color: var(--smoke); }
    /* bản trong hộp xác nhận: chữ bước đầu / cuối sát hai lề (thẳng tiêu đề), chấm giữa chữ, các chấm cách đều (lề âm tính ở fit()) */
    :host(.sm) .s { font-size: 12px; white-space: nowrap; }
    :host(.sm) .stepper { margin: 0 var(--mr, 0px) 0 var(--ml, 0px); }
    @media (max-width: 640px) { .s { font-size: 11px; } }
  `],
})
export class SellerSteps implements AfterViewInit, OnDestroy {
  @Input({ required: true }) items: readonly StepItem[] = [];

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private ro?: ResizeObserver;

  ngAfterViewInit(): void {
    if (!this.host.classList.contains('sm')) return;
    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(this.host);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  /**
   * Cột bằng nhau thì chấm cách đều; kéo hai đầu thanh ra (lề âm) sao cho chữ bước đầu chạm lề trái,
   * chữ bước cuối chạm lề phải: a, b = nửa bề rộng chữ hai đầu, d = khoảng giữa hai chấm.
   */
  private fit(): void {
    const lb = this.host.querySelectorAll<HTMLElement>('.lb');
    const n = lb.length;
    if (n < 2) return;
    const a = Math.max(15, lb[0].offsetWidth / 2);
    const b = Math.max(15, lb[n - 1].offsetWidth / 2);
    const d = (this.host.clientWidth - a - b) / (n - 1);
    this.host.style.setProperty('--ml', `${a - d / 2}px`);
    this.host.style.setProperty('--mr', `${b - d / 2}px`);
  }
}
