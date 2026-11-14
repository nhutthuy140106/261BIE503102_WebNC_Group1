# Khu Quản trị AntGo (admin)

Khu riêng ở `/admin` (khung có thanh bên tối, không dùng header/footer phía Mua). Chỉ chạy với máy chủ thật (`?mock=0`); dữ liệu mẫu không có khu này. Quyền thật do server kiểm tra (401/403), giao diện chỉ ẩn lối vào.

## Vai trò

| Việc | Quản trị viên (`admin`) | Người kiểm duyệt (`moderator`) |
|---|---|---|
| Xem tổng quan, đơn, báo cáo, bài, hỗ trợ, nhật ký, cài đặt | có | có |
| Duyệt xác minh người bán, xử lý báo cáo, ẩn/hiện bài, phân xử báo vấn đề, hủy đơn vi phạm, trả lời hỗ trợ | có | có |
| Khóa / mở khóa tài khoản, đổi vai trò | có | không |
| Tạo / sửa / tắt voucher, cộng / trừ Xu | có | không (chỉ xem voucher) |
| Gửi thông báo hệ thống | có | không |
| Sửa từ khóa cấm, khu vực, danh mục; xuất CSV | có | không |

Admin không tự khóa mình, không đổi vai trò của mình, không khóa admin cuối cùng.

## Tính năng

1. **Tổng quan** (`GET /admin/dashboard?days=7..90`): ô "Cần xử lý hôm nay" (hồ sơ chờ, báo cáo, báo vấn đề, xin hủy, phiếu hỗ trợ), 6 chỉ số, biểu đồ theo ngày (giờ Việt Nam): giao dịch hoàn thành, đơn mới / hoàn thành, người dùng mới; đơn theo trạng thái; người bán cao nhất. Mọi số liệu tính từ dữ liệu thật.
2. **Xác minh người bán** (`/admin/seller-verifications`): xem CCCD + ảnh chân dung (bấm phóng to), duyệt hoặc từ chối kèm lý do. Chưa duyệt thì người bán không đăng bài / việc (403 `NOT_VERIFIED`).
3. **Báo cáo vi phạm**: mở rộng "Xem bối cảnh" (`GET /admin/reports/:id` trả `context`): bài / đơn / người bị báo, chủ bài, số báo cáo cùng đối tượng, liên kết sang đơn và hồ sơ.
4. **Đơn & tranh chấp** (`/admin/orders`): lọc theo trạng thái / mã đơn / đang báo vấn đề. Chi tiết đơn có tiến trình, thanh toán, hai bên, **xem tin nhắn** (mỗi lần xem ghi nhật ký `order.view_chat`), **phân xử** báo vấn đề khi người bán chưa trả lời hoặc đã từ chối (hoàn tiền một phần / toàn phần, làm lại, không hoàn tiền; hoàn hết thì thu lại Xu của đơn; báo cả hai bên), **hủy đơn vi phạm** (trả kho + voucher).
5. **Người dùng**: danh sách + hồ sơ đầy đủ (`/admin/users/:id/profile`): số đơn mua/bán, bài, việc, báo cáo về người này, xác minh, sổ Xu, đơn gần đây; khóa / mở khóa; đổi vai trò (kể cả cấp `moderator`); **cộng / trừ Xu** kèm lý do (người dùng được báo, không trừ quá số dư).
6. **Bài đăng**: ẩn / hiện kèm lý do (người bán được báo) — đã có từ trước.
7. **Voucher & Xu** (`/admin/vouchers`): danh mục voucher đổi bằng Xu nay lưu trong DB (`VoucherDefinition`; chưa có dòng nào thì dùng bộ mặc định). Tạo, sửa giá đổi, bật / tắt (tắt thì không đổi mới được, voucher đã đổi vẫn dùng). `GET /me/xu` đọc danh mục từ đây.
8. **Hộp thư hỗ trợ**: người dùng gửi ở trang Trợ giúp (`POST /support/tickets`, mã `HT-####`, tối đa 5 phiếu chưa đóng), admin trả lời / đóng, người dùng nhận thông báo và xem lại ngay ở trang Trợ giúp.
9. **Thông báo hệ thống** (`/admin/announcements`): gửi toàn khu hoặc một khu, có hộp xác nhận (không thu hồi), lưu lịch sử.
10. **Cài đặt**: từ khóa cấm (bài / việc chứa từ cấm bị từ chối 422 khi đăng hoặc sửa; so khớp không phân biệt hoa thường và dấu), danh sách khu vực, danh mục (công khai ở `GET /api/meta`, **chưa nối vào các màn hình Mua/Bán**), xuất CSV người dùng / đơn / báo cáo (BOM UTF-8, chống chèn công thức Excel, ghi nhật ký).
11. **Nhật ký thao tác**: ai, làm gì, đối tượng, lúc nào, vì sao; lọc theo nhóm; chỉ xem.

## Thực thể mới

`SupportTicket`, `VoucherDefinition`, `Announcement`, `Setting` (từ khóa cấm / khu vực / danh mục); `User.role` thêm `moderator`. Đã có từ trước: `AuditLog`, `SellerVerification`, `Report`.

## Chạy thử với dữ liệu mẫu

```
cd server
# DB riêng để không đụng DB thật (bỏ dòng MONGODB_URI nếu muốn dùng DoAnWeb)
set MONGODB_URI=mongodb://127.0.0.1:27017/DoAnWeb_admin
npm run seed
node scripts/add-activity.js --apply
node scripts/seed-admin-demo.js --apply   # 4 hồ sơ xác minh, 6 báo cáo, 2 báo vấn đề, 1 xin hủy, 4 phiếu hỗ trợ, thông báo, nhật ký (có sao lưu, chạy lại không nhân đôi)
```

Đăng nhập admin: SĐT `0900000099`, mật khẩu `SEED_PASSWORD` trong `server/.env`. Ảnh chụp các màn: `docs/bao-cao/hinh-admin/`.

## Kiểm thử

- Server: `test/admin-ops.test.js` (12 test: quyền, bảng điều khiển, đơn + phân xử + hủy, báo cáo bối cảnh, hỗ trợ, voucher, Xu, kiểm duyệt, thông báo, cài đặt, CSV); cùng `npm test` 144/144.
- Client: `admin-labels.spec.ts`; `ng test` 223/223.
- Giao diện thật (Edge + CDP, 11/11 bước bấm thật đạt): duyệt / từ chối hồ sơ (bắt buộc lý do), trả lời phiếu, phân xử hoàn tiền một phần, gửi thông báo qua hộp xác nhận, tạo voucher, lưu từ khóa cấm, nhật ký có đủ dấu vết.

## Chưa làm / giới hạn

- Khu vực và danh mục chưa được các màn hình Mua/Bán đọc từ `/api/meta` (vẫn cố định trong mã).
- Chưa có tìm kiếm / phân trang cho danh sách hồ sơ xác minh quá 10 mục ngoài nút Trước/Sau; chưa có thông báo đẩy thời gian thực (dấu chấm số việc cập nhật mỗi 60 giây).
- Chưa tự gắn cờ bài theo từ khóa (hiện chỉ từ chối khi đăng); chưa phân quyền chi tiết hơn hai vai trò.
