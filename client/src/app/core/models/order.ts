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
  status: PlacedStatus | JobStatus;
  total: number;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
}
