import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { SELLER_FLOW, SELLER_KIND_ICON, SellerPost } from '../../../core/models/seller';
import { AuthService } from '../../../core/services/auth';
import { SellerService } from '../../../core/services/seller';
import { SellerSpaceService } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';
import {
  BLOCKS, CATS, CONDITIONS, DAYS, FOOD_TAGS, FormType, ICE, PRICE_TYPES, Q_TYPES, SVC_PRESETS, SWEET,
  choice, commonGroup, drinkGroup, foodGroup, goodsGroup, jobGroup, optGroup, packageGroup, questionGroup, serviceGroup,
} from './post-form-config';

type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const TYPES: { t: FormType | 'foodish'; kind: PostKind; icon: string; label: string; sub: string }[] = [
  { t: 'foodish', kind: 'food', icon: 'fork', label: 'Bán đồ ăn & uống', sub: 'Món theo phần, đồ uống theo ly' },
  { t: 'goods', kind: 'goods', icon: 'package', label: 'Bán đồ dùng', sub: 'Đồ mới hoặc đã dùng' },
  { t: 'service', kind: 'service', icon: 'wrench', label: 'Đăng dịch vụ', sub: 'Bạn làm, khách đặt lịch' },
  { t: 'job', kind: 'job', icon: 'hand', label: 'Đăng việc cần người', sub: 'Hàng xóm gửi đề nghị, bạn chọn' },
];
const INTRO: Record<FormType, string> = {
  food: 'Món theo phần — khách chọn món, giờ nhận, giao hay tự lấy.',
  drink: 'Đồ uống pha theo ly — khách chọn size, độ ngọt, đá, topping.',
  goods: 'Đồ mới hoặc đã dùng — ghi rõ tình trạng, hẹn giờ khách qua lấy.',
  service: 'Bạn làm, khách đặt lịch. Chọn loại dịch vụ để điền sẵn gợi ý, sửa lại thoải mái.',
  job: 'Hàng xóm gửi đề nghị nhận việc, bạn so sánh rồi chọn người.',
};

/**
 * Đăng / sửa bài (design/mockups/seller-post-form.html, mở rộng thành 5 form theo kế hoạch 24/10).
 * `?type=food|goods|service|job` · `/seller/posts/:id/edit`. Reactive Forms; cột phải xem trước thẻ bài + đầu trang bài như khách thấy.
 * Đăng xong: lưu vào khu Bán (SellerSpaceService) và gửi bản rút gọn sang kho bài phía Mua (SellerService.savePost) để hiện ở trang chủ.
 */
@Component({
  selector: 'app-seller-post-form',
  standalone: false,
  templateUrl: './seller-post-form.html',
  styleUrls: ['../seller-ui.css', './seller-post-form.css'],
})
export class SellerPostForm implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly seller = inject(SellerSpaceService);
  private readonly sellerApi = inject(SellerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);

  protected readonly types = TYPES;
  protected readonly days = DAYS;
  protected readonly blocks = BLOCKS;
  protected readonly foodTags = FOOD_TAGS;
  protected readonly conditions = CONDITIONS;
  protected readonly sweetLevels = SWEET;
  protected readonly iceLevels = ICE;
  protected readonly priceTypes = PRICE_TYPES;
  protected readonly qTypes = Q_TYPES;
  protected readonly svcPresets = Object.keys(SVC_PRESETS);
  protected readonly intro = INTRO;
  protected readonly maxImages = 6;

  protected readonly type = signal<FormType>('food');
  protected readonly editId = signal<string | null>(null);
  protected readonly cats = computed(() => CATS[this.type()]);
  protected readonly tried = signal(false);
  private saved = false;

  protected form: FormGroup = this.build('food');
  /** Giá trị form hiện tại (để vẽ cột xem trước) */
  protected readonly v = signal<V>(this.form.getRawValue());

  ngOnInit(): void {
    this.seller.load().subscribe(() => {
      const id = this.route.snapshot.paramMap.get('id');
      const p = id ? this.seller.posts().find((x) => x.id === id) : undefined;
      if (p) {
        this.editId.set(p.id);
        this.setType(p.formType ?? (p.kind === 'food' ? 'food' : p.kind), false);
        this.restore(p);
      } else {
        const q = this.route.snapshot.queryParamMap.get('type');
        this.setType(q === 'goods' || q === 'service' || q === 'job' || q === 'drink' ? q : 'food', false);
      }
    });
  }

  // ---------------- dựng / đổi loại form ----------------

  private build(t: FormType, preset = 'Giặt sấy'): FormGroup {
    const spec = t === 'food' ? foodGroup(this.fb) : t === 'drink' ? drinkGroup(this.fb) : t === 'goods' ? goodsGroup(this.fb) : t === 'service' ? serviceGroup(this.fb, preset) : jobGroup(this.fb);
    const g = this.fb.group({ common: commonGroup(this.fb, t), spec });
    g.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.v.set(g.getRawValue()));
    return g;
  }

  protected setType(t: FormType, ask = true): void {
    if (this.editId() && ask) return;
    if (ask && this.form.dirty && !window.confirm('Đổi loại bài sẽ xóa nội dung đang nhập. Tiếp tục?')) return;
    const keep = this.form.get('common')?.getRawValue();
    this.type.set(t);
    this.form = this.build(t);
    // giữ ảnh, tên, mô tả, khu khi chỉ đổi Đồ ăn ↔ Đồ uống
    if (keep && (t === 'food' || t === 'drink')) this.form.get('common')?.patchValue({ ...keep, category: CATS[t][0] });
    this.v.set(this.form.getRawValue());
    this.tried.set(false);
  }

  protected pickType(t: FormType | 'foodish'): void {
    this.setType(t === 'foodish' ? 'food' : t);
  }

  protected isOn(t: FormType | 'foodish'): boolean {
    return t === 'foodish' ? this.type() === 'food' || this.type() === 'drink' : this.type() === t;
  }

  /** Chọn loại dịch vụ: điền lại gợi ý (gói, câu hỏi, lịch, nơi làm…) nhưng giữ phần chung */
  protected applyPreset(name: string): void {
    const keep = this.form.get('common')!.getRawValue();
    this.form = this.build('service', name);
    this.form.get('common')!.patchValue({ ...keep, category: name });
    this.v.set(this.form.getRawValue());
  }

  // ---------------- tiện ích cho template ----------------

  protected c(path: string): AbstractControl {
    return this.form.get(path)!;
  }

  protected arr(path: string): FormArray {
    return this.form.get(path) as FormArray;
  }

  protected grp(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  protected bad(path: string): boolean {
    const x = this.form.get(path);
    return !!x && x.invalid && (x.touched || this.tried());
  }

  /** Bật / tắt một giá trị trong ô dạng danh sách (ngày, nhãn, mức pha…) */
  protected toggleIn(path: string, v: string | number): void {
    const ctrl = this.form.get(path) as FormControl<(string | number)[]>;
    const cur = ctrl.value ?? [];
    ctrl.setValue(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].sort((a, b) => (typeof a === 'number' ? (a as number) - (b as number) : 0)));
    ctrl.markAsDirty();
  }

  protected has(path: string, v: string | number): boolean {
    return ((this.form.get(path)?.value as (string | number)[]) ?? []).includes(v);
  }

  protected set(path: string, v: unknown): void {
    const ctrl = this.form.get(path)!;
    ctrl.setValue(v);
    ctrl.markAsDirty();
  }

  protected addStr(path: string): void {
    this.arr(path).push(this.fb.control(''));
  }

  protected addChoice(path: string): void {
    this.arr(path).push(choice(this.fb));
  }

  protected addOptGroup(): void {
    this.arr('spec.options').push(optGroup(this.fb, '', false, true));
  }

  protected addPackage(): void {
    this.arr('spec.packages').push(packageGroup(this.fb));
  }

  protected addQuestion(): void {
    this.arr('spec.questions').push(questionGroup(this.fb));
  }

  protected removeAt(path: string, i: number): void {
    const a = this.arr(path);
    a.removeAt(i);
    a.markAsDirty();
  }

  // ---------------- ảnh ----------------

  protected get images(): string[] {
    return (this.c('common.images').value as string[]) ?? [];
  }

  /** PNG/JPG/WebP ≤ 2 MB, thu nhỏ còn cạnh dài 480px để lưu được trong trình duyệt */
  protected addImages(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []).slice(0, this.maxImages - this.images.length);
    input.value = '';
    for (const f of files) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 2 * 1024 * 1024) {
        this.toast.show('Chỉ nhận ảnh PNG/JPG/WebP dưới 2 MB');
        continue;
      }
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, 480 / Math.max(im.width, im.height));
          const cv = document.createElement('canvas');
          cv.width = im.width * k;
          cv.height = im.height * k;
          cv.getContext('2d')?.drawImage(im, 0, 0, cv.width, cv.height);
          this.set('common.images', [...this.images, cv.toDataURL('image/jpeg', 0.82)].slice(0, this.maxImages));
        };
        im.src = r.result as string;
      };
      r.readAsDataURL(f);
    }
  }

  protected removeImage(i: number): void {
    this.set('common.images', this.images.filter((_, k) => k !== i));
  }

  // ---------------- xem trước ----------------

  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly myName = computed(() => this.seller.shop()?.name ?? 'Gian hàng của bạn');
  protected readonly myAvatar = computed(() => this.seller.shop()?.avatar);
  protected readonly previewIcon = computed(() => { const t = this.type(); return SELLER_KIND_ICON[t === 'drink' ? 'food' : t]; });

  protected readonly preview = computed(() => {
    const t = this.type();
    const val = this.v();
    const c = val['common'] as V;
    const s = val['spec'] as V;
    const money = (n: unknown) => (n ? `${Number(n).toLocaleString('vi-VN')}đ` : '—');
    const dayList = (d: number[]) => (d?.length === 7 ? 'mọi ngày' : (d ?? []).map((i) => DAYS[i]).join(', ') || 'chưa chọn ngày');
    const how = (f: V) => [f['delivery'] ? `Giao trong khu${f['fee'] ? ` · ${money(f['fee'])}` : ' miễn phí'}` : '', f['pickup'] ? 'Tự đến lấy' : ''].filter(Boolean).join(' hoặc ') || 'Chưa chọn cách nhận';
    switch (t) {
      case 'food': {
        const sc = s['schedule'] as V;
        return {
          price: money(s['price']), unit: s['unit'], kind: 'Đồ ăn & uống', action: `Đặt món · ${money(s['price'])}`, xu: true,
          facts: [
            ['clock', 'Giờ nhận đặt', sc['mode'] === 'batch' ? `Đặt trước cho ngày ${sc['batchDate'] || '?'}` : `${sc['orderFrom']} – ${sc['orderTo']}, ${dayList(sc['days'])}`],
            ['pin', 'Cách nhận', how(s['fulfil'])],
            ['bolt', 'Thời gian chuẩn bị', `Khoảng ${sc['prep']} phút · nhận ${sc['pickFrom']} – ${sc['pickTo']}`],
          ],
          sched: `Mỗi ngày ${s['dailyLimit']} ${s['unit']}${s['tags']?.length ? ' · ' + s['tags'].join(', ') : ''}`, steps: SELLER_FLOW[s['fulfil']['delivery'] ? 'delivery' : 'pickup'],
        };
      }
      case 'drink': {
        const sizes = (s['sizes'] as V[]).filter((z) => z['price']);
        const min = sizes.length ? Math.min(...sizes.map((z) => +z['price'])) : 0;
        const mix = [s['hotCold'] ? 'Nóng / lạnh' : '', s['sweet']?.length ? `Ngọt ${s['sweet'].join('·')}` : '', s['ice']?.length ? `${s['ice'].length} mức đá` : ''].filter(Boolean).join(' · ');
        return {
          price: sizes.length > 1 ? `từ ${money(min)}` : money(min), unit: 'ly', kind: 'Đồ ăn & uống', action: `Đặt đồ uống · ${money(min)}`, xu: true,
          facts: [
            ['receipt', 'Size', sizes.map((z) => `${z['label']} ${money(z['price'])}`).join(' · ') || 'Chưa có size'],
            ['check', 'Pha chế', mix || 'Không tùy chọn'],
            ['bolt', 'Thời gian pha', `Khoảng ${(s['schedule'] as V)['prep']} phút · ${how(s['fulfil'])}`],
          ],
          sched: s['toppings']?.length ? `${s['toppings'].length} topping · tối đa ${s['maxToppings']} mỗi ly` : 'Không có topping', steps: SELLER_FLOW[s['fulfil']['delivery'] ? 'delivery' : 'pickup'],
        };
      }
      case 'goods': {
        const cond = CONDITIONS.find((x) => x[0] === s['condition'])?.[1] ?? '';
        const cheaper = s['newPrice'] && s['price'] ? Math.round((1 - s['price'] / s['newPrice']) * 100) : 0;
        return {
          price: money(s['price']), unit: s['unit'], kind: 'Đồ dùng', action: `Mua · ${money(s['price'])}`, xu: true,
          facts: [
            ['check', 'Tình trạng', `${cond}${s['usedFor'] ? ` · dùng ${s['usedFor']}` : ''}`],
            ['pin', 'Cách nhận', `Tự đến lấy ở ${c['area']} ${s['pickFrom']}–${s['pickTo']}${s['delivery'] ? ' · có giao' : ''}`],
            ['shield', 'Đổi trả', s['returns'] === '24h' ? 'Đổi trong 24 giờ nếu có lỗi chưa báo' : 'Không đổi trả'],
          ],
          sched: `${s['stock'] > 1 ? `Còn ${s['stock']} ${s['unit']}` : 'Bán một lần'}${cheaper > 0 ? ` · rẻ hơn mua mới ${cheaper}%` : ''}`, steps: SELLER_FLOW.pickup,
        };
      }
      case 'service': {
        const pk = (s['packages'] as V[])[0] ?? {};
        const pr = pk['priceType'] === 'quote' ? 'Báo giá sau' : `${pk['priceType'] === 'from' ? 'từ ' : ''}${money(pk['price'])}`;
        const mode = { slot: 'Khách chọn giờ hẹn', datedur: 'Chọn ngày + số giờ', weekly: 'Định kỳ hằng tuần', request: 'Khách gửi yêu cầu, bạn hẹn lại' }[s['schedMode'] as string];
        const place = { buyer: 'Tại nhà khách', seller: 'Khách mang tới', pickup: 'Lấy & trả tận nơi', choice: 'Khách chọn' }[s['place'] as string];
        return {
          price: pr, unit: pk['priceType'] === 'quote' ? '' : pk['unit'], kind: 'Dịch vụ', action: 'Đặt lịch', xu: true,
          facts: [
            ['receipt', 'Gói & giá', (s['packages'] as V[]).map((k) => `${k['name'] || 'Gói'} · ${k['priceType'] === 'quote' ? 'báo giá' : money(k['price'])}`).join(' | ')],
            ['clock', 'Lịch', `${mode} · ${s['from']}–${s['to']}${s['turnaround'] ? ' · ' + s['turnaround'] : ''}`],
            ['pin', 'Nơi làm', `${place} · ${s['serviceArea']}`],
          ],
          sched: `${s['inspect'] ? `Phí kiểm tra ${money(s['inspect'])} · ` : ''}Hủy miễn phí trước ${s['cancelHours']} giờ`, steps: SELLER_FLOW.home,
        };
      }
      default: {
        const when = s['timeMode'] === 'weekly' ? `${dayList(s['weekDays'])} · ${s['from'] || '?'}–${s['to'] || '?'}` : s['timeMode'] === 'flex' ? `Xong trước ${s['deadline'] || '?'}` : `${s['date'] || 'chưa chọn ngày'} · ${s['from'] || '?'}–${s['to'] || '?'}`;
        const where = s['placeMode'] === 'ab' ? `${s['pointA'] || '?'} → ${s['pointB'] || '?'}` : s['placeMode'] === 'remote' ? 'Làm từ xa' : c['area'];
        return {
          price: money(s['pay']), unit: { fixed: 'việc', hour: 'giờ', trip: 'lượt' }[s['payType'] as string] ?? '', kind: 'Việc làm', action: 'Đề nghị nhận việc', xu: false,
          facts: [
            ['clock', 'Thời gian làm', when],
            ['pin', 'Địa điểm', where],
            ['users', 'Số người cần', `${s['head'] || 1} người`],
            ['receipt', 'Thanh toán', `${s['payBy'] === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} · ${s['payWhen'] === 'start' ? 'khi bắt đầu' : 'khi xong việc'}${s['advance'] ? ' · có ứng trước' : ''}`],
          ],
          sched: s['offerDate'] ? `Nhận đề nghị đến ${s['offerDate']} ${s['offerTime'] || ''}` : 'Nhận đề nghị đến khi bạn chọn người', steps: SELLER_FLOW.job,
        };
      }
    }
  });

  // ---------------- lưu ----------------

  /** Kiểm tra thêm ngoài validator của từng ô; trả về câu báo lỗi đầu tiên */
  private extraError(): string | null {
    const t = this.type();
    const s = this.form.get('spec')!.getRawValue() as V;
    if (t !== 'job' && !this.images.length) return 'Thêm ít nhất 1 ảnh để khách tin hơn';
    if (t === 'goods' && s['condition'] === 'usedFlaw' && !String(s['flaw']).trim()) return 'Đồ có lỗi: mô tả lỗi cho khách biết trước';
    if (t === 'drink' && !(s['sizes'] as V[]).some((z) => +z['price'] > 0)) return 'Đồ uống cần ít nhất một size có giá';
    if (t === 'service' && (s['packages'] as V[]).some((k) => k['priceType'] !== 'quote' && !(+k['price'] > 0))) return 'Nhập giá cho từng gói (hoặc chọn “Báo giá sau”)';
    if ((t === 'food' || t === 'drink') && !(s['fulfil'] as V)['delivery'] && !(s['fulfil'] as V)['pickup']) return 'Chọn ít nhất một cách nhận món';
    if (t === 'job') {
      if (s['timeMode'] === 'once' && (!s['date'] || !s['from'])) return 'Chọn ngày và giờ bắt đầu làm';
      if (s['timeMode'] === 'weekly' && !(s['weekDays'] as number[]).length) return 'Chọn các thứ trong tuần cần làm';
      if (s['timeMode'] === 'flex' && !s['deadline']) return 'Chọn hạn cần xong việc';
      if (s['placeMode'] === 'one' && !String(s['exact']).trim()) return 'Nhập địa chỉ chính xác (chỉ gửi cho người được chọn)';
      if (s['placeMode'] === 'ab' && (!String(s['pointA']).trim() || !String(s['pointB']).trim())) return 'Nhập điểm A và điểm B';
    }
    return null;
  }

  protected submit(draft = false): void {
    this.tried.set(true);
    this.form.markAllAsTouched();
    const err = this.form.invalid ? 'Còn ô chưa điền đúng — xem các ô viền đỏ' : this.extraError();
    if (err && !draft) {
      this.toast.show(err);
      setTimeout(() => document.querySelector('.bad, .ng-invalid.ng-touched')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      return;
    }
    const post = this.toPost(draft);
    this.seller.upsertPost(post);
    if (post.kind === 'job') this.saveJob(post);
    // bản rút gọn sang kho bài phía Mua để hiện ở trang chủ (chỉ bài mới, không phải nháp)
    if (!this.editId() && !draft) this.publishToBuyers(post);
    this.saved = true;
    this.toast.show(draft ? 'Đã lưu nháp — bài đang tạm ẩn, chưa hiện cho khách' : this.editId() ? 'Đã lưu thay đổi' : 'Đã đăng — hàng xóm trong khu thấy ngay ở “Gần bạn”');
    this.router.navigate(['/seller/posts']);
  }

  private priceOf(s: V): { price: number; unit: string; stock: number; max: number } {
    switch (this.type()) {
      case 'food': return { price: +s['price'] || 0, unit: `/ ${s['unit']}`, stock: +s['dailyLimit'] || 0, max: +s['dailyLimit'] || 20 };
      case 'drink': {
        const ps = (s['sizes'] as V[]).map((z) => +z['price']).filter((n) => n > 0);
        return { price: ps.length ? Math.min(...ps) : 0, unit: '/ ly', stock: s['unlimited'] ? 99 : +s['dailyLimit'] || 0, max: s['unlimited'] ? 99 : +s['dailyLimit'] || 50 };
      }
      case 'goods': return { price: +s['price'] || 0, unit: `/ ${s['unit']}`, stock: +s['stock'] || 1, max: Math.max(+s['stock'] || 1, 20) };
      case 'service': {
        const k = (s['packages'] as V[])[0] ?? {};
        return { price: +k['price'] || 0, unit: k['unit'] ? `/ ${k['unit']}` : '', stock: +s['perSlot'] || 1, max: Math.max(+s['perSlot'] || 1, 5) };
      }
      default: return { price: +s['pay'] || 0, unit: `/ ${{ fixed: 'việc', hour: 'giờ', trip: 'lượt' }[s['payType'] as string]}`, stock: +s['head'] || 1, max: 10 };
    }
  }

  private toPost(draft: boolean): SellerPost {
    const t = this.type();
    const raw = this.form.getRawValue() as V;
    const c = raw['common'] as V;
    const cur = this.editId() ? this.seller.posts().find((p) => p.id === this.editId()) : undefined;
    const kind: PostKind = t === 'drink' ? 'food' : t;
    const id = cur?.id ?? 'n' + Date.now();
    return {
      ...(cur ?? { views: 0, saves: 0, sold: 0 }),
      id, kind, title: String(c['title']).trim() || 'Bài nháp chưa đặt tên', image: c['images'][0], icon: c['images'][0] ? undefined : SELLER_KIND_ICON[kind],
      ...this.priceOf(raw['spec'] as V), on: draft ? false : (cur?.on ?? true), category: c['category'],
      jobId: kind === 'job' ? cur?.jobId ?? 'j-' + id : undefined, form: raw, formType: t,
    };
  }

  private saveJob(p: SellerPost): void {
    const s = (p.form as V)['spec'] as V;
    const c = (p.form as V)['common'] as V;
    const when = this.preview().facts[0][2];
    this.seller.upsertJob({
      id: p.jobId!, code: 'AG-J' + String(Date.now()).slice(-4), postId: p.id, title: p.title, category: c['category'], pay: p.price, unit: p.unit ?? '',
      when, day: 0, time: s['from'] || '8:00', duration: Math.round((+s['hours'] || 1) * 60), head: +s['head'] || 1, area: c['area'],
      exact: s['placeMode'] === 'ab' ? `${s['pointA']} → ${s['pointB']}` : s['exact'] || 'Làm từ xa', desc: c['desc'],
      reqs: (s['reqs'] as string[]).filter((x) => x.trim()), closed: !p.on,
    });
  }

  private publishToBuyers(p: SellerPost): void {
    const c = (p.form as V)['common'] as V;
    if (!this.auth.currentUser()) return;
    this.sellerApi
      .savePost({ kind: p.kind, title: p.title, description: c['desc'], price: p.price, priceUnit: p.unit?.replace('/ ', ''), block: c['area'].replace('Block ', ''), images: c['images'], acceptsXu: p.kind !== 'job', due: p.kind === 'job' ? this.preview().facts[0][2] : undefined })
      .subscribe({ error: () => undefined });
  }

  // ---------------- sửa bài cũ ----------------

  /** Mở lại bài: có dữ liệu form thì dựng đúng từng ô, bài mẫu cũ thì điền những gì có */
  private restore(p: SellerPost): void {
    if (p.form) {
      if (this.type() === 'service') this.applyPreset(((p.form as V)['spec'] as V)['preset'] ?? 'Khác');
      this.fit(this.form, p.form);
      this.form.patchValue(p.form);
    } else {
      this.form.get('common')!.patchValue({ title: p.title, images: p.image ? [p.image] : [], category: CATS[this.type()].includes(p.category) ? p.category : CATS[this.type()][0] });
      const spec = this.form.get('spec')!;
      if (p.kind === 'food') spec.patchValue({ price: p.price, unit: p.unit?.replace('/ ', '') ?? 'phần', dailyLimit: p.max });
      if (p.kind === 'goods') spec.patchValue({ price: p.price, unit: p.unit?.replace('/ ', '') ?? 'cái', stock: p.stock });
      if (p.kind === 'service') (spec.get('packages') as FormArray).at(0)?.patchValue({ name: p.title, price: p.price, unit: p.unit?.replace('/ ', '') ?? 'lần' });
      if (p.kind === 'job') {
        const j = this.seller.jobs().find((x) => x.id === p.jobId);
        spec.patchValue({ pay: p.price, head: p.stock, from: j?.time.padStart(5, '0') ?? '', exact: j?.exact ?? '' });
        if (j) {
          this.form.get('common')!.patchValue({ desc: j.desc });
          this.fit(this.form, { spec: { reqs: j.reqs.length ? j.reqs : [''] } });
          spec.patchValue({ reqs: j.reqs.length ? j.reqs : [''] });
        }
      }
    }
    this.form.markAsPristine();
    this.v.set(this.form.getRawValue());
  }

  /** Cho các FormArray đủ số phần tử để patchValue khớp dữ liệu đã lưu */
  private fit(ctrl: AbstractControl, val: unknown): void {
    if (ctrl instanceof FormGroup && val && typeof val === 'object') {
      for (const [k, sub] of Object.entries(val as V)) {
        const child = ctrl.get(k);
        if (child instanceof FormArray && Array.isArray(sub)) {
          child.clear();
          sub.forEach((item) => {
            const made = this.itemFor(k, item);
            child.push(made);
            this.fit(made, item);
          });
        } else if (child) this.fit(child, sub);
      }
    }
  }

  private itemFor(key: string, item: unknown): AbstractControl {
    switch (key) {
      case 'options': return optGroup(this.fb, '', false, true, []);
      case 'choices': case 'sizes': case 'toppings': case 'addons': return choice(this.fb);
      case 'packages': return packageGroup(this.fb);
      case 'questions': return questionGroup(this.fb);
      default: return this.fb.control(typeof item === 'string' ? '' : item, key === 'notes' ? [] : [Validators.nullValidator]);
    }
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && this.form.dirty;
  }
}
