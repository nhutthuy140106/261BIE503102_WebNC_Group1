/**
 * Tên nút hành động của đơn — MỘT bảng duy nhất, dùng chung cho danh sách đơn và chi tiết đơn
 * (và phía Bán khi làm). Thêm hành động mới thì thêm vào đây, không viết chữ riêng ở từng màn hình.
 * Số tiền, tên người… nằm ở dòng mô tả bên cạnh, không đưa vào tên nút.
 */
export const ORDER_ACTION = {
  chat: 'Nhắn tin',
  save: 'Lưu',
  submitRate: 'Gửi đánh giá',
  submitIssue: 'Gửi yêu cầu',
  approvePrice: 'Duyệt giá',
  rejectPrice: 'Từ chối giá',
  approveResched: 'Duyệt đổi giờ',
  pickResched: 'Chọn giờ khác',
  keepTime: 'Giữ giờ cũ',
  resched: 'Đổi lịch',
  cancel: 'Hủy đơn',
  cancelReq: 'Yêu cầu hủy',
  cancelJob: 'Xin hủy việc',
  received: 'Đã nhận',
  confirmDone: 'Xác nhận',
  rate: 'Đánh giá',
  start: 'Bắt đầu làm',
  finish: 'Báo hoàn thành',
  confirmPaid: 'Đã nhận tiền',
  unpaid: 'Chưa nhận được tiền',
  issueResolved: 'Xác nhận đã xử lý',
  issueDrop: 'Đóng yêu cầu',
  viewIssue: 'Xem phản hồi',
  reportIssue: 'Báo vấn đề',
  returnGoods: 'Trả hàng/Hoàn tiền',
  support: 'Nhờ AntGo hỗ trợ',
  editOffer: 'Sửa giới thiệu',
  withdraw: 'Rút đề nghị',
  findJob: 'Tìm việc khác',
  explore: 'Khám phá quanh khu',
  viewPost: 'Xem bài',
  reorder: 'Đặt lại',
} as const;

export type OrderActionKey = keyof typeof ORDER_ACTION;
