import { CreateOrderBody, Order, PlacedStatus } from '../models/order';
import { Post } from '../models/post';
import { SellerOrder, SellerOrderState, SellerPerson, SellerPost } from '../models/seller';

/**
 * Nối hai kho đơn ở bản dữ liệu mẫu: một đơn có một bản phía Mua (`Order`) và một bản phía Bán (`SellerOrder`),
 * nhận ra nhau qua `SellerOrder.buyerOrderId`. Các hàm ở đây chỉ đổi dữ liệu, việc lưu nằm ở SellerSpaceService.
 */

const hm = (d: Date): string => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dayDiff = (d: Date, now: Date): number =>
  Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 864e5);

/** Khách chưa có ảnh đại diện: hình tròn với chữ cái đầu tên, như avatar phía Mua */
export const initialAvatar = (name: string): string =>
  'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#1F2A44"/><text x="20" y="26" font-family="sans-serif" font-size="17" font-weight="700" fill="#fff" text-anchor="middle">${(name.trim()[0] ?? '?').toUpperCase().replace(/[<&>]/g, '?')}</text></svg>`);

/** Đơn có bước duyệt giá: báo giá sau là sửa chữa, mẫu giặt sấy là cân thực tế */
export function flowOf(sp: SellerPost): SellerOrder['flow'] {
  const spec = (sp.form as { spec?: { priceType?: string; preset?: string } } | undefined)?.spec;
  if (spec?.preset === 'Giặt sấy') return 'laundry';
  return spec?.priceType === 'quote' ? 'repair' : undefined;
}

export const priceCheckOf = (flow: SellerOrder['flow']): Order['priceCheck'] => (flow === 'repair' ? 'quote' : flow === 'laundry' ? 'estimate' : undefined);

/** Tổng số phần của đơn, dùng để trừ số lượng trên bài */
export const orderQty = (body: CreateOrderBody): number =>
  body.detail?.items?.length ? body.detail.items.reduce((n, i) => n + i.qty, 0) : body.quantity;

/** Bản phía Bán của đơn khách vừa đặt. Tổng tiền luôn khớp đơn phía Mua: phần chênh với giá món (tùy chọn, giảm giá) thành một dòng riêng */
export function toSellerOrder(order: Order, post: Post, body: CreateOrderBody, sp: SellerPost, buyer: SellerPerson, now = new Date()): SellerOrder {
  const dishes = body.detail?.items?.length ? body.detail.items : [{ name: post.title, qty: body.quantity }];
  const dishNames = new Set(dishes.map((d) => d.name));
  const picked = (body.selections ?? []).filter((s) => s.choices.length && !s.choices.every((c) => dishNames.has(c)));
  // tùy chọn riêng của món (size) có nhóm dạng "Trà đào – Size": ghi và tính tiền vào đúng dòng món đó
  const ownOf = (name: string) => picked.filter((s) => s.group.startsWith(name + ' – ')).map((s) => ({ group: s.group.slice(name.length + 3), choices: s.choices }));
  const option = picked
    .filter((s) => !dishes.some((d) => s.group.startsWith(d.name + ' – ')))
    .map((s) => `${s.group}: ${s.choices.join(', ')}`)
    .join(' · ');
  const dishLine = (d: { name: string; qty: number }, i: number) => {
    const item = post.items?.find((x) => x.name === d.name);
    const own = ownOf(d.name);
    const add = own.reduce((n, s) => n + s.choices.reduce((m, c) => m + (item?.optionGroups?.find((g) => g.name === s.group)?.choices.find((x) => x.label === c)?.price ?? 0), 0), 0);
    const notes = [...own.map((s) => `${s.group}: ${s.choices.join(', ')}`), ...(i === 0 && option ? [option] : [])];
    return { name: d.name, qty: d.qty, option: notes.join(' · '), price: (item?.price ?? post.price) + add };
  };
  const ship = body.detail?.fee ?? 0;
  // báo giá sau: lúc đặt khách chỉ trả phí kiểm tra, giá sửa báo sau
  const cups = body.detail?.cups;
  const items = cups?.length
    // đồ uống: mỗi dòng đã có đủ tùy chỉnh và giá; tùy chọn chung của đơn (lấy ống hút…) ghi vào dòng đầu
    ? cups.map((c, i) => ({ name: c.name, qty: c.qty, option: [c.option, i === 0 ? option : ''].filter(Boolean).join(' · '), price: c.price }))
    : post.priceType === 'quote'
    ? [{ name: 'Phí kiểm tra', qty: 1, option, price: order.total - ship }]
    : dishes.map(dishLine);
  const rest = order.total - ship - items.reduce((n, i) => n + i.qty * i.price, 0);
  if (rest) items.push({ name: rest > 0 ? 'Tùy chọn cộng giá' : 'Giảm giá', qty: 1, option: '', price: rest });
  const at = body.scheduledAt ? new Date(body.scheduledAt) : now;
  const flow = flowOf(sp);
  return {
    id: order._id,
    buyerOrderId: order._id,
    sellerPostId: sp.id,
    stockQty: orderQty(body),
    code: order.code,
    kind: post.kind as SellerOrder['kind'],
    image: post.images?.[0],
    icon: post.images?.[0] ? undefined : sp.icon,
    title: post.title,
    items,
    buyer,
    fulfil: body.fulfillment === 'pickup' ? 'pickup' : post.kind === 'service' ? 'home' : 'delivery',
    address: body.detail?.address ?? '',
    day: dayDiff(at, now),
    time: hm(at),
    ship,
    pay: body.payment,
    note: body.note ?? '',
    state: 'waiting',
    cancelRequest: null,
    surcharge: null,
    answers: (body.answers ?? []).map((a) => [a.question, a.value] as [string, string]),
    flow,
    quote: null,
    history: [['waiting', hm(now)]],
  };
}

/** Trạng thái phía Mua đổi sang phía Bán. "Đã lấy đồ" phía Mua vẫn là Đã xác nhận nên không ghi đè */
export function sellerStateOf(status: PlacedStatus, cur: SellerOrderState): SellerOrderState {
  if (status === 'pending') return 'waiting';
  if (status === 'confirmed' && cur === 'picked') return 'picked';
  return status;
}

/** Áp thay đổi người mua vừa làm vào bản phía Bán (hủy, xin hủy, duyệt giá, phụ thu…). Trả về true nếu đơn đổi bước */
export function applyBuyerChange(t: SellerOrder, o: Order, now = new Date()): boolean {
  const state = sellerStateOf(o.status as PlacedStatus, t.state);
  const moved = state !== t.state;
  if (moved) {
    t.state = state;
    t.history.push([state, hm(now)]);
  }
  t.cancelRequest = o.cancelRequested ? o.cancelWhy || 'Khách xin hủy đơn' : null;
  if (o.surcharge) t.surcharge = o.surcharge.state === 'declined' ? null : { amount: o.surcharge.amount, reason: o.surcharge.reason, ok: o.surcharge.state === 'approved' };
  if (o.priceDone && t.quote) t.quote.ok = true;
  return moved;
}

/** Thao tác của người bán đổi thành thay đổi trên đơn phía Mua + dòng lịch sử. `name`: tên người bán khách nhìn thấy */
export function buyerPatchOf(act: string, t: SellerOrder, cur: Order, name: string, data: { reason?: string; amount?: number } = {}): { patch: Partial<Order>; line: string } | null {
  const from = cur.status as string;
  switch (act) {
    case 'confirm': return { patch: { status: 'confirmed' }, line: `${name} xác nhận đơn` };
    case 'decline': return { patch: { status: 'declined', cancelBy: 'seller', cancelFrom: from, cancelWhy: t.declineReason }, line: `${name} từ chối đơn` };
    case 'prepare': return { patch: { status: 'preparing' }, line: `${name} bắt đầu thực hiện` };
    case 'deliver': return { patch: { status: 'delivering' }, line: `${name} đang giao đơn` };
    case 'ready': return { patch: { status: 'ready' }, line: `${name} báo đơn sẵn sàng để lấy` };
    case 'complete':
    case 'returned': return { patch: { status: 'done', doneAt: Date.now() }, line: `${name} báo đơn đã hoàn thành` };
    case 'approveCancel': return { patch: { status: 'cancelled', cancelBy: 'buyer', cancelFrom: from, cancelRequested: false }, line: `${name} đồng ý hủy đơn` };
    case 'keepOrder': return { patch: { cancelRequested: false, cancelDenied: 'người bán vẫn giữ đơn, bạn nhắn để trao đổi thêm nhé.' }, line: `${name} chưa đồng ý hủy` };
    case 'surcharge': return { patch: { surcharge: { amount: data.amount ?? 0, reason: data.reason ?? '', state: 'pending' } }, line: `${name} báo phụ thu` };
    case 'pickUp': return { patch: {}, line: t.flow === 'repair' ? `${name} đã kiểm tra` : `${name} đã lấy đồ` };
    case 'quote': {
      if (!t.quote) return null;
      const lines = t.quote.lines.map((l) => [l.name, l.qty * l.price] as [string, number]);
      return {
        patch: { status: 'pricing', priceCheck: cur.priceCheck ?? priceCheckOf(t.flow), newPrice: { total: t.quote.total + (t.ship || 0), reason: t.flow === 'repair' ? 'Giá sau khi kiểm tra' : 'Giá sau khi cân thực tế', lines } },
        line: `${name} báo giá cuối`,
      };
    }
    default: return null;
  }
}
