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

/** Mongo luôn trả mảng rỗng cho mảng chưa điền; FE hiểu "không có dữ liệu" là undefined. */
const arr = <T>(a: T[] | undefined | null): T[] | undefined => (Array.isArray(a) && a.length ? a : undefined);
const obj = <T>(o: T | undefined | null): T | undefined => (o && typeof o === 'object' ? o : undefined);

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
    spinPromo: p.spinPromo ? true : undefined, // server chưa có trường này → luôn undefined cho tới khi phía Bán nối
    closed: p.status !== undefined && p.status !== 'open',
    createdAt: p.createdAt,
    optionGroups: p.optionGroups ?? [],
    questions: p.questions ?? [],
    fulfillmentModes: p.fulfillmentModes ?? [],
    deliveryFee: p.deliveryFee ?? 0,
    needSchedule: !!p.needSchedule,
    category: p.category || undefined,
    orderWindow: p.orderWindow?.from && p.orderWindow?.to ? { from: p.orderWindow.from, to: p.orderWindow.to, days: p.orderWindow.days ?? [] } : undefined,
    promo: p.promo && p.promo.active !== false ? { kind: p.promo.kind, value: p.promo.value, from: p.promo.from, to: p.promo.to, days: p.promo.days ?? [], active: true } : undefined,
    combo: p.combo?.items?.length ? { items: p.combo.items.map((i: Raw) => ({ postId: String(i.postId), qty: i.qty })), comboPrice: p.combo.comboPrice, listPrice: p.combo.listPrice } : undefined,
    // ---- các khối theo docs/post-contract.md ----
    status: p.status,
    stock: p.stock?.mode ? { mode: p.stock.mode, left: p.stock.left } : undefined,
    areas: arr(p.areas),
    payMethods: arr(p.payMethods),
    // `bank` không có trong API công khai (server để select:false) — chỉ về cùng đơn của người đã đặt
    bank: p.bank?.no ? { bankName: p.bank.bankName ?? '', no: p.bank.no, holder: p.bank.holder ?? '', qr: p.bank.qr || undefined } : undefined,
    priceType: p.priceType || undefined,
    estimate: p.estimate || undefined,
    inspectFee: p.inspectFee ?? undefined,
    items: arr(p.items)?.map((i: Raw) => ({ id: i.id ?? i.name, name: i.name, price: i.price ?? 0, unit: i.unit || undefined, dailyQty: i.dailyQty ?? undefined, optionGroups: arr(i.optionGroups) })),
    serviceMenu: arr(p.serviceMenu)?.map((m: Raw) => ({ name: m.name, optionGroups: m.optionGroups ?? [], questions: m.questions ?? [] })),
    bookOnce: p.bookOnce || undefined,
    noSchedule: p.noSchedule || undefined,
    repeat: p.repeat || undefined,
    pickupAtBuyer: p.pickupAtBuyer || undefined,
    noteEnabled: p.noteEnabled ?? undefined,
    quickOptions: arr(p.quickOptions),
    freeShipFrom: p.freeShipFrom ?? undefined,
    timeLabel: p.timeLabel || undefined,
    timeMode: p.timeMode || undefined,
    dates: arr(p.dates),
    duration: p.duration?.min != null ? { min: p.duration.min, max: p.duration.max ?? p.duration.min } : undefined,
    prepMinutes: p.prepMinutes ?? undefined,
    handover: p.handover?.from ? { from: p.handover.from, to: p.handover.to ?? '' } : undefined,
    place: p.place?.mode ? { mode: p.place.mode, where: p.place.where || undefined } : undefined,
    serviceInfo: obj(p.serviceInfo),
    condition: p.condition?.level ? { level: p.condition.level, note: p.condition.note || undefined } : undefined,
    highlights: arr(p.highlights),
    info: arr(p.info),
    promoted: p.promoted || undefined,
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : undefined,
    sold: typeof p.sold === 'number' ? p.sold : undefined,
    views: typeof p.views === 'number' ? p.views : undefined,
    saves: typeof p.saves === 'number' ? p.saves : undefined,
    formData: p.formData && p.formData.form ? { type: String(p.formData.type), form: p.formData.form } : undefined,
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
      head: j.headcount ?? undefined,
      building: j.exactAddress || undefined,
    },
  };
}

const ORDER_STATE: Record<string, PlacedStatus> = {
  waiting: 'pending', confirmed: 'confirmed', picked: 'confirmed', pricing: 'pricing', preparing: 'preparing', delivering: 'delivering', ready: 'delivering',
  done: 'done', cancelled: 'cancelled', declined: 'cancelled',
};

const money = (n: number): string => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/** Đơn có bước báo giá: giá cuối chờ duyệt / đã duyệt / bị từ chối, theo `quote` của server */
function quoteFields(o: Raw): Partial<Order> {
  if (!o.flow) return {};
  const seller: string = o.snapshot?.sellerName ?? 'Người bán';
  const ship: number = o.breakdown?.deliveryFee ?? 0;
  const q = o.quote;
  const out: Partial<Order> = { priceCheck: o.flow === 'repair' ? 'quote' : 'estimate' };
  if (o.oldTotal != null) out.oldTotal = o.oldTotal;
  if (q?.status === 'pending') {
    out.newPrice = { total: (q.total ?? 0) + ship, reason: o.flow === 'repair' ? 'Giá sau khi kiểm tra' : 'Giá sau khi cân thực tế', lines: (q.lines ?? []).map((l: Raw) => [l.name, Math.round(l.qty * l.price)] as [string, number]) };
  } else if (q?.status === 'approved') {
    out.priceDone = true;
  } else if (q?.status === 'rejected') {
    const after = o.flow === 'repair' ? `Bạn chỉ trả phí kiểm tra ${money(o.total ?? 0)}, ${seller} trả lại máy. Đơn kết thúc.` : `Đơn hủy, ${seller} trả lại đồ cho bạn và không tính tiền giặt.`;
    out.priceRejected = after + (q.rejectReason ? ` Lý do bạn gửi: ${q.rejectReason}` : '');
  }
  return out;
}

export function orderFromApi(o: Raw): Order {
  const s = o.snapshot ?? {};
  const mapState = (st: string): string => ORDER_STATE[st] ?? st;
  return {
    ...quoteFields(o),
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
    kind: s.type === 'goods' || s.type === 'service' ? s.type : 'food',
    sellerLinked: true, // đơn thật: người bán xử lý ở khu Bán, không dùng nút mô phỏng
    status: mapState(o.state) as PlacedStatus,
    total: o.total ?? 0,
    paymentMethod: o.payment === 'transfer' ? 'transfer' : 'cash',
    bank: s.bank?.no ? { bankName: s.bank.bankName ?? '', no: s.bank.no, holder: s.bank.holder ?? '', qr: s.bank.qr || undefined } : undefined,
    note: o.note || undefined,
    createdAt: o.createdAt,
    // "đã lấy đồ / đã kiểm tra" (picked) phía Mua vẫn là Đã xác nhận nên không ghi thêm một mốc trùng
    history: (o.history ?? []).filter((h: Raw) => h.state !== 'picked').map((h: Raw) => ({ state: mapState(h.state), at: h.at })),
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
  return { _id: m._id, mine: m.sender === myId || m.sender?._id === myId, text: m.text ?? '', ...(m.media ? { media: { kind: m.media.kind, url: m.media.url, name: m.media.name, size: m.media.size, sec: m.media.sec } } : {}), createdAt: m.createdAt };
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
