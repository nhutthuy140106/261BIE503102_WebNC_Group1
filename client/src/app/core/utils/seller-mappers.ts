import { Offer } from '../models/offer';
import { Question } from '../models/social';
import { Post } from '../models/post';
import { Fulfil, SellerJob, SellerOrder, SellerOrderItem, SellerOrderState, SellerPost, SellerSpace } from '../models/seller';
import type { PostBody } from '../services/seller';
import { areaLabel, offerFromApi, questionFromApi } from './api-mappers';
import { initialAvatar } from './order-link';

/**
 * Phía Bán ↔ API thật (/api/seller/*). Hàm thuần, không đụng HTTP. Dùng khi `useMock('seller')` = false.
 * Chiều đi: form Bán (PostBody) → body server. Chiều về: đơn / đề nghị / hỏi đáp của server → dạng hiển thị của khu Bán.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/** "Block B" → "B" (server lưu mã khu: A–D hoặc tên shop); chuỗi khác giữ nguyên */
export const areaCode = (block: string): string => block.replace(/^Block\s+/i, '').trim();

/** Form đăng bài → body của POST/PUT /seller/posts. `kind` thành `type`, `priceUnit` thành `unit`, `block` thành `area` */
export function postBodyToApi(b: PostBody): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { kind, priceUnit, block, due, job, template, ...rest } = b;
  return { ...rest, type: kind, unit: priceUnit ?? '', area: areaCode(block) };
}

/** Form đăng việc → body của POST/PUT /seller/jobs */
export function jobBodyToApi(b: PostBody): Record<string, unknown> {
  return {
    title: b.title,
    category: b.category,
    desc: b.description,
    pay: b.price,
    unit: b.priceUnit ?? '',
    workTime: b.job?.due ?? b.due ?? '',
    windows: b.job?.windows ?? [],
    area: areaCode(b.block),
    exactAddress: b.job?.building ?? '',
    headcount: b.job?.head ?? 1,
  };
}

const hm = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const dayDiff = (iso: string, now = new Date()): number => {
  const d = new Date(iso);
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 864e5);
};

const STATE: Record<string, SellerOrderState> = {
  waiting: 'waiting', confirmed: 'confirmed', preparing: 'preparing', delivering: 'delivering', ready: 'ready', done: 'done', declined: 'declined', cancelled: 'cancelled',
};

/** Đơn của server (kèm `buyer` đã populate) → đơn hiển thị ở khu Bán. Tổng tiền luôn khớp đơn: phần chênh so với giá món thành một dòng riêng. */
export function sellerOrderFromApi(o: Raw, now = new Date()): SellerOrder {
  const s = o.snapshot ?? {};
  const kind = (s.type === 'goods' || s.type === 'service' ? s.type : 'food') as SellerOrder['kind'];
  const a = o.address ?? {};
  const buyerName: string = o.buyer?.name ?? a.name ?? 'Khách';
  const fulfil: Fulfil = o.fulfillment === 'delivery' ? (kind === 'service' ? 'home' : 'delivery') : 'pickup';
  const picked: Raw[] = o.selections ?? [];
  const option = picked
    .filter((x) => (x.choices ?? []).length)
    .map((x) => `${x.group}: ${(x.choices as Raw[]).map((c) => c.label).join(', ')}`)
    .join(' · ');
  const ship: number = o.breakdown?.deliveryFee ?? 0;
  const surchargeOk: number = o.surcharge?.status === 'approved' ? o.surcharge.amount ?? 0 : 0;
  const items: SellerOrderItem[] = [{ name: s.title ?? 'Đơn hàng', qty: o.quantity ?? 1, option, price: s.unitPrice ?? 0 }];
  const rest = (o.total ?? 0) - ship - surchargeOk - items.reduce((n, i) => n + i.qty * i.price, 0);
  if (rest) items.push({ name: rest > 0 ? 'Tùy chọn cộng giá' : 'Giảm giá', qty: 1, option: '', price: rest });
  const at: string = o.scheduledAt ?? o.createdAt;
  const history = (o.history ?? []) as Raw[];
  const cancelPending = o.cancelRequest?.status === 'pending';
  const place = [a.unit, areaLabel(a.block)].filter(Boolean).join(', ');
  return {
    id: o._id,
    code: o.code,
    kind,
    image: s.image || undefined,
    title: s.title ?? '',
    items,
    buyer: { name: buyerName, avatar: o.buyer?.avatar || initialAvatar(buyerName), phone: a.phone ?? o.buyer?.phone ?? '' },
    fulfil,
    address: fulfil === 'pickup' ? 'Khách tự đến lấy' : place || 'Chưa có địa chỉ',
    day: dayDiff(at, now),
    time: hm(at),
    ship,
    pay: o.payment === 'transfer' ? 'transfer' : 'cash',
    note: o.note ?? '',
    state: STATE[o.state] ?? 'waiting',
    cancelRequest: cancelPending ? o.cancelRequest.reason || 'Khách xin hủy đơn' : null,
    surcharge: o.surcharge?.amount ? { amount: o.surcharge.amount, reason: o.surcharge.reason ?? '', ok: o.surcharge.status === 'approved' } : null,
    answers: (o.answers ?? []).map((x: Raw) => [x.question, x.value] as [string, string]),
    history: history.map((h) => [STATE[h.state] ?? 'waiting', hm(h.at)] as [SellerOrderState, string]),
    placedAt: o.createdAt,
    cancelAt: cancelPending ? o.cancelRequest.at : undefined,
    stepAt: history.length ? history[history.length - 1].at : o.createdAt,
    buyerOrderId: o._id,
  };
}

/** Đề nghị gửi tới việc của tôi: kèm thông tin người làm (khác `offerFromApi`, nhìn từ phía người nhận việc) */
export function posterOfferFromApi(f: Raw): Offer {
  return {
    ...offerFromApi(f),
    workerId: f.worker?._id,
    workerName: f.worker?.name,
    workerAvatar: f.worker?.avatar || undefined,
    workerPhone: f.worker?.phone,
    workerBlock: areaLabel(f.worker?.area),
    cancelReason: f.cancel?.reason || undefined,
    paid: !!f.paidAt,
  };
}

export function posterQuestionFromApi(q: Raw): Question {
  return { ...questionFromApi(q), authorAvatar: q.author?.avatar || undefined };
}

/** Bài của server → dòng "Bài đăng" ở khu Bán (không có `form` đăng bài: bài đăng từ nơi khác chưa mở lại để sửa nội dung ở đây được) */
function serverPost(p: Post): SellerPost {
  const left = p.stock?.mode === 'limit' ? p.stock.left ?? 0 : p.stock?.mode === 'once' ? 1 : 99;
  return {
    id: p._id, kind: p.kind, title: p.title, image: p.images[0], price: p.price, unit: p.priceUnit, stock: left, max: left, on: !p.closed,
    views: 0, saves: 0, sold: 0, category: p.category ?? (p.kind === 'job' ? 'Việc vặt' : ''), buyerPostId: p._id,
    formType: p.kind === 'food' ? (p.category === 'Đồ uống' ? 'drink' : 'food') : p.kind,
  };
}

/** Việc của server → thẻ việc ở khu Bán (đề nghị và hỏi đáp lấy từ kho chung, không lưu ở đây) */
function serverJob(p: Post, id: string): SellerJob {
  return {
    id, code: 'V-' + p._id.slice(-4).toUpperCase(), postId: p._id, title: p.title, category: p.category ?? 'Việc vặt', pay: p.price, unit: p.priceUnit ?? 'việc',
    when: p.job?.due ?? '', day: 0, time: '09:00', duration: 60, head: p.job?.head ?? 1, area: p.block, exact: p.job?.building ?? '', desc: p.description, reqs: [],
    offers: [], questions: [], closed: !!p.closed,
  };
}

/**
 * Chế độ thật: Giao dịch / Bài đăng / Việc lấy từ server, thay cho dữ liệu mẫu. Phần chỉ có ở máy (form đăng bài, chat, giờ mở cửa…) giữ nguyên.
 * Bài khớp nhau qua `buyerPostId` (= id bài trên server).
 */
export function mergeServerSpace(s: SellerSpace, orders: SellerOrder[], posts: Post[]): SellerSpace {
  const byBid = new Map(s.posts.filter((p) => p.buyerPostId).map((p) => [p.buyerPostId as string, p]));
  const jobById = new Map(s.jobs.map((j) => [j.id, j]));
  const outPosts: SellerPost[] = [];
  const outJobs: SellerJob[] = [];
  for (const p of posts) {
    const old = byBid.get(p._id);
    const fresh = serverPost(p);
    if (p.kind === 'job') {
      const jid = old?.jobId ?? 'j-' + p._id;
      const j = serverJob(p, jid);
      const prev = jobById.get(jid);
      outJobs.push(prev ? { ...prev, title: j.title, pay: j.pay, unit: j.unit, when: j.when || prev.when, desc: j.desc, closed: j.closed, head: j.head, exact: j.exact || prev.exact, offers: [], questions: [] } : j);
      outPosts.push({ ...fresh, ...(old ? { form: old.form, formType: old.formType, views: old.views, saves: old.saves, sold: old.sold, promo: old.promo } : {}), jobId: jid, on: fresh.on });
    } else {
      outPosts.push(old ? { ...fresh, form: old.form, formType: old.formType ?? fresh.formType, views: old.views, saves: old.saves, sold: old.sold, promo: old.promo, icon: old.icon } : fresh);
    }
  }
  // bài chưa lên server (đăng lỗi mạng): giữ lại để người bán thấy
  for (const p of s.posts) if (!p.buyerPostId) outPosts.push(p);
  return { ...s, orders, posts: outPosts, jobs: outJobs };
}
