import { AfterViewInit, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { SellerOfferView, SellerSpaceService } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';

const FLOW: [string, string][] = [['open', 'Nhận đề nghị'], ['chosen', 'Đã chọn người'], ['reported', 'Đã báo xong'], ['done', 'Hoàn thành']];

/**
 * Chi tiết một việc mình đăng: so sánh người đề nghị → chọn / từ chối → người làm báo xong (kèm ảnh) → xác nhận → đánh giá người làm.
 * Hỏi đáp công khai trả lời tại chỗ (chặn số điện thoại). Đóng / mở lại việc, ghim bằng Xu.
 */
@Component({
  selector: 'app-seller-job-detail',
  standalone: false,
  templateUrl: './seller-job-detail.html',
  styleUrls: ['../seller-ui.css', '../seller-detail.css', './seller-job-detail.css'],
})
export class SellerJobDetail implements OnInit, AfterViewInit {
  private readonly seller = inject(SellerSpaceService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });

  protected readonly flow = FLOW;
  protected readonly ready = this.seller.ready;
  protected readonly j = computed(() => this.seller.jobs().find((x) => x.id === this.id()) ?? null);
  protected readonly current = computed(() => {
    const a = this.j()?.active[0];
    return !a ? 'open' : a.state === 'working' ? 'chosen' : a.state;
  });
  protected readonly history = computed<[string, string][]>(() => {
    const a = this.j()?.active[0];
    return a?.report ? [['reported', a.report.at]] : [];
  });

  /** Đề nghị đang mở form đánh giá + số sao đang chọn */
  protected readonly rating = signal<string | null>(null);
  protected readonly stars = signal(5);

  ngOnInit(): void {
    this.seller.load().subscribe();
  }

  ngAfterViewInit(): void {
    if (this.route.snapshot.fragment === 'qa') setTimeout(() => document.getElementById('qa')?.scrollIntoView({ block: 'start' }), 50);
  }

  protected out(o: SellerOfferView): boolean {
    return ['rejected', 'withdrawn', 'cancelled'].includes(o.state);
  }

  protected cls(o: SellerOfferView): string {
    return o.state === 'offered' ? 'wait' : this.out(o) ? 'off' : o.state === 'done' ? 'done' : o.state === 'reported' ? 'act' : 'go';
  }

  protected engaged(o: SellerOfferView): boolean {
    return ['chosen', 'working', 'reported', 'done'].includes(o.state);
  }

  protected offer(o: SellerOfferView, a: 'choose' | 'reject' | 'confirmDone'): void {
    this.toast.show(this.seller.offerAct(this.j()!.id, o.id, a));
  }

  protected rate(e: Event, o: SellerOfferView, text: string): void {
    e.preventDefault();
    this.toast.show(this.seller.offerAct(this.j()!.id, o.id, 'rate', { stars: this.stars(), text: text.trim() }));
    this.rating.set(null);
  }

  protected answer(e: Event, qid: string, input: HTMLInputElement): void {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    if (/\d{9,}/.test(v.replace(/[\s.\-()_,]/g, ''))) return this.toast.show('Không ghi số điện thoại ở hỏi đáp công khai — hãy nhắn riêng');
    this.seller.answer(this.j()!.id, qid, v);
    this.toast.show('Đã trả lời — câu trả lời hiện cho mọi người xem việc');
  }

  protected setClosed(closed: boolean): void {
    this.seller.setJobClosed(this.j()!.id, closed);
    this.toast.show(closed ? 'Đã đóng — việc không nhận thêm đề nghị' : 'Đã mở lại việc');
  }

  protected pin(): void {
    this.toast.show(this.seller.pinJob(this.j()!.id) ?? `Cần 20 Xu, bạn còn ${this.seller.xu()} Xu`);
  }

  protected photos(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
