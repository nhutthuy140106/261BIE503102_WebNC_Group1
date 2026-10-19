/** Đề nghị nhận việc — máy trạng thái ở docs/decisions.md mục 2 */
export type OfferState =
  | 'offered' | 'chosen' | 'working' | 'reported' | 'done'
  | 'rejected' | 'withdrawn' | 'cancelled';

/** Hành động của người nhận việc (khớp POST /api/offers/:id/<action>) */
export type OfferAction = 'withdraw' | 'start' | 'reportDone' | 'confirmPaid' | 'cancelRequest';

export interface StateEntry {
  state: OfferState;
  at: string;
}

export interface Offer {
  _id: string;
  code: string;
  jobId: string;
  jobTitle: string;
  posterName: string;
  posterAvatar?: string;
  posterId?: string;
  /** Tên người đề nghị — chỉ dùng ở phía người đăng việc */
  workerName?: string;
  workerAvatar?: string;
  pay: number;
  block: string;
  intro: string;
  /** Khung giờ người nhận chọn */
  slots: string[];
  state: OfferState;
  history: StateEntry[];
  /** Chỉ có khi state ∈ chosen/working/reported/done */
  exactAddress?: string;
  reportNote?: string;
  cancelReason?: string;
}

export interface CreateOfferBody {
  intro: string;
  slots: string[];
}

export const OFFER_STATE_LABEL: Record<OfferState, string> = {
  offered: 'Đã gửi đề nghị',
  chosen: 'Được chọn',
  working: 'Đang làm',
  reported: 'Đã báo xong',
  done: 'Hoàn thành',
  rejected: 'Không được chọn',
  withdrawn: 'Đã rút đề nghị',
  cancelled: 'Đã hủy',
};

export const OFFER_STEPS: OfferState[] = ['offered', 'chosen', 'working', 'reported', 'done'];

export const OFFER_ACTION_LABEL: Record<OfferAction, string> = {
  withdraw: 'Rút đề nghị',
  start: 'Bắt đầu làm',
  reportDone: 'Báo hoàn thành',
  confirmPaid: 'Đã nhận tiền công',
  cancelRequest: 'Xin hủy',
};
