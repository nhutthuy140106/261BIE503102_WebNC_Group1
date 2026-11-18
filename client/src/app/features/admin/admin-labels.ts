/** Nhãn tiếng Việt và màu viên trạng thái dùng chung ở khu Quản trị. */
export const ORDER_STATE: Record<string, string> = {
  waiting: 'Chờ xác nhận', confirmed: 'Đã xác nhận', picked: 'Đã lấy đồ', pricing: 'Chờ duyệt giá', preparing: 'Đang chuẩn bị',
  delivering: 'Đang giao', ready: 'Sẵn sàng', done: 'Hoàn thành', cancelled: 'Đã hủy', declined: 'Bị từ chối',
};
export const orderTone = (s: string): string => (s === 'done' ? 'ok' : s === 'cancelled' || s === 'declined' ? 'bad' : s === 'waiting' || s === 'pricing' ? 'warn' : 'info');

export const ISSUE_STATE: Record<string, string> = {
  open: 'Chờ người bán trả lời', redo: 'Người bán nhận làm lại', refund: 'Đã hoàn tiền', returnAgreed: 'Đồng ý nhận lại hàng', rejected: 'Người bán từ chối', closed: 'Đã đóng',
};
export const issueTone = (s: string): string => (s === 'open' || s === 'rejected' ? 'warn' : s === 'closed' ? 'mute' : 'ok');

export const PAYMENT: Record<string, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản' };
export const ROLE: Record<string, string> = { enduser: 'Người dùng', user: 'Người dùng', moderator: 'Người kiểm duyệt', admin: 'Quản trị' };
export const TARGET: Record<string, string> = { report: 'Báo cáo', order: 'Đơn hàng', offer: 'Đề nghị nhận việc', post: 'Bài đăng', job: 'Việc làm', user: 'Người dùng', ticket: 'Phiếu hỗ trợ', voucher: 'Voucher', announcement: 'Thông báo', settings: 'Cài đặt', export: 'Xuất dữ liệu' };
export const TOPIC: Record<string, string> = { order: 'Đơn hàng', account: 'Tài khoản', seller: 'Bán hàng', payment: 'Thanh toán', other: 'Khác' };

/** Tên hành động trong nhật ký (khóa là `action` do server ghi) */
export const ACTION: Record<string, string> = {
  'user.lock': 'Khóa tài khoản', 'user.unlock': 'Mở khóa tài khoản', 'user.role': 'Đổi vai trò',
  'post.hide': 'Ẩn bài', 'post.unhide': 'Hiện lại bài',
  'report.reviewing': 'Bắt đầu xem xét báo cáo', 'report.resolved': 'Xử lý xong báo cáo', 'report.rejected': 'Từ chối báo cáo',
  'order.view_chat': 'Xem tin nhắn của đơn', 'order.cancel': 'Hủy đơn', 'order.issue_refund': 'Phân xử: hoàn tiền', 'order.issue_redo': 'Phân xử: làm lại', 'order.issue_reject': 'Phân xử: không hoàn tiền',
  'xu.grant': 'Cộng Xu', 'xu.deduct': 'Trừ Xu',
  'voucher.create': 'Tạo voucher', 'voucher.update': 'Sửa voucher', 'voucher.enable': 'Bật voucher', 'voucher.disable': 'Tắt voucher',
  'ticket.reply': 'Trả lời phiếu hỗ trợ', 'ticket.close': 'Đóng phiếu hỗ trợ',
  'announcement.send': 'Gửi thông báo hệ thống', 'settings.update': 'Sửa cài đặt', 'export.csv': 'Xuất dữ liệu CSV',
};
export const actionLabel = (a: string): string => ACTION[a] ?? a;
