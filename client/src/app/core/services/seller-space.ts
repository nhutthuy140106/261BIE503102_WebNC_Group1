import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { DATASET_BASE } from '../config/api.config';
import { OFFER_STATE_LABEL } from '../models/offer';
import { PostKind } from '../models/post';
import {
  DayHours, JOB_STEP_NAMES, SELLER_LANE, SellerJob, SellerOffer, SellerOrder, SellerOrderState, SellerPause, SellerPerson, SellerPost,
  SellerSpace, StatsRange, SellerChat, SellerShop, StepItem, orderPos, orderStepNames, stepItems,
} from '../models/seller';
import { MockDb } from './mock-db';
import { XuService } from './xu';

/** Đơn kèm các giá trị tính sẵn để hiển thị */
export interface SellerOrderView extends SellerOrder {
  total: number;
  label: string;
  need: boolean;
  ended: boolean;
  /** màu chấm trạng thái: act (cam, cần xử lý) · go (xanh) · done (xám) · off (nhạt) */
  cls: 'act' | 'go' | 'done' | 'off';
}

export interface SellerOfferView extends SellerOffer {
  label: string;
}

export interface SellerJobView extends Omit<SellerJob, 'offers'> {
  offers: SellerOfferView[];
  waiting: SellerOfferView[];
  active: SellerOfferView[];
  label: string;
  need: boolean;
  cls: 'act' | 'go' | 'done';
}

/** Một việc trong khối "Cần bạn xử lý" của trang Hôm nay */
/** order = đơn mới · step = đơn đã nhận tới lúc làm bước tiếp (thực hiện / giao / hoàn thành) */
export type TaskType = 'order' | 'step' | 'cancel' | 'pick' | 'done' | 'question' | 'review';
export interface SellerTask {
  key: string;
  type: TaskType;
  kind: PostKind;
  /** nhãn góc trái (mặc định tên mảng) */
  tag?: string;
  due?: string;
  status: string;
  /** dòng nhỏ trên tên: mã đơn / mã việc / tên bài */
  top: string;
  title: string;
  amount?: number;
  unit?: string;
  stars?: number;
  image?: string;
  avatar?: string;
  faces?: string[];
  icon?: string;
  who?: string;
  where?: string;
  note?: string;
  noteIcon?: string;
  /** người cần báo tin (để ghi trong hộp xác nhận) */
  buyer?: string;
  /** Đầu thẻ, giống dòng "Cần bạn xử lý" ở Đơn hàng phía Mua: ảnh + tên người kia · nhãn loại · trạng thái */
  person: string;
  personAvatar?: string;
  /** "Đơn khách đặt" · "Việc bạn đăng" · "Hỏi đáp" · "Đánh giá" */
  kindTag: string;
  /** dòng ngày giờ dưới tên bài (dd/mm/yyyy · HH:mm) */
  when: string;
  /** "Tổng tiền" / "Tiền công" */
  amountLabel?: string;
  orderId?: string;
  /** bước tiếp của đơn (thẻ "step") */
  act?: SellerOrderAct;
  jobId?: string;
  offerId?: string;
  questionId?: string;
  reviewId?: string;
}

/** Một thẻ trên lịch: đơn đã xác nhận có giờ, hoặc việc đã chọn người */
export interface CalItem {
  key: string;
  kind: PostKind;
  time: string;
  duration: number;
  image?: string;
  avatar?: string;
  who: string;
  address: string;
  phone: string;
  item: string;
  link: string;
  done: boolean;
}

const END_LABEL: Partial<Record<SellerOrderState, string>> = { declined: 'Đã từ chối', cancelled: 'Đã hủy' };
const NEXT: Record<string, SellerOrderState> = {
  confirm: 'confirmed', prepare: 'preparing', deliver: 'delivering', ready: 'ready', complete: 'done', decline: 'declined', approveCancel: 'cancelled',
  // giặt sấy
  pickUp: 'picked', quote: 'pricing', approveQuote: 'preparing', returned: 'done',
};
/** pickUp / quote / approveQuote / returned: luồng giặt sấy (approveQuote = khách đồng ý giá, phía Mua bấm; bản mẫu giả lập) */
export type SellerOrderAct = 'confirm' | 'decline' | 'prepare' | 'deliver' | 'ready' | 'complete' | 'approveCancel' | 'keepOrder' | 'surcharge' | 'pickUp' | 'quote' | 'approveQuote' | 'returned';

export const toMin = (t: string): number => {
  const m = /^(\d+):(\d+)/.exec(t || '');
  return m ? +m[1] * 60 + +m[2] : 0;
};
const money = (n: number) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;
const nowHm = () => {
  const x = new Date();
  return `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`;
};
export const dateOf = (d: number): Date => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + d);
  return x;
};
export const dayText = (d: number, opt: Intl.DateTimeFormatOptions): string => dateOf(d).toLocaleDateString('vi-VN', opt);
/** "Hôm nay" / "Hôm qua" / "Ngày mai" / "T5, 29/10" */
export const dayLabel = (d: number): string =>
  d === 0 ? 'Hôm nay' : d === -1 ? 'Hôm qua' : d === 1 ? 'Ngày mai' : dayText(d, { weekday: 'short', day: '2-digit', month: '2-digit' });

/**
 * Khu Bán & Đăng việc — dữ liệu và thao tác của người bán.
 * Chưa có endpoint thật (decisions F5, cờ `seller` luôn mock): đọc `datasets/seller-space.json` qua MockDb,
 * mọi thao tác lưu lại trong trình duyệt nên các trang Hôm nay / Giao dịch / Lịch… luôn khớp nhau.
 */
@Injectable({ providedIn: 'root' })
export class SellerSpaceService {
  private readonly db = inject(MockDb);
  private readonly http = inject(HttpClient);
  private readonly xuSvc = inject(XuService);
  private static readonly NAME = 'seller-space';
  /** khớp trường `version` trong datasets/seller-space.json */
  private static readonly VERSION = '2026-10-30-a';

  private readonly state = signal<SellerSpace | null>(null);
  readonly ready = computed(() => this.state() !== null);

  readonly shop = computed(() => this.state()?.shop);
  /** Số dư AntXu dùng chung với header / trang Xu */
  readonly xu = computed(() => this.xuSvc.balance());
  readonly pause = computed(() => this.state()?.pause ?? null);
  readonly stats = computed(() => this.state()?.stats);
  readonly hours = computed<DayHours[]>(() => this.state()?.hours ?? []);
  readonly reviews = computed(() => this.state()?.reviews ?? []);
  readonly chats = computed(() => this.state()?.chats ?? []);

  readonly orders = computed<SellerOrderView[]>(() =>
    (this.state()?.orders ?? []).map((o) => {
      const need = o.state === 'waiting' || !!o.cancelRequest;
      const ended = ['done', 'declined', 'cancelled'].includes(o.state);
      // giặt sấy đã báo giá: tính theo số cân / đếm thực tế
      const goods = o.quote ? o.quote.total : o.items.reduce((n, i) => n + i.qty * i.price, 0);
      const total = goods + (o.ship || 0) + (o.surcharge?.ok ? o.surcharge.amount : 0);
      const label = END_LABEL[o.state] ?? (o.state === 'waiting' ? 'Chờ xác nhận' : o.state === 'pricing' ? 'Chờ khách duyệt giá' : orderStepNames(o.kind, o.flow)[orderPos(o.kind, o.state, o.flow) ?? 0]);
      return { ...o, total, label, need, ended, cls: need ? 'act' : ended ? (o.state === 'done' ? 'done' : 'off') : 'go' };
    }),
  );

  readonly jobs = computed<SellerJobView[]>(() =>
    (this.state()?.jobs ?? []).map((j) => {
      const offers = j.offers.map((o) => ({ ...o, label: o.state === 'withdrawn' ? 'Đã rút' : OFFER_STATE_LABEL[o.state] }));
      const active = offers.filter((o) => ['chosen', 'working', 'reported', 'done'].includes(o.state));
      const waiting = offers.filter((o) => o.state === 'offered');
      const label = j.closed ? (active.length ? 'Đã xong' : 'Đã đóng') : active.length >= j.head ? 'Đã có người nhận' : `Đang mở · ${waiting.length} đề nghị`;
      const need = (waiting.length > 0 && active.length < j.head && !j.closed) || offers.some((o) => o.state === 'reported') || j.questions.some((q) => !q.answer);
      return { ...j, offers, active, waiting, label, need, cls: need ? 'act' : j.closed ? 'done' : 'go' };
    }),
  );

  /** Bài đăng — bài việc làm lấy số đề nghị / người đã chọn từ việc tương ứng */
  readonly posts = computed<SellerPost[]>(() => this.state()?.posts ?? []);

  /** Khối "Cần bạn xử lý": suy ra từ dữ liệu, xếp theo độ gấp */
  readonly tasks = computed<SellerTask[]>(() => {
    const out: (SellerTask & { rank: number })[] = [];
    const place = (o: SellerOrder) =>
      (o.fulfil === 'pickup' ? 'Tự đến lấy' : o.fulfil === 'home' ? `Tại nhà ${o.address.split(',')[0]}` : `Giao tới ${o.address.split(',')[0]}`) +
      ` · ${o.day ? dayText(o.day, { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' : ''}${o.time}`;
    // ngày giờ kiểu dòng Đơn hàng phía Mua: 16/10/2026 · 18:00
    const at = (day: number, time: string) => `${dayText(day, { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${time}`;
    for (const o of this.orders()) {
      const base = {
        kind: o.kind as PostKind, top: o.code, title: o.title, amount: o.total, amountLabel: 'Tổng tiền', image: o.image, icon: o.icon, orderId: o.id,
        who: `${o.buyer.name} (${o.buyer.phone})`, where: place(o), buyer: o.buyer.name,
        person: o.buyer.name, personAvatar: o.buyer.avatar, kindTag: 'Đơn khách đặt', when: at(o.day, o.time),
      };
      if (o.cancelRequest) {
        out.push({ ...base, key: 'c-' + o.id, type: 'cancel', status: 'Xác nhận hủy', note: `Lý do: ${o.cancelRequest}`, noteIcon: 'question', rank: 2 });
      } else if (o.state === 'waiting') {
        out.push({ ...base, key: 'o-' + o.id, type: 'order', status: 'Xác nhận đơn', due: o.kind === 'service' ? undefined : o.due, note: o.note, rank: o.day === 0 ? 0 : 3 });
      } else {
        const next = this.nextStep(o);
        if (next) out.push({ ...base, key: 's-' + o.id, type: 'step', status: next[1], act: next[0], due: `${o.flow === 'laundry' ? 'Hẹn lấy' : o.kind === 'service' ? 'Hẹn' : 'Giao'} lúc ${o.time}`, rank: 2.5 });
      }
    }
    for (const j of this.jobs()) {
      const jobBase = { kind: 'job' as PostKind, top: j.code, title: j.title, amount: j.pay, amountLabel: 'Tiền công', unit: j.unit, jobId: j.id, icon: 'hand', kindTag: 'Việc bạn đăng', when: at(j.day, j.time) };
      if (!j.closed && j.waiting.length && j.active.length < j.head) {
        out.push({
          ...jobBase, key: 'p-' + j.id, type: 'pick', status: 'Chọn người', due: j.due,
          person: `${j.waiting.length} đề nghị`, faces: j.waiting.map((o) => o.worker.avatar), who: `${j.waiting.length} người đề nghị · ${j.waiting.map((o) => o.worker.name).join(', ')}`,
          where: `${j.exact.split(' (')[0]} · ${j.time}–${hmAdd(j.time, j.duration)} ${j.day === 0 ? 'hôm nay' : dayText(j.day, { weekday: 'short' })}`, rank: 1,
        });
      }
      for (const o of j.offers.filter((x) => x.state === 'reported')) {
        out.push({
          ...jobBase, key: 'd-' + o.id, type: 'done', status: 'Xác nhận hoàn thành', due: j.due, offerId: o.id, when: at(o.day ?? j.day, j.time),
          person: o.worker.name, personAvatar: o.worker.avatar, avatar: o.worker.avatar, who: `${o.worker.name} (${o.worker.phone})`,
          where: `${j.category === 'Mua hộ' ? 'Chợ đầu mối' : j.exact.split(' (')[0]} · báo xong ${o.report?.at ?? ''}`,
          note: o.report ? `${o.report.note.split(',')[0]}${o.report.photos ? `, kèm ${o.report.photos} ảnh` : ''}` : undefined, buyer: o.worker.name, rank: 4,
        });
      }
      for (const q of j.questions.filter((x) => !x.answer)) {
        out.push({
          key: 'q-' + q.id, type: 'question', kind: 'job', tag: 'Hỏi đáp', status: 'Hỏi đáp', top: j.code, title: j.title, icon: 'hand',
          person: q.by.name, personAvatar: q.by.avatar, kindTag: 'Hỏi đáp', when: q.at,
          avatar: q.by.avatar, note: `“${q.text}”`, noteIcon: 'chat', jobId: j.id, questionId: q.id, rank: 5,
        });
      }
    }
    for (const r of this.reviews().filter((x) => !x.reply)) {
      const ord = this.orders().find((o) => o.id === r.orderId);
      out.push({
        key: 'r-' + r.id, type: 'review', kind: 'food', tag: 'Đánh giá', status: 'Đánh giá', top: ord?.code ?? r.post, title: ord?.title ?? r.post,
        image: ord?.image, icon: 'star', person: r.by.name, personAvatar: r.by.avatar, kindTag: 'Đánh giá', when: r.at,
        stars: r.stars, avatar: r.by.avatar, note: `“${r.text}”`, noteIcon: 'chat', reviewId: r.id, rank: 6,
      });
    }
    return out.sort((a, b) => a.rank - b.rank).map(({ rank: _r, ...t }) => t);
  });

  /**
   * Bước người bán phải làm tiếp với đơn đã nhận, chỉ khi gần tới giờ hẹn (đồ ăn trước 60 phút, dịch vụ trước 2 giờ,
   * đồ dùng trong ngày hẹn; quá giờ vẫn hiện). "Đang giao → Hoàn thành" do phía Mua bấm nên không có ở đây.
   */
  private nextStep(o: SellerOrder): [SellerOrderAct, string] | null {
    // giặt sấy: lấy đồ khi gần giờ hẹn; báo giá và trả đồ thì luôn hiện (không theo giờ hẹn)
    if (o.flow === 'laundry') {
      if (o.state === 'picked') return ['quote', 'Báo giá'];
      if (o.state === 'preparing') return ['returned', 'Xác nhận trả đồ'];
    }
    const left = (dateOf(o.day).getTime() + toMin(o.time) * 60000 - Date.now()) / 60000;
    const soon = o.kind === 'goods' ? o.day <= 0 : left <= (o.kind === 'food' ? 60 : 120);
    if (!soon) return null;
    if (o.flow === 'laundry') return o.state === 'confirmed' ? ['pickUp', 'Xác nhận lấy đồ'] : null;
    const give: SellerOrderAct = o.fulfil === 'pickup' ? 'ready' : 'deliver';
    if (o.state === 'confirmed') return o.kind === 'goods' ? [give, 'Xác nhận giao'] : ['prepare', 'Xác nhận thực hiện'];
    if (o.state === 'preparing') return o.kind === 'service' ? ['complete', 'Xác nhận hoàn thành'] : [give, 'Xác nhận giao'];
    return null;
  }

  /** Nạp dữ liệu (lần đầu đọc JSON, sau đó lấy bản đã lưu trong trình duyệt) */
  load(): Observable<SellerSpace> {
    const cur = this.state();
    if (cur) return of(cur);
    return this.db.list<SellerSpace>(SellerSpaceService.NAME).pipe(
      switchMap((rows) => (rows[0]?.version === SellerSpaceService.VERSION ? of(structuredClone(rows[0])) : this.reset(rows[0]?.posts))),
      tap((s) => this.state.set(s)),
    );
  }

  /** Xóa thao tác bấm thử, quay về dữ liệu mẫu gốc. `keepPosts`: khi đổi phiên bản dữ liệu mẫu thì giữ lại bài người dùng đã đăng */
  reset(keepPosts?: SellerPost[]): Observable<SellerSpace> {
    return this.http.get<SellerSpace[]>(`${DATASET_BASE}/${SellerSpaceService.NAME}.json`).pipe(
      map((rows) => structuredClone(rows[0])),
      map((s) => (keepPosts?.length ? { ...s, posts: [...keepPosts.filter((p) => !s.posts.some((x) => x.id === p.id)), ...s.posts] } : s)),
      tap((s) => {
        this.state.set(s);
        this.db.save(SellerSpaceService.NAME, [s]);
      }),
    );
  }

  // ---------------- thao tác ----------------

  private patch(fn: (s: SellerSpace) => void): void {
    const s = this.state();
    if (!s) return;
    const next = structuredClone(s);
    fn(next);
    this.state.set(next);
    this.db.save(SellerSpaceService.NAME, [next]);
  }

  setPost(id: string, patch: Partial<SellerPost>): void {
    this.patch((s) => {
      const p = s.posts.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    });
  }

  /** Nhân bản bài: bản sao tạm ẩn, chưa có lượt xem / quảng bá */
  duplicatePost(id: string): void {
    this.patch((s) => {
      const p = s.posts.find((x) => x.id === id);
      if (!p) return;
      const copy: SellerPost = { ...structuredClone(p), id: 'n' + Date.now(), title: `${p.title} (bản sao)`, on: false, views: 0, saves: 0, sold: 0, promo: undefined, jobId: undefined };
      s.posts.splice(s.posts.indexOf(p) + 1, 0, copy);
    });
  }

  removePost(id: string): void {
    this.patch((s) => (s.posts = s.posts.filter((x) => x.id !== id)));
  }

  /** Thêm bài mới (form đăng bài) hoặc ghi đè bài đang sửa */
  upsertPost(p: SellerPost): void {
    this.patch((s) => {
      const i = s.posts.findIndex((x) => x.id === p.id);
      if (i >= 0) s.posts[i] = p;
      else s.posts.unshift(p);
    });
  }

  /** Tạo / sửa việc (form đăng việc) — giữ nguyên người đề nghị, hỏi đáp nếu đã có */
  upsertJob(job: Omit<SellerJob, 'offers' | 'questions'>): void {
    this.patch((s) => {
      const cur = s.jobs.find((x) => x.id === job.id);
      if (cur) Object.assign(cur, job);
      else s.jobs.unshift({ ...job, offers: [], questions: [] });
    });
  }

  /** Dùng Xu quảng bá / ghim bài. Trả về câu báo, hoặc null nếu không đủ Xu. */
  promote(id: string): string | null {
    const p = this.posts().find((x) => x.id === id);
    if (!p) return null;
    const [, cost] = SELLER_LANE[p.kind].xu;
    if (!this.xuSvc.spend(cost, `${SELLER_LANE[p.kind].xu[0]}: ${p.title}`, `promo:${p.id}`)) return null;
    this.patch((s) => {
      const q = s.posts.find((x) => x.id === id);
      if (q) q.promo = 'còn 3 ngày';
    });
    return `Đã dùng ${cost} Xu — “${p.title}” ${p.kind === 'job' ? 'được ghim đầu danh sách việc' : 'lên Nổi bật trong khu'} 3 ngày`;
  }

  setShop(patch: Partial<SellerShop>): void {
    this.patch((s) => Object.assign(s.shop, patch));
  }

  /** Giờ nhận đơn theo thứ (0 = Thứ Hai … 6 = Chủ nhật) */
  setHours(hours: DayHours[]): void {
    this.patch((s) => (s.hours = hours));
  }

  /** Thêm / bỏ ngày nghỉ (d = số ngày so với hôm nay) */
  setOff(d: number, note: string | null): void {
    this.patch((s) => {
      s.offs = s.offs.filter((o) => o.day !== d);
      if (note !== null) s.offs.push({ day: d, note });
      s.offs.sort((a, b) => a.day - b.day);
    });
  }

  readonly offs = computed(() => this.state()?.offs ?? []);

  setPause(p: SellerPause | null): void {
    this.patch((s) => (s.pause = p));
  }

  orderActions(o: SellerOrderView): [SellerOrderAct, string, boolean][] {
    if (o.cancelRequest) return [['approveCancel', 'Xác nhận hủy', true], ['keepOrder', 'Không đồng ý', false]];
    const svc = o.fulfil === 'home';
    if (o.flow === 'laundry') {
      switch (o.state) {
        case 'waiting': return [['confirm', 'Xác nhận', true], ['decline', 'Từ chối', false]];
        case 'confirmed': return [['pickUp', 'Xác nhận đã lấy đồ', true]];
        case 'picked': return [['quote', 'Báo giá', true]];
        case 'preparing': return [['returned', 'Xác nhận đã trả đồ', true]];
        default: return [];
      }
    }
    switch (o.state) {
      case 'waiting': return [['confirm', 'Xác nhận', true], ['decline', 'Từ chối', false]];
      case 'confirmed':
        // đồ dùng không có bước "Đang thực hiện": xác nhận xong là giao / hẹn khách lấy
        if (o.kind === 'goods') return [[o.fulfil === 'pickup' ? 'ready' : 'deliver', o.fulfil === 'pickup' ? 'Báo khách đến lấy' : 'Bắt đầu giao', true], ['surcharge', 'Báo phụ thu', false]];
        return [['prepare', svc ? 'Bắt đầu làm' : 'Bắt đầu chuẩn bị', true], ...(svc ? ([['surcharge', 'Báo phụ thu', false]] as [SellerOrderAct, string, boolean][]) : [])];
      case 'preparing': return svc
        ? [['complete', 'Báo hoàn thành', true], ['surcharge', 'Báo phụ thu', false]]
        : [[o.fulfil === 'pickup' ? 'ready' : 'deliver', o.fulfil === 'pickup' ? 'Báo khách đến lấy' : 'Bắt đầu giao', true]];
      case 'delivering': return [['complete', 'Đã giao xong', true]];
      case 'ready': return [['complete', 'Khách đã lấy', true]];
      default: return [];
    }
  }

  /** Thanh bước của một đơn (cùng tên bước với chi tiết đơn phía Mua) */
  orderSteps(o: SellerOrder): StepItem[] {
    const names = orderStepNames(o.kind, o.flow);
    const times: string[] = [];
    let reached = 0;
    for (const [st, t] of o.history) {
      const p = orderPos(o.kind, st, o.flow);
      if (p !== undefined) [times[p], reached] = [t, Math.max(reached, p)];
    }
    const end = o.history.find((h) => h[0] === o.state)?.[1] ?? '';
    if (o.state === 'declined') {
      times[1] = end;
      return stepItems(names, 0, { times, cut: { at: 1, label: 'Đã từ chối' } });
    }
    if (o.state === 'cancelled') {
      const at = Math.min(names.length - 1, reached + 1);
      times[at] = end;
      return stepItems(names, 0, { times, cut: { at, label: 'Đã hủy' } });
    }
    return stepItems(names, orderPos(o.kind, o.state, o.flow) ?? 0, { times });
  }

  /** Thanh bước của việc mình đăng, theo người làm đầu tiên (cùng tên bước với phía người nhận việc) */
  jobSteps(j: SellerJobView): StepItem[] {
    const order = ['offered', 'chosen', 'working', 'reported', 'done'];
    const a = j.active[0];
    const times: string[] = [];
    if (a?.report) times[3] = a.report.at;
    return stepItems(JOB_STEP_NAMES, a ? Math.max(0, order.indexOf(a.state)) : 0, { times });
  }

  /**
   * Nội dung hộp "Bạn chắc chắn…?" trước khi xác nhận đơn / xác nhận hủy / xác nhận việc xong.
   * Thanh bước giống chi tiết đơn; bước sắp chuyển tới là bước hiện tại (viền cam).
   */
  askView(a: SellerOrderAct | 'confirmDone', id: string, offerId?: string): { heading: string; message: string; steps: StepItem[]; ok: string } | null {
    if (a === 'confirmDone') {
      const j = this.jobs().find((x) => x.id === id);
      const of = j?.offers.find((x) => x.id === offerId);
      if (!j || !of) return null;
      return {
        heading: 'Xác nhận việc đã hoàn thành?', ok: 'Xác nhận',
        message: `Việc chuyển sang <b>Hoàn thành</b>. Bạn trả ${money(j.pay)} trực tiếp cho ${of.worker.name}.`,
        steps: stepItems(JOB_STEP_NAMES, JOB_STEP_NAMES.length - 1, { endOk: false }),
      };
    }
    const o = this.orders().find((x) => x.id === id);
    if (!o) return null;
    const names = orderStepNames(o.kind, o.flow);
    if (a === 'approveCancel') {
      const at = Math.min(names.length - 1, (orderPos(o.kind, o.state, o.flow) ?? 0) + 1);
      return {
        heading: 'Bạn chắc chắn xác nhận hủy?', ok: 'Xác nhận',
        message: `Đơn ${o.code} sẽ chuyển sang <b>Đã hủy</b>, ${o.buyer.name} được báo.`,
        steps: stepItems(names, 0, { cut: { at, label: 'Đã hủy' } }),
      };
    }
    const to = orderPos(o.kind, NEXT[a], o.flow) ?? 1;
    return {
      heading: `Xác nhận chuyển sang “${names[to]}”?`, ok: 'Xác nhận',
      message: `Đơn chuyển sang <b>${names[to]}</b>, ${o.buyer.name} được báo ngay.`,
      steps: stepItems(names, to, { endOk: false }),
    };
  }

  /** Người bán đổi bước đơn. Trả về câu báo cho toast. */
  orderAct(id: string, a: SellerOrderAct, data: { reason?: string; amount?: number; lines?: { name: string; qty: number; price: number }[] } = {}): string {
    const o = this.orders().find((x) => x.id === id);
    if (!o) return '';
    this.patch((s) => {
      const t = s.orders.find((x) => x.id === id)!;
      const stockBy = (name: string, d: number, offWhenEmpty = false) => {
        const p = s.posts.find((x) => x.kind === t.kind && (x.title.startsWith(name) || name.startsWith(x.title)));
        if (!p) return;
        p.stock = Math.max(0, Math.min(p.max, p.stock + d));
        if (offWhenEmpty && !p.stock) p.on = false;
      };
      if (a === 'keepOrder') return void (t.cancelRequest = null);
      if (a === 'surcharge') return void (t.surcharge = { amount: data.amount ?? 0, reason: data.reason ?? '', ok: false });
      if (a === 'quote') {
        const lines = data.lines ?? t.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price }));
        t.quote = { lines, total: Math.round(lines.reduce((n, l) => n + l.qty * l.price, 0)), ok: false };
      }
      if (a === 'approveQuote' && t.quote) t.quote.ok = true;
      const to = NEXT[a];
      t.state = to;
      t.cancelRequest = null;
      if (a === 'decline') t.declineReason = data.reason || 'Người bán không nhận được đơn';
      t.history.push([to, nowHm()]);
      // số lượng trên bài đi theo đơn: hủy trả lại phần, xác nhận đồ dùng / lịch dịch vụ thì trừ đi
      if (a === 'approveCancel' && t.kind === 'food') t.items.forEach((i) => stockBy(i.name, i.qty));
      if (a === 'confirm' && t.kind !== 'food') t.items.forEach((i) => stockBy(i.name, -i.qty, t.kind === 'goods'));
    });
    return {
      confirm: `Đã xác nhận ${o.code} — ${o.buyer.name} được báo, đơn vào lịch`, decline: `Đã từ chối ${o.code} — khách được báo và có thể đặt nơi khác`,
      prepare: 'Đã chuyển sang Đang thực hiện', deliver: 'Đã báo khách: đơn đang được giao', ready: 'Đã báo khách đến lấy', complete: `${o.code} đã hoàn thành`,
      approveCancel: `Đã hủy ${o.code} — ${o.buyer.name} được báo`, keepOrder: 'Đã báo khách: đơn vẫn giữ nguyên',
      surcharge: `Đã gửi phụ thu ${money(data.amount ?? 0)} — chờ khách đồng ý`,
      pickUp: `Đã lấy đồ của ${o.buyer.name} — cân xong thì báo giá`,
      quote: `Đã gửi báo giá cho ${o.buyer.name} — chờ khách đồng ý`,
      approveQuote: `${o.buyer.name} đã đồng ý giá — bắt đầu giặt`,
      returned: `Đã trả đồ ${o.code} — ${o.buyer.name} được báo`,
    }[a];
  }

  /** Người đăng việc xử lý đề nghị. Trả về câu báo cho toast. */
  offerAct(jobId: string, offerId: string, a: 'choose' | 'reject' | 'confirmDone' | 'rate', data: { stars?: number; text?: string } = {}): string {
    const j = this.jobs().find((x) => x.id === jobId);
    const o = j?.offers.find((x) => x.id === offerId);
    if (!j || !o) return '';
    this.patch((s) => {
      const job = s.jobs.find((x) => x.id === jobId)!;
      const t = job.offers.find((x) => x.id === offerId)!;
      if (a === 'choose') {
        t.state = 'chosen';
        // mỗi việc 1 người (F10): đề nghị còn chờ của cùng việc chuyển "Không được chọn"
        if (job.offers.filter((x) => ['chosen', 'working', 'reported', 'done'].includes(x.state)).length >= job.head)
          job.offers.filter((x) => x.state === 'offered').forEach((x) => (x.state = 'rejected'));
      }
      if (a === 'reject') t.state = 'rejected';
      if (a === 'confirmDone') t.state = 'done';
      if (a === 'rate') t.rated = { stars: data.stars ?? 5, text: data.text ?? '' };
    });
    return {
      choose: `Đã chọn ${o.worker.name} — địa chỉ chính xác đã gửi, người khác được báo “Không được chọn”`,
      reject: `Đã từ chối đề nghị của ${o.worker.name}`,
      confirmDone: `Đã xác nhận hoàn thành — nhớ trả ${money(j.pay)} cho ${o.worker.name}`,
      rate: `Đã đánh giá ${o.worker.name} ${data.stars ?? 5} sao`,
    }[a];
  }

  /** Đóng nhận đề nghị / mở lại việc */
  setJobClosed(id: string, closed: boolean): void {
    this.patch((s) => {
      const j = s.jobs.find((x) => x.id === id);
      if (j) j.closed = closed;
    });
  }

  /** Ghim việc lên đầu danh sách việc làm (20 Xu). Trả về câu báo, hoặc null nếu không đủ Xu. */
  pinJob(id: string): string | null {
    const j = this.jobs().find((x) => x.id === id);
    if (!j || !this.xuSvc.spend(20, `Ghim việc: ${j.title}`, `pin:${id}`)) return null;
    return 'Đã ghim việc lên đầu danh sách 3 ngày · trừ 20 Xu';
  }

  answer(jobId: string, questionId: string, text: string): void {
    this.patch((s) => {
      const q = s.jobs.find((x) => x.id === jobId)?.questions.find((x) => x.id === questionId);
      if (q) q.answer = text;
    });
  }

  reply(reviewId: string, text: string): void {
    this.patch((s) => {
      const r = s.reviews.find((x) => x.id === reviewId);
      if (r) r.reply = text;
    });
  }

  // ---------------- Messenger ----------------

  /** Mở (hoặc tạo) hội thoại với một người, gắn đơn / việc đang nói tới. Trả về id hội thoại. */
  openChat(name: string, ctx: SellerChat['ctx']): string {
    const cur = this.chats().find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (cur && (!ctx || (cur.ctx?.type === ctx.type && cur.ctx.id === ctx.id))) return cur.id;
    const id = cur?.id ?? 'c' + Date.now();
    this.patch((s) => {
      const c = s.chats.find((x) => x.id === id);
      if (c) c.ctx = ctx;
      else s.chats.unshift({ id, name, avatar: this.person(name)?.avatar, unread: 0, ctx, messages: [] });
    });
    return id;
  }

  markRead(id: string): void {
    if (!this.chats().find((c) => c.id === id)?.unread) return;
    this.patch((s) => {
      const c = s.chats.find((x) => x.id === id);
      if (c) c.unread = 0;
    });
  }

  /** Gửi tin (bản mẫu: chỉ lưu trong trình duyệt, không tự đổi trạng thái đơn / việc) */
  sendMessage(id: string, text: string): void {
    this.patch((s) => {
      const c = s.chats.find((x) => x.id === id);
      if (!c) return;
      c.messages.push({ from: 'me', text, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) });
      s.chats = [c, ...s.chats.filter((x) => x.id !== id)];
    });
  }

  // ---------------- lịch ----------------

  /** Thứ trong tuần (0 = Thứ Hai … 6 = Chủ nhật) của ngày cách hôm nay d ngày */
  weekday(d: number): number {
    return (dateOf(d).getDay() + 6) % 7;
  }

  /** Giờ nhận đơn của ngày d (null = nghỉ) */
  openOf(d: number): DayHours | null {
    const h = this.hours()[this.weekday(d)];
    const off = (this.state()?.offs ?? []).some((o) => o.day === d);
    return h && h.on && !off ? h : null;
  }

  /** Ghi chú ngày nghỉ của ngày d ('' nếu nghỉ không ghi chú), null nếu không nghỉ */
  offNote(d: number): string | null {
    const o = (this.state()?.offs ?? []).find((x) => x.day === d);
    return o ? o.note : null;
  }

  calItems(d: number): CalItem[] {
    const out: CalItem[] = [];
    for (const o of this.orders()) {
      if (o.day !== d || ['waiting', 'declined', 'cancelled'].includes(o.state)) continue;
      out.push({
        key: o.id, kind: o.kind, time: o.time, duration: o.duration ?? 30, image: o.image, avatar: o.image ? undefined : o.buyer.avatar, who: o.buyer.name,
        address: o.fulfil === 'pickup' ? o.address : `${o.fulfil === 'home' ? 'Tại nhà khách ' : 'Giao tới '}${o.address.split(',')[0]}`,
        phone: o.buyer.phone, item: `${o.code} · ${o.title}`, link: `/seller/orders/${o.id}`, done: o.state === 'done',
      });
    }
    for (const j of this.jobs())
      for (const o of j.active) {
        if ((o.day ?? j.day) !== d) continue;
        out.push({
          key: o.id, kind: 'job', time: j.time, duration: j.duration, avatar: o.worker.avatar, who: o.worker.name, address: `Nhận việc tại ${j.exact.split(' (')[0]}`,
          phone: o.worker.phone, item: `Việc · ${j.title}`, link: `/seller/jobs/${j.id}`, done: o.state === 'done',
        });
      }
    return out.sort((a, b) => toMin(a.time) - toMin(b.time));
  }

  statsFor(range: StatsRange) {
    return this.stats()?.[range];
  }

  /** Trạng thái hiện trên thẻ bài (Tình trạng bán / Bài đăng): [màu, chữ] + có khóa chỉnh không */
  /**
   * Trạng thái trên thẻ bài (Tình trạng bán / Bài đăng / Gian hàng) — chỉ 3 loại:
   * Đang hoạt động (khách đặt / gửi đề nghị được) · Sắp hết (đồ ăn & uống còn ≤ 3 phần) · Tạm ngưng (đã tắt, hết, việc đã đóng).
   * `locked`: không cho chỉnh số lượng / bật tắt (việc đã chọn được người).
   */
  postState(p: SellerPost): { cls: 'go' | 'wait' | 'off'; text: 'Đang hoạt động' | 'Sắp hết' | 'Tạm ngưng'; locked: boolean } {
    const ACTIVE = { cls: 'go', text: 'Đang hoạt động' } as const;
    const LOW = { cls: 'wait', text: 'Sắp hết' } as const;
    const OFF = { cls: 'off', text: 'Tạm ngưng' } as const;
    if (p.kind === 'job') {
      const j = this.jobs().find((x) => x.id === p.jobId);
      if (j?.active.length) return { ...ACTIVE, locked: true };
      return { ...(!p.on || j?.closed ? OFF : ACTIVE), locked: false };
    }
    if (!p.on || !p.stock) return { ...OFF, locked: false };
    if (p.kind === 'food' && p.stock <= 3 && p.max > 3) return { ...LOW, locked: false };
    return { ...ACTIVE, locked: false };
  }

  /** Người (tên + ảnh) từ một đơn hoặc đề nghị — dùng cho Messenger */
  person(name: string): SellerPerson | undefined {
    return (
      this.orders().find((o) => o.buyer.name === name)?.buyer ??
      this.jobs().flatMap((j) => j.offers.map((o) => o.worker)).find((w) => w.name === name)
    );
  }
}

/** "11:00" + 60 phút → "12:00" */
function hmAdd(t: string, min: number): string {
  const m = toMin(t) + min;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
