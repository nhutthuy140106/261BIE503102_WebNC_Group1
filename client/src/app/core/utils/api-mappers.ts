import { Offer, OfferState, StateEntry } from '../models/offer';
import { Order, PlacedStatus } from '../models/order';
import { Post, PostKind } from '../models/post';
import { AppNotification, Conversation, Message, Question } from '../models/social';
import { User } from '../models/user';

/**
 * Chuyển dữ liệu BE (docs/api-buyer-job.md, `Post`/`Job`/`Order`/`Offer`…) sang model của FE.
 * Chỉ dùng khi service gọi API thật; mock đã ở dạng FE. Hàm thuần, không đụng HTTP.
 * Lệch tên field đã ghi ở decisions.md (F1).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/** Khu vực BE là "B" hoặc "Shop 12": A–D thành "Block X", còn lại giữ nguyên. */
export function areaLabel(area: string | undefined): string {
  if (!area) return '';
  return /^[A-D]$/i.test(area) ? `Block ${area.toUpperCase()}` : area;
}

export function userFromApi(u: Raw): User {
  return {
    _id: u._id,
    username: u.phone ?? '',
    fullName: u.name ?? '',
    block: areaLabel(u.area),
    avatar: u.avatar || undefined,
    xu: typeof u.xu === 'number' ? u.xu : undefined,
    role: u.role === 'admin' ? 'admin' : 'user',
  };
}

export function postFromApi(p: Raw): Post {
  return {
    _id: p._id,
    kind: p.type as PostKind,
    title: p.title,
    description: p.description ?? '',
    images: p.images ?? [],
    sellerId: p.seller?._id ?? '',
    sellerName: p.seller?.name ?? '',
    sellerAvatar: p.seller?.avatar || undefined,
    block: areaLabel(p.seller?.area ?? p.area),
    price: p.price ?? 0,
    priceUnit: p.unit || undefined,
    acceptsXu: !!p.acceptsXu,
    closed: p.status !== undefined && p.status !== 'open',
    createdAt: p.createdAt,
    optionGroups: p.optionGroups ?? [],
    questions: p.questions ?? [],
    fulfillmentModes: p.fulfillmentModes ?? [],
    deliveryFee: p.deliveryFee ?? 0,
    needSchedule: !!p.needSchedule,
    category: p.category || undefined,
    promo: p.promo && p.promo.active !== false ? { kind: p.promo.kind, value: p.promo.value, from: p.promo.from, to: p.promo.to, days: p.promo.days ?? [], active: true } : undefined,
    combo: p.combo?.items?.length ? { items: p.combo.items.map((i: Raw) => ({ postId: String(i.postId), qty: i.qty })), comboPrice: p.combo.comboPrice, listPrice: p.combo.listPrice } : undefined,
    comboDetail: p.comboDetail
      ? {
          items: p.comboDetail.items.map((i: Raw) => ({ postId: String(i.postId), qty: i.qty, title: i.title, unitPrice: i.unitPrice, unit: i.unit || undefined, image: i.image || undefined, available: i.available !== false })),
          listPrice: p.comboDetail.listPrice,
          saving: p.comboDetail.saving,
        }
      : undefined,
  };
}

export function jobFromApi(j: Raw): Post {
  return {
    _id: j._id,
    kind: 'job',
    title: j.title,
    description: j.desc ?? '',
    images: [],
    sellerId: j.poster?._id ?? '',
    sellerName: j.poster?.name ?? '',
    sellerAvatar: j.poster?.avatar || undefined,
    block: areaLabel(j.poster?.area ?? j.area),
    price: j.pay ?? 0,
    priceUnit: j.unit || undefined,
    createdAt: j.createdAt,
    job: {
      due: j.workTime ?? '',
      offers: j.offerCount ?? 0,
      status: j.status === 'open' ? 'open' : 'taken',
      windows: j.windows ?? [],
    },
  };
}

const ORDER_STATE: Record<string, PlacedStatus> = {
  waiting: 'pending', confirmed: 'confirmed', preparing: 'preparing', delivering: 'delivering', ready: 'delivering',
  done: 'done', cancelled: 'cancelled', declined: 'cancelled',
};

export function orderFromApi(o: Raw): Order {
  const s = o.snapshot ?? {};
  const mapState = (st: string): string => ORDER_STATE[st] ?? st;
  return {
    _id: o._id,
    code: o.code,
    type: 'placed',
    postId: typeof o.post === 'object' ? o.post?._id : o.post,
    postTitle: s.title ?? '',
    counterpartName: s.sellerName ?? '',
    counterpartAvatar: s.sellerAvatar || undefined,
    counterpartId: typeof o.seller === 'object' ? o.seller?._id : o.seller,
    image: s.image || undefined,
    category: s.type,
    status: mapState(o.state) as PlacedStatus,
    total: o.total ?? 0,
    paymentMethod: o.payment === 'transfer' ? 'transfer' : 'cash',
    note: o.note || undefined,
    createdAt: o.createdAt,
    history: (o.history ?? []).map((h: Raw) => ({ state: mapState(h.state), at: h.at })),
    cancelRequested: o.cancelRequest?.status === 'pending' || undefined,
    surcharge: o.surcharge?.amount
      ? { amount: o.surcharge.amount, reason: o.surcharge.reason ?? '', state: o.surcharge.status === 'approved' ? 'approved' : 'pending' }
      : undefined,
  };
}

function offerHistory(h: Raw[] | undefined): StateEntry[] {
  return (h ?? []).map((x) => ({ state: x.state as OfferState, at: x.at }));
}

export function offerFromApi(f: Raw): Offer {
  const job = typeof f.job === 'object' && f.job ? f.job : {};
  return {
    _id: f._id,
    code: f.code ?? '',
    jobId: typeof f.job === 'object' ? job._id : f.job,
    jobTitle: job.title ?? '',
    posterName: job.poster?.name ?? '',
    posterAvatar: job.poster?.avatar || undefined,
    posterId: job.poster?._id,
    pay: job.pay ?? 0,
    block: areaLabel(job.poster?.area ?? job.area),
    intro: f.intro ?? '',
    slots: f.slots ?? [],
    state: f.state as OfferState,
    history: offerHistory(f.history).length ? offerHistory(f.history) : f.createdAt ? [{ state: f.state, at: f.createdAt }] : [],
    exactAddress: job.exactAddress || undefined,
    reportNote: f.report?.note || undefined,
  };
}

export function questionFromApi(q: Raw): Question {
  return {
    _id: q._id,
    jobId: typeof q.job === 'object' ? q.job?._id : q.job,
    text: q.text,
    authorName: q.author?.name ?? '',
    answer: q.answer?.text ?? null,
    createdAt: q.createdAt,
  };
}

export function conversationFromApi(c: Raw): Conversation {
  return {
    _id: c._id,
    withName: c.with?.name ?? '',
    withAvatar: c.with?.avatar || undefined,
    context: c.context ? { type: c.context.type, id: c.context.id, label: CONTEXT_LABEL[c.context.type] ?? '' } : undefined,
    unread: c.unread ?? 0,
    messages: [],
  };
}

const CONTEXT_LABEL: Record<string, string> = { order: 'Đơn hàng', offer: 'Việc đã nhận', post: 'Bài đăng', job: 'Việc làm' };

export function messageFromApi(m: Raw, myId: string): Message {
  return { _id: m._id, mine: m.sender === myId || m.sender?._id === myId, text: m.text, createdAt: m.createdAt };
}

/** Link thông báo của BE `{type, id}` → đường dẫn FE. */
export function notificationLink(l: Raw): string {
  if (!l?.id) return '/notifications';
  switch (l.type) {
    case 'order':
    case 'offer':
      return `/orders/${l.id}`;
    case 'post':
      return `/posts/${l.id}`;
    case 'job':
      return `/posts/job/${l.id}`;
    case 'conversation':
      return `/messenger/${l.id}`;
    default:
      return '/notifications';
  }
}

export function notificationFromApi(n: Raw): AppNotification {
  return {
    _id: n._id,
    text: n.body ? `${n.title}, ${n.body}` : n.title,
    link: notificationLink(n.link),
    read: !!n.read,
    createdAt: n.createdAt,
  };
}
