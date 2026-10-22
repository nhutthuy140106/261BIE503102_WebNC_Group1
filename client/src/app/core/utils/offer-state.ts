import { Offer, OfferAction, OfferState } from '../models/offer';
import { Order } from '../models/order';

/** Bảng chuyển trạng thái hợp lệ cho người nhận việc. */
const TRANSITIONS: Record<OfferAction, { from: OfferState[]; to: OfferState }> = {
  withdraw: { from: ['offered'], to: 'withdrawn' },
  start: { from: ['chosen'], to: 'working' },
  reportDone: { from: ['working'], to: 'reported' },
  confirmPaid: { from: ['reported'], to: 'done' },
  cancelRequest: { from: ['chosen', 'working'], to: 'cancelled' },
};

export function canDo(state: OfferState, action: OfferAction): boolean {
  return TRANSITIONS[action].from.includes(state);
}

export function availableActions(state: OfferState): OfferAction[] {
  return (Object.keys(TRANSITIONS) as OfferAction[]).filter((a) => canDo(state, a));
}

/** Trả bản đề nghị mới sau khi chuyển; ném lỗi nếu chuyển sai (server trả 409). */
export function applyAction(offer: Offer, action: OfferAction, now = new Date()): Offer {
  if (!canDo(offer.state, action)) {
    throw new Error(`Không thể "${action}" khi đề nghị đang ở "${offer.state}"`);
  }
  const to = TRANSITIONS[action].to;
  return { ...offer, state: to, history: [...offer.history, { state: to, at: now.toISOString() }] };
}

/** Địa chỉ chính xác chỉ được hiện từ bước "Được chọn". */
export function canSeeExactAddress(state: OfferState): boolean {
  return ['chosen', 'working', 'reported', 'done'].includes(state);
}

export function offerToOrder(o: Offer): Order {
  return {
    _id: o._id,
    code: o.code,
    type: 'received',
    postId: o.jobId,
    postTitle: o.jobTitle,
    counterpartName: o.posterName,
    counterpartAvatar: o.posterAvatar,
    counterpartId: o.posterId,
    category: 'job',
    status: o.state,
    total: o.pay,
    paymentMethod: 'cash',
    createdAt: o.history[0]?.at ?? new Date().toISOString(),
    history: o.history,
    paid: o.paid,
    rated: o.rated,
  };
}
