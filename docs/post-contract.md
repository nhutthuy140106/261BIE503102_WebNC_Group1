# Hợp đồng dữ liệu `Post` — chuẩn chung phía Mua và phía Bán

> Chốt 03/11/2026 (Khải). **Bản này thay cho mọi mô tả Post rải rác** (`handoff.md` mục dữ liệu mẫu, `SellerPost.form`, model server rút gọn). Đổi trường phải báo cả hai phía.

## Tiến độ code (03/11, nhánh dev)

- **Xong:** `core/models/post.ts` có đủ trường mới (thêm, chưa đổi tên). `features/seller/seller-post-form/post-mapper.ts` là hàm duy nhất đổi form → Post. Đăng mới, sửa, tạm ngưng, xóa, đổi giá nhanh đều ghi vào **cùng một Post** (`SellerPost.buyerPostId` ↔ `Post._id`).
- **Chuyển tiếp:** `price` + `priceUnit` vẫn là số/chữ rời (giá đại diện); `priceType`, `estimate`, `inspectFee` là trường thêm. Chưa gộp thành object `price {…}` vì đụng 38 file — làm khi gộp xong phần còn lại. `closed` vẫn tồn tại, được suy ra từ `status`.
- **Phía Mua đã đọc (đồ ăn & đồ uống, 03/11):** `items[]` (danh sách món, mỗi món một số lượng, ghi giá đầy đủ), `optionGroups` (chọn 1 / chọn nhiều / không bắt buộc), `fulfillmentModes` + `deliveryFee` (cách nhận), `priceType` (“từ …”), `stock`. **Tùy chọn hai tầng (chốt 04/11):** (1) riêng từng món (`items[].optionGroups`) — chọn món nào thì bung tùy chọn của món đó ngay dưới dòng món; (2) dùng chung cả đơn (`optionGroups` cấp bài, form Bán có khu “Món thêm dùng chung cho cả đơn”) ở cuối khung đặt. Nhóm **Chọn nhiều** là *món thêm có số lượng* (tick rồi chỉnh −/+, tối đa 10, giá × số lượng, KHÔNG nhân số phần). Nhóm **Chọn một** (Size…) nhân theo số phần của món. Chưa có giỏ nhiều dòng: nhiều phần cùng một món dùng chung một lựa chọn Chọn một.
- **Đồ dùng & dịch vụ (04/11):** phía Mua đọc `condition`, `serviceInfo { turnaround, warranty, area }`, `place` (+ `deliveryFee` = phí đến nhà), `timeMode` + `duration` + `handover` (= khung giờ khách chọn hẹn), `estimate`, `inspectFee`, bảng giá nhiều dòng (`items[]`, mỗi dòng ghi kèm đơn vị). `dates` của đồ ăn/uống = lịch bán tự mở/khóa bài (khách không thấy lịch); `dates` của dịch vụ = các ngày nhận lịch (ngày khác khóa trong lịch chọn ngày). Bước đơn lấy từ `placedStepNames` (một nguồn) cho mọi bài người bán đăng.
- **3 ô thông tin đầu trang (tối đa 3, chữ đậm ngắn một dòng, ô trống thì ẩn):** Đồ ăn & uống = Giờ nhận đặt · Cách nhận · Thời gian chuẩn bị. Đồ dùng = Ngày đăng · Cách nhận · Tình trạng. Dịch vụ = Thời gian hoàn thành · Nơi làm · Bảo hành (báo giá sau mà chưa ghi bảo hành thì ô 3 là Phí kiểm tra).
- **Chưa làm:** phía Mua chưa đọc `payMethods`, `dailyQty` từng món, dịch vụ lưu trú (theo đêm), bảng giá tham khảo của dịch vụ báo giá sau; xem trước phía Bán chưa dùng `viewOf()`; hồ sơ người bán chưa có `payment`; gộp kho đơn; server.
- **Địa chỉ chính xác của việc làm KHÔNG nằm trong Post** (chỉ ở Job phía Bán, server cấp cho người được chọn) — sửa lại so với bảng `job` bên dưới.

## Ba quy tắc

1. **Một `Post` duy nhất, đủ 7 khối.** Form đăng bài chỉ là giao diện nhập; bấm Đăng thì **một hàm duy nhất** biến form thành `Post`. Phía Mua chỉ đọc `Post`. Server dùng đúng cấu trúc này.
2. **Xem trước của người bán dùng code hiển thị của người mua** (`viewOf()` + component chi tiết bài). Người bán thấy gì, khách thấy y vậy.
3. **Một đơn, hai góc nhìn.** Chỉ có một `Order` (và một `Offer` cho việc làm), có `buyerId` + `sellerId`. "Đơn khách đặt" (Bán) và "Đơn đã đặt" (Mua) là cùng bản ghi.

## Post ≠ Order

- **Post** = bảng hiệu: bán gì, giá, cách nhận. Đăng một lần, mở lâu dài.
- **Order** = mỗi lần có người đặt: trạng thái, duyệt giá, đổi lịch, phụ thu, đánh giá. **Không** đưa vào Post.

Post chỉ mang các **cờ** quyết định luồng của đơn:

| Cờ trong Post | Quyết định ở Order |
|---|---|
| `kind` | Bộ bước (đồ ăn / đồ dùng / dịch vụ / việc làm) |
| `price.type` = `quote` hoặc `estimate: true` | Có bước **duyệt giá** |
| `place.mode`, `fulfillmentModes` | Có bước giao/nhận, có phí giao |
| `stock.mode` | Tự khóa bài khi hết / đã bán |

## Trường chung (mọi loại)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `_id` | ObjectId | |
| `kind` | `food` · `goods` · `service` · `job` | 4 nhóm đã chốt |
| `title`, `description` | string | |
| `images[]` | string[] | Việc làm có thể không ảnh |
| `category` | string | |
| `seller` | `{ id, name, avatar }` | Lấy từ tài khoản, không nhập lại |
| `block`, `area` | string | Lấy từ tài khoản/khu vực |
| `status` | `draft` · `open` · `soldout` · `closed` · `hidden` | `hidden` = Admin gỡ. Thay cho cờ `closed` + `on` rời nhau |
| `acceptsXu` | boolean | |
| `payMethods[]` | `cash` · `transfer` · `xu` | Tên phương thức khách được chọn |
| `bank` | `{ bankName, no, holder, qr? }` | **Đổi 05/11:** tài khoản và QR lưu theo từng bài, theo form đăng bài, không ở hồ sơ người bán. Chỉ có khi nhận chuyển khoản |
| `quickOptions[]`, `noteEnabled` | string[], boolean | Đồ ăn, đồ uống: tùy chọn nhanh khách tick (không tính tiền), bật / tắt ô ghi chú |
| `promo` | Giờ vàng | Giữ nguyên như hiện có |
| `combo` | Combo | Giữ nguyên như hiện có |
| `promoted`, `spinPromo` | boolean | **Do hệ thống gán** khi trả Xu; người bán không nhập |
| `createdAt`, `updatedAt` | ISO | |

## 7 khối

| Khối | Trường | Ghi chú |
|---|---|---|
| 1 Giá | `price { type: fixed·unit·from·quote, amount, unit, estimate?, inspectFee? }` | Thay `price` + `priceUnit` rời. Bài nhiều món: `amount` = giá thấp nhất (để lọc/sắp xếp), giá từng món ở `items[]` |
| 2 Số lượng | `qty { min, max }` | Nhãn lấy theo `price.unit` |
| 3 Thời gian | `orderWindow { from, to, days[] }`, `dates[]`, `duration { min, max }`, `repeat` | `orderWindow` = khung giờ nhận đơn; `dates` = ngày bán/ngày làm |
| 4 Địa điểm | `place { mode: choice·buyer·seller·ab, where? }`, `fulfillmentModes[]`, `deliveryFee` | `where` = địa chỉ người bán khi khách tới |
| 5 Tùy chọn cộng giá | `optionGroups[] { name, multi, required, choices[{ label, price }] }` | Cấp bài. Món có tùy chọn riêng thì nằm trong `items[]` |
| 6 Câu hỏi riêng | `questions[] { type: text·choice·multi·photo, label, required, opts?, ph?, long?, hint?, pay? }` | Server hiện thiếu `type`, `opts`, `ph`, `long`, `hint`, `pay` |
| 7 Tình trạng bán | `stock { mode: open·limit·once, left? }` | |

## Thực đơn nhiều món — `items[]` (chốt: phương án A)

Bài đồ ăn/đồ uống (và dịch vụ có bảng giá) có thể bán nhiều món trong **một** Post:

```
items[] {
  id, name, price, unit,
  dailyQty?        // số phần/ngày; bỏ trống = không giới hạn
  optionGroups[]   // tùy chọn riêng của món (size, topping…)
}
```

- Phía Mua hiện món dạng **hàng danh sách** ở bước 1 (kiểu ShopeeFood), chọn món rồi mới tới tùy chọn.
- Bài một món: `items` có đúng 1 phần tử, hoặc bỏ trống và dùng `price` + `optionGroups` cấp bài.
- Đồ dùng (`goods`) bán một món: không dùng `items`.

## Việc làm — `job`

```
job {
  start, end?, allDay?,   // ISO; việc lặp theo tuần thì dùng due (chữ)
  due?,                   // "Tối T3 & T5"
  head,                   // số người cần
  payUnit,                // giờ · việc · buổi…
  exactAddress,           // CHỈ lộ cho người được chọn (từ bước "Được chọn")
  status: open · taken,
  offers                  // số đề nghị (server tính, không nhập)
}
```

Tiền công = `price.amount`.

## Thông tin nhận tiền — ở hồ sơ người bán (chốt: phương án A)

```
sellerProfile.payment {
  bank { name, no, holder, qr }
}
```

- Người bán nhập **một lần** (trang Tôi / thiết lập gian hàng), không nhập lại mỗi bài.
- Post chỉ ghi `payMethods[]`. Chọn `transfer` mà hồ sơ chưa có tài khoản/QR thì **chặn đăng** và dẫn tới chỗ nhập.
- Người mua chỉ thấy tài khoản/QR **sau khi đặt đơn** (trong chi tiết đơn), không hiện công khai ở bài.

## Đổi so với hiện tại

| Hiện tại | Chuẩn mới |
|---|---|
| `price` + `priceUnit` | `price { type, amount, unit, … }` |
| `closed` (Mua) + `on` (Bán) | `status` |
| `SellerPost.form` (dữ liệu form thô, chỉ khu Bán dùng) | Bỏ làm nguồn hiển thị; chỉ còn là trạng thái nhập liệu |
| `PostBody` (rút gọn) | Gửi nguyên `Post` đủ khối |
| Bank/QR trong từng bài | `sellerProfile.payment` |
| Server `questions: [{ label, required }]` | Đủ trường như khối 6 |
| Server `Post.type` không có `job` (việc làm ở `job.model.js` riêng) | Cần chốt khi làm server: gộp `job` vào Post hay giữ model riêng nhưng cùng hình dạng |
| Sửa bài không đồng bộ sang Mua | Sửa / tạm ngưng / xóa đều ghi vào **cùng một** Post |

## Thứ tự làm tiếp

1. Cập nhật `core/models/post.ts` theo bảng trên (kèm `items[]`, `price` object, `status`, `payMethods`, `sellerProfile.payment`).
2. Viết hàm `formToPost()` ở khu Bán; bỏ `publishToBuyers` rút gọn; sửa/tạm ngưng/xóa ghi vào cùng Post.
3. Cho cột xem trước của form Bán dùng `viewOf()` + component chi tiết phía Mua.
4. Cập nhật `viewOf()` và khung đặt phía Mua đọc `items[]`, `price.type`, `stock`.
5. Gộp kho đơn và đề nghị (một `Order`, `buyerId` + `sellerId`).
6. Cập nhật model server + seed theo chuẩn này.

## Còn để ngỏ

- Server: `job` gộp vào Post hay giữ riêng (xem bảng trên).
- Dữ liệu mock cũ (`posts.json`, `seller-space.json`) cần chuyển đổi sang chuẩn mới; xóa khóa localStorage `antgo_*` để thấy bản mới.
- Quy tắc hủy/trả/hoàn của Order vẫn chưa chốt (không thuộc Post).
