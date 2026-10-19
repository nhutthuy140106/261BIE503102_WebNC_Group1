import { Offer } from '../models/offer';
import { Order, PlacedStatus } from '../models/order';

/** Hành động của người bán trên đơn khách đặt. "Từ chối" dùng trạng thái `cancelled` (chờ chốt Q6). */
export type SellerOrderAction = 'confirm' | 'prepare' | 'deliver' | 'complete' | 'decline' | 'approveCancel';

const ORDER_STEPS: Record<Exclude<SellerOrderAction, 'approveCancel'>, { from: PlacedStatus[]; to: PlacedStatus }> = {
  confirm: { from: ['pending'], to: 'confirmed' },
  prepare: { from: ['confirmed'], to: 'preparing' },
  deliver: { from: ['preparing'], to: 'delivering' },
  complete: { from: ['delivering'], to: 'done' },
  decline: { from: ['pending'], to: 'cancelled' },
};

export const SELLER_ORDER_LABEL: Record<SellerOrderAction, string> = {
  confirm: 'Xác nhận đơn',
  prepare: 'Bắt đầu chuẩn bị',
  deliver: 'Giao / sẵn sàng',
  complete: 'Hoàn thành',
  decline: 'Từ chối',
  approveCancel: 'Đồng ý hủy đơn',
};

export function sellerOrderActions(o: Pick<Order, 'status' | 'cancelRequested'>): SellerOrderAction[] {
  const s = o.status as PlacedStatus;
  if (s === 'done' || s === 'cancelled') return [];
  const out = (Object.keys(ORDER_STEPS) as (keyof typeof ORDER_STEPS)[]).filter((a) => ORDER_STEPS[a].from.includes(s));
  return o.cancelRequested ? ['approveCancel', ...out.filter((a) => a !== 'decline')] : out;
}

export function applySellerOrder(o: Order, action: SellerOrderAction, now = new Date()): Order {
  if (!sellerOrderActions(o).includes(action)) {
    throw new Error(`Không thể "${action}" khi đơn đang ở "${o.status}"`);
  }
  const to = action === 'approveCancel' ? 'cancelled' : ORDER_STEPS[action].to;
  return { ...o, status: to, cancelRequested: false, history: [...(o.history ?? []), { state: to, at: now.toISOString() }] };
}

/** Hành động của người đăng việc trên đề nghị của người khác. */
export type PosterAction = 'choose' | 'reject' | 'confirmDone';

export const POSTER_LABEL: Record<PosterAction, string> = {
  choose: 'Chọn người này',
  reject: 'Từ chối',
  confirmDone: 'Xác nhận hoàn thành',
};

export function posterActions(o: Pick<Offer, 'state'>): PosterAction[] {
  if (o.state === 'offered') return ['choose', 'reject'];
  if (o.state === 'reported') return ['confirmDone'];
  return [];
}

/**
 * Áp hành động lên toàn bộ danh sách đề nghị: chọn một người thì các đề nghị còn chờ của CÙNG việc
 * chuyển "Không được chọn" (mỗi việc một người, F10 — việc nhiều người chờ Q4).
 */
export function applyPoster(offers: Offer[], id: string, action: PosterAction, now = new Date()): Offer[] {
  const target = offers.find((o) => o._id === id);
  if (!target || !posterActions(target).includes(action)) {
    throw new Error(`Không thể "${action}" khi đề nghị đang ở "${target?.state}"`);
  }
  const at = now.toISOString();
  const move = (o: Offer, state: Offer['state']): Offer => ({ ...o, state, history: [...o.history, { state, at }] });
  return offers.map((o) => {
    if (o._id === id) return move(o, action === 'choose' ? 'chosen' : action === 'reject' ? 'rejected' : 'done');
    if (action === 'choose' && o.jobId === target.jobId && o.state === 'offered') return move(o, 'rejected');
    return o;
  });
}
