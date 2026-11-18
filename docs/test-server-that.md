# Hướng dẫn test web chạy với server thật (`?mock=0`)

> 12/11/2026. Dành cho người test (không cần biết lập trình). Mục tiêu: xem **web có chạy đúng khi lấy dữ liệu từ server và MongoDB thật** không, và báo lỗi cho người sửa.
> File `test-checklist.md` là bản test cho dữ liệu giả (`?mock=1`); file này chỉ nói về phần server thật.

## 1. Hiểu nhanh

- **Web** = giao diện bạn thấy. **Server** = chương trình xử lý, chạy ngầm. **MongoDB** = nơi lưu dữ liệu.
- Mặc định web dùng dữ liệu giả (`?mock=1`). Thêm **`?mock=0`** vào địa chỉ thì web mới hỏi server thật.
- Mỗi máy có MongoDB riêng, nên **bạn phải tự nạp dữ liệu mẫu** trên máy mình (bước 2).

## 2. Chuẩn bị (làm một lần)

```bash
git checkout dev
git pull origin dev
```

**Server** (cần MongoDB đang chạy ở cổng 27017):
```bash
cd server
npm install
npm run seed      # nạp dữ liệu mẫu: 23 tài khoản, 64 bài, 19 việc, 22 đơn. Chạy lại sẽ xóa và nạp lại dữ liệu mẫu
npm start         # giữ nguyên cửa sổ này; thấy "AntGo API chạy tại http://localhost:3000" là được
```
File `server/.env` cần có `MONGODB_URI=mongodb://127.0.0.1:27017/DoAnWeb` và `SEED_PASSWORD=Antgo@2026` (chép từ `server/.env.example`).

**Web** (cửa sổ terminal khác):
```bash
cd client
npm install
npm start         # đợi "Local: http://localhost:4200"
```

Mở: **`http://localhost:4200/?mock=0`** (phải đúng cổng 4200).

**Mỗi lần kéo code mới (`git pull`) thì tắt server (Ctrl + C) rồi `npm start` lại**, nếu không server vẫn chạy bản cũ.

Tài khoản mẫu: số điện thoại `0900000001` (Ngọc Thủy), mật khẩu `Antgo@2026`. Các số khác: `0900000002` Bếp Cô Lan, `0900000004` Chị Hoa…

## 3. Các luồng cần thử (phía Mua)

Đánh dấu `[x]` khi đúng. Chỗ nào sai thì ghi theo mục 5.

**Đăng nhập và tài khoản**
- [ ] Đăng nhập bằng tài khoản mẫu → vào được, hiện tên và ảnh. Sai mật khẩu → báo lỗi.
- [ ] Tắt tab, mở lại `http://localhost:4200/?mock=0` → còn đăng nhập (phiên 1 giờ).
- [ ] **Đăng ký:** nhập số mới (vd `0911222333`) → sang bước 2 sẽ hiện dòng "Chạy thử… Mã của bạn là 123456" (mã này cũng in ở cửa sổ server) → nhập đúng mã → điền thông tin → vào app.
  - Nhập sai mã: báo "còn N lần thử". Sai 5 lần → phải xin mã mới.
  - Bấm gửi lại quá sớm (dưới 60 giây) → báo phải đợi.
  - Số đã có tài khoản (vd `0900000001`) → báo "đã có tài khoản" ngay bước 1.
- [ ] **Quên mật khẩu** (`/auth/forgot`): nhập `0900000001` → nhập mã thử → đặt mật khẩu mới → đăng nhập được bằng mật khẩu mới. (Đổi xong nhớ nhớ mật khẩu mới, hoặc chạy lại `npm run seed` để trả về `Antgo@2026`.)

**Xem bài**
- [ ] Trang chủ có hiện bài. Mở một bài: ảnh, giá, mô tả, thực đơn/tùy chọn (nếu có), 3 ô thông tin đầu bài.
- [ ] Bài đồ ăn có thực đơn nhiều món: chọn món, chọn tùy chọn, số lượng, tổng tiền đúng.
- [ ] Tìm kiếm, lọc theo loại, đổi khu vực.

**Đặt đơn và thanh toán**
- [ ] Đặt một đơn **tiền mặt** → "Đã gửi đơn!" → vào **Đơn hàng** thấy đơn vừa đặt.
- [ ] Đặt một đơn **chuyển khoản** → màn "Đã gửi đơn!" hiện **mã QR** có số tiền và nội dung là mã đơn (vd `AG-O9151`); ở trang chi tiết đơn có khung "Chuyển khoản cho …".
- [ ] Đơn chuyển khoản của bài **chưa có tài khoản** (một số bài của người bán chưa có trong dữ liệu) thì không có QR: chỉ ghi nhận, không phải lỗi.
- [ ] Tắt web, mở lại → đơn vẫn còn (nghĩa là đã lưu vào MongoDB thật).
- [ ] Đơn hết hàng: bài giới hạn số lượng (vd "Cơm sườn rim" còn 3) → đặt quá số còn lại phải bị chặn.
- [ ] Hủy đơn / yêu cầu hủy ở chi tiết đơn.

**Khác**
- [ ] Lưu bài (♡), Messenger, thông báo, đánh giá sau khi đơn hoàn thành: thử nhanh, ghi lại cái nào lỗi.

## 4. Đã biết chưa làm (không cần báo lỗi)

- **Phía Bán chạy bằng dữ liệu giả**, chưa có server: đăng bài, nhận đơn, đăng việc, hồ sơ gian hàng ở `?mock=0` sẽ không lưu vào MongoDB. Đơn khách đặt ở phía Mua chưa chắc hiện sang "Đơn khách đặt" của phía Bán.
- Mã OTP **chưa gửi SMS thật** (hiện ngay trên màn hình khi chạy thử).
- Số tài khoản nhận tiền đang gắn ở từng bài; sẽ chuyển sang hồ sơ người bán sau (cần bàn với người làm khu Bán).
- 9 bài mẫu của người bán chưa có tài khoản trong dữ liệu (Bác Sơn, Bạn Linh, Tiệm Bánh Nhà Mây…) không có ở server.
- Tự hủy đơn khi quá hạn chỉ chạy khi mở web, chưa có ở server.
- Đăng nhập Google chưa kiểm chứng đến cùng; tài khoản tạo bằng Google chưa qua OTP.

## 5. Cách báo lỗi (gửi cho người sửa)

Chụp màn hình và ghi 4 ý, mỗi ý một dòng:
1. **Làm gì** (bấm vào đâu, ở bài/đơn nào, tài khoản nào)
2. **Thấy gì** (kèm ảnh)
3. **Đáng lẽ thấy gì**
4. **Lần nào cũng bị, hay thỉnh thoảng?**

Nếu màn hình trắng hoặc báo lỗi đỏ: bấm **F12** → tab **Console** → chụp phần chữ đỏ; và chụp cả **cửa sổ terminal của server** (có thể có dòng lỗi).

## 6. Nếu bị kẹt

| Triệu chứng | Cách xử lý |
|---|---|
| Web trắng hoặc không có bài | Server chưa chạy (`cd server && npm start`) hoặc MongoDB chưa bật; kiểm tra có `?mock=0` chưa |
| Báo lỗi 404 ở `/api/...` | Server đang chạy bản cũ: Ctrl + C rồi `npm start` lại |
| Không đăng nhập được | Chưa chạy `npm run seed`, hoặc `.env` thiếu `SEED_PASSWORD` |
| Dữ liệu lạ, lẫn dữ liệu giả cũ | Mở **cửa sổ ẩn danh**, hoặc F12 → Application → Local Storage → xóa các khóa `antgo_*` |
| Muốn trả dữ liệu về như ban đầu | `cd server && npm run seed` (xóa và nạp lại dữ liệu mẫu) |
| Muốn quay về dữ liệu giả | Đổi `?mock=0` thành `?mock=1` |
