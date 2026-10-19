/** Đơn đã đặt (phía Mua) */
export type PlacedStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled';

/** Việc đã nhận (phía làm việc) — thanh 5 bước + 3 nhánh phụ, xem CLAUDE.md mục 2.2e */
export type JobStatus =
  | 'offered' | 'chosen' | 'working' | 'reported' | 'done'
  | 'rejected' | 'withdrawn' | 'cancelled';

export type PaymentMethod = 'cash' | 'transfer';

export interface Order {
  _id: string;
  /** Mã hiển thị, ví dụ AG-O3012 (đơn đặt) hoặc AG-J1998 (việc nhận) */
  code: string;
  type: 'placed' | 'received';
  postId: string;
  postTitle: string;
  counterpartName: string;
  counterpartAvatar?: string;
  /** Id người bán/người đăng — để mở gian hàng /shop/:id */
  counterpartId?: string;
  /** Ảnh món/bài của đơn đã đặt (snapshot lúc đặt) */
  image?: string;
  /** Nhóm của bài — dùng chọn icon khi không có ảnh (việc làm không có ảnh thật) */
  category?: string;
  status: PlacedStatus | JobStatus;
  total: number;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
  /** Mốc thời gian từng bước, hiện dưới thanh tiến trình */
  history?: { state: string; at: string }[];
  /** Có khi đơn đặt đã gửi yêu cầu hủy (chờ người bán xử lý) */
  cancelRequested?: boolean;
  /** Phụ thu do người bán báo (vd. đồ to hơn đã chọn) — người mua phải đồng ý trước khi làm tiếp */
  surcharge?: Surcharge;
}

export interface Surcharge {
  amount: number;
  reason: string;
  state: 'pending' | 'approved' | 'declined';
}

export interface CreateOrderBody {
  postId: string;
  quantity: number;
  selections: { group: string; choices: string[] }[];
  /** Trả lời câu hỏi riêng của bài */
  answers?: { question: string; value: string }[];
  fulfillment: 'delivery' | 'pickup';
  addressId?: string;
  scheduledAt?: string;
  utensils: boolean;
  note?: string;
  /** Mã voucher AntXu (chỉ với bài có nhãn "Dùng được Xu"); server kiểm tra và tính giảm giá */
  voucherCode?: string;
  payment: PaymentMethod;
}

export const PLACED_STATUS_LABEL: Record<PlacedStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  delivering: 'Đang giao',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
