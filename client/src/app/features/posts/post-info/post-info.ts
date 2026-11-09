import { Component, Input } from '@angular/core';

/** Các thông tin người bán đã điền ở form đăng bài (nội quy, điều kiện hủy, phạm vi phục vụ…), hiện dưới Mô tả */
@Component({
  selector: 'app-post-info',
  standalone: false,
  template: `
    <dl>
      @for (r of rows; track r.label) {
        <dt>{{ r.label }}</dt>
        <dd>{{ r.value }}</dd>
      }
    </dl>
  `,
  styles: `
    dl { margin: 14px 0 0; display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 8px 14px; font-size: 14px; }
    dt { color: var(--smoke); }
    dd { margin: 0; font-weight: 500; overflow-wrap: anywhere; }
    @media (max-width: 560px) { dl { grid-template-columns: 1fr; gap: 2px; } dd { margin-bottom: 8px; } }
  `,
})
export class PostInfo {
  @Input({ required: true }) rows: { label: string; value: string }[] = [];
}
