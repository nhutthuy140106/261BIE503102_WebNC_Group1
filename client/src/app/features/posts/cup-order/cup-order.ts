import { Component, EventEmitter, HostListener, Input, Output, computed, signal } from '@angular/core';
import type { CupDrink, CupLine } from '../../../core/models/post-template';
import { CupPicks, buildLine, cupPrice, defaultPicks, missingGroup, putLine, togglePick } from '../../../core/utils/cup-order';
import { OrderDraft, parseChoice } from '../../../core/utils/order-draft';

/**
 * Đặt đồ uống theo từng dòng: bấm loại nước, chọn size / đường / đá / topping và số ly trong popup rồi thêm vào đơn.
 * Cùng loại và cùng tùy chỉnh thì cộng dồn, khác tùy chỉnh thì thành dòng riêng.
 */
@Component({
  selector: 'app-cup-order',
  standalone: false,
  templateUrl: './cup-order.html',
  styleUrl: './cup-order.css',
})
export class CupOrder {
  @Input({ required: true }) draft!: OrderDraft;
  /** Popup mở / đóng: khung đặt cần nổi lên trên các khu phía dưới trang thì popup mới phủ được cả trang */
  @Output() readonly popup = new EventEmitter<boolean>();

  /** Loại nước đang mở popup; `editing` = dòng đang sửa */
  protected readonly drink = signal<CupDrink | null>(null);
  protected readonly picks = signal<CupPicks>({});
  protected readonly qty = signal(1);
  protected readonly editing = signal<CupLine | null>(null);

  protected readonly parse = parseChoice;
  protected readonly price = computed(() => {
    const d = this.drink();
    return d ? cupPrice(d, this.picks()) : 0;
  });
  /** Số ly còn được thêm: giới hạn số lượng của bài, trừ các dòng khác */
  protected readonly maxQty = computed(() => {
    const room = this.draft.maxQty() - this.draft.totalCups() + (this.editing()?.qty ?? 0);
    const d = this.drink();
    return d ? Math.min(room, this.leftOf(d) + (this.editing()?.drink === d.name ? this.editing()!.qty : 0)) : room;
  });
  /** Nhóm bắt buộc chưa chọn: khóa nút thêm vào đơn */
  protected readonly missing = computed(() => {
    const d = this.drink();
    return d ? missingGroup(d, this.picks()) : null;
  });

  /** Số ly còn đặt được của một loại: số còn của bài trừ các dòng đã có trong đơn */
  protected leftOf(d: CupDrink): number {
    if (d.left === undefined) return Infinity;
    return d.left - this.draft.cups().filter((x) => x.drink === d.name).reduce((n, x) => n + x.qty, 0);
  }

  protected open(d: CupDrink): void {
    this.editing.set(null);
    this.drink.set(d);
    this.picks.set(defaultPicks(d));
    this.qty.set(1);
    this.popup.emit(true);
  }

  protected edit(line: CupLine): void {
    const d = this.draft.tpl.cups?.find((x) => x.name === line.drink);
    if (!d) return;
    this.editing.set(line);
    this.drink.set(d);
    this.picks.set(line.picks);
    this.qty.set(line.qty);
    this.popup.emit(true);
  }

  protected toggle(group: string, raw: string): void {
    const d = this.drink();
    if (d) this.picks.set(togglePick(d, this.picks(), group, raw));
  }

  protected isOn(group: string, raw: string): boolean {
    return (this.picks()[group] ?? []).includes(raw);
  }

  protected setQty(n: number): void {
    this.qty.set(Math.max(1, Math.min(n, this.maxQty())));
  }

  protected save(): void {
    const d = this.drink();
    if (!d || this.maxQty() < 1 || this.missing()) return;
    this.draft.cups.set(putLine(this.draft.cups(), buildLine(d, this.picks(), this.qty()), this.editing() ?? undefined));
    this.close();
  }

  protected remove(line: CupLine): void {
    this.draft.cups.update((l) => l.filter((x) => x !== line));
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    if (!this.drink()) return;
    this.drink.set(null);
    this.editing.set(null);
    this.popup.emit(false);
  }
}
