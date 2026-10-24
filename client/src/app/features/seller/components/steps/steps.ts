import { Component, Input } from '@angular/core';

export interface StepCut {
  /** vị trí bước bị cắt (hiện ✕) */
  at: number;
  label: string;
  time: string;
}

/** Thanh tiến trình đơn / việc: bước đã qua ✓ xanh đen, bước hiện tại viền cam, giờ dưới từng bước, nhánh hủy hiện ✕. */
@Component({
  selector: 'app-seller-steps',
  standalone: false,
  template: `<div class="steps">
    @for (s of steps; track s[0]; let i = $index) {
      <div class="stp" [class]="'stp ' + cls(i)">
        <i>@switch (cls(i)) { @case ('ok') { <svg class="i"><use href="#check" /></svg> } @case ('cut') { ✕ } @default { {{ i + 1 }} } }</i>
        {{ cut && i === cut.at ? cut.label : s[1] }}
        @if (timeOf(i); as t) { <small>{{ t }}</small> }
      </div>
    }
  </div>`,
  styles: [`
    .steps { display: flex; align-items: flex-start; }
    .stp { flex: 1; position: relative; text-align: center; font-size: 12.5px; color: var(--fog); }
    .stp::before { content: ""; position: absolute; top: 13px; left: -50%; right: 50%; height: 2px; background: var(--border); }
    .stp:first-child::before { display: none; }
    .stp i { position: relative; z-index: 1; width: 28px; height: 28px; margin: 0 auto 6px; border-radius: 50%; border: 2px solid var(--border); background: #fff; display: grid; place-items: center; font-style: normal; font-weight: 700; font-size: 12px; }
    .stp.ok { color: var(--ink); }
    .stp.ok::before, .stp.now::before { background: var(--ink); }
    .stp.ok i { background: var(--ink); border-color: var(--ink); color: #fff; }
    .stp.ok i svg { width: 14px; height: 14px; }
    .stp.now { color: var(--ink); font-weight: 700; }
    .stp.now i { border-color: var(--accent); color: var(--accent); }
    .stp small { display: block; font-size: 11.5px; color: var(--smoke); font-weight: 400; margin-top: 2px; }
    .stp.cut i { border-color: var(--fog); color: var(--fog); }
    @media (max-width: 700px) { .steps { overflow-x: auto; } .stp { min-width: 84px; } }
  `],
})
export class SellerSteps {
  @Input({ required: true }) steps: readonly (readonly [string, string])[] = [];
  @Input() current = '';
  @Input() history: readonly (readonly [string, string])[] = [];
  @Input() cut: StepCut | null = null;

  protected cls(i: number): string {
    if (this.cut) return i < this.cut.at ? 'ok' : i === this.cut.at ? 'cut' : '';
    const idx = this.steps.findIndex((s) => s[0] === this.current);
    if (i < idx) return 'ok';
    if (i === idx) return this.steps[i][0] === 'done' ? 'ok' : 'now';
    return '';
  }

  protected timeOf(i: number): string {
    if (this.cut && i === this.cut.at) return this.cut.time;
    const key = this.steps[i][0];
    return [...this.history].reverse().find((h) => h[0] === key)?.[1] ?? '';
  }
}
