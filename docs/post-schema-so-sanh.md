# So sánh model `Post`: client (FE) và server (Mongo)

> Mục đích: để cả nhóm chốt **một khuôn Post chung** trước khi mở rộng server. Nguồn: `client/src/app/core/models/post.ts`, `post-template.ts` và `server/src/modules/shared/post.model.js` (đọc ngày 11/11/2026, sau khi pull `dev`).

## 1. Nguyên tắc

Mỗi bài **không** có schema riêng. Một Post gồm 3 tầng:

1. **Lõi** — bài nào cũng có, server kiểm tra / lọc / sắp xếp được.
2. **Khối bật/tắt** — nhóm trường chỉ có nghĩa khi người bán bật khối đó (mô hình 7 khối).
3. **Mảng có khuôn** — người bán thêm bao nhiêu phần tử cũng được, mỗi phần tử có hình dạng cố định.

## 2. Tầng 1 — Lõi

| Ý nghĩa | Client | Server | Lệch? |
|---|---|---|---|
| Loại bài | `kind`: food / goods / service / **job** | `type`: food / goods / service | Tên khác; việc làm nằm ở model `Job` riêng, FE gộp vào Post |
| Tên, mô tả, ảnh | `title`, `description`, `images` | giống | — |
| Danh mục | `category` | `category` | — |
| Giá đại diện | `price` | `price` | — |
| Đơn vị giá | `priceUnit` | `unit` | **Tên khác** |
| Người bán | `sellerId`, `sellerName`, `sellerAvatar` | `seller` (ObjectId, populate) | Server chỉ lưu id; tên/ảnh phải populate |
| Khu vực | `block`, `area`, `areas[]` | `area` (một chuỗi) | **Thiếu** `areas[]` (người bán phục vụ nhiều khu) |
| Khoảng cách | `distance` | `distance` | — |
| Trạng thái | `status`: draft / open / soldout / closed / hidden | open / soldout / closed / hidden | **Thiếu** `draft` |
| Nhận Xu | `acceptsXu` | `acceptsXu` | — |
| Quảng bá | `promoted`, `spinPromo` | không có | **Thiếu** |
| Thống kê | `rating`, `reviewCount`, `sold` | không lưu trong Post | Server tính từ Review / Order |
| Thời gian | `createdAt` | `timestamps` | — |

## 3. Tầng 2 — Bảy khối

| Khối | Trường client | Server hiện có | Thiếu ở server |
|---|---|---|---|
| 1 Giá | `priceType`, `estimate`, `inspectFee` | `price`, `unit` | `priceType`, `estimate`, `inspectFee` |
| 2 Số lượng | `bookOnce`, `QtyBlock` (mẫu) | — | `bookOnce` |
| 3 Thời gian | `needSchedule`, `dates[]`, `timeMode`, `duration`, `repeat`, `handover`, `prepMinutes`, `timeLabel`, `noSchedule`, `orderWindow` | `needSchedule` | tất cả còn lại |
| 4 Địa điểm / nhận hàng | `fulfillmentModes`, `deliveryFee`, `freeShipFrom`, `place{mode,where}`, `pickupAtBuyer` | `fulfillmentModes`, `deliveryFee` | `freeShipFrom`, `place`, `pickupAtBuyer` |
| 5 Tùy chọn cộng giá | `optionGroups[]`, `quickOptions[]`, `noteEnabled` | `optionGroups[]` | `quickOptions`, `noteEnabled` |
| 6 Câu hỏi riêng | `questions[]` (type, label, required, opts, ph, long, hint, pay) | `questions[{label, required}]` | `type`, `opts`, `ph`, `long`, `hint`, `pay` |
| 7 Tình trạng bán | `stock: {mode, left}` | `stock: Number`, `oneTime: Boolean` | **Khác kiểu** — cần gộp |

Khối riêng theo loại bài (chỉ có khi đúng loại):

| Loại | Trường client | Server |
|---|---|---|
| Đồ dùng | `condition{level,note}` | thiếu |
| Dịch vụ | `serviceInfo`, `highlights[]`, `serviceMenu[]` | thiếu |
| Đồ ăn / uống | `prepMinutes`, `handover` | thiếu |
| Thanh toán | `payMethods[]`, `bank{bankName,no,holder,qr}` | thiếu (cả hai, **bank là dữ liệu nhạy cảm**) |
| Giờ vàng, combo | `promo`, `combo` | **đã có, khớp** |
| Việc làm | `job{due,start,end,allDay,head,payBy,building,payUnit,offers,status,windows}` | model `Job` riêng (chưa đối chiếu từng trường) |

## 4. Tầng 3 — Mảng có khuôn

| Mảng | Khuôn một phần tử | Server |
|---|---|---|
| `optionGroups` | `{name, multi, required, choices[{label, price}]}` | **có, khớp** |
| `questions` | `{type, label, required, opts[], ph, long, hint, pay}` | thiếu 6/8 trường |
| `items` (thực đơn / bảng giá) | `{id, name, price, unit, dailyQty, optionGroups[]}` | **thiếu** |
| `serviceMenu` | `{name, optionGroups[], questions[]}` | **thiếu** |
| `highlights` | `{icon, label, value}` (3 ô đầu bài) | **thiếu** |
| `info` | `{label, value}` (nội quy, điều kiện hủy…) | **thiếu** |
| `dates` | mảng `yyyy-mm-dd` | **thiếu** |

## 5. Các điểm lệch cần chốt (ưu tiên từ cao xuống thấp)

1. **`stock`**: server là số, FE là `{mode: open|limit|once, left}`. Đề xuất theo FE; server bỏ `oneTime`, luồng đặt đơn đọc `stock.left`. Phải sửa `order.service.js`.
2. **Tên trường**: `kind`↔`type`, `priceUnit`↔`unit`, `sellerId`↔`seller`. Đề xuất chọn một tên, mapper ở server lo phần còn lại.
3. **Cờ rải rác**: `bookOnce`, `noSchedule`, `optsOnce`, `pickupAtBuyer`, `noteEnabled`… mỗi mẫu dịch vụ thêm một cờ. Đề xuất gom về hai chỗ: `place.mode` (khối 4) và `schedule.mode` (khối 3), thay vì cờ rời.
4. **`questions`** cần mở rộng khuôn thật (hiện server chỉ lưu nhãn → mất loại câu hỏi và lựa chọn).
5. **Phạm vi dữ liệu trong Mongo**: `bank` (số TK, QR) nên tách khỏi Post công khai (chỉ trả cho người đã đặt đơn).
6. **Việc làm**: giữ model `Job` riêng hay gộp vào Post (`kind: 'job'`) như FE? Cần chốt.
7. **`draft`**: có lưu bản nháp ở server không.

## 6. Đề xuất cách làm

- Mở rộng `post.model.js` theo 3 tầng ở trên, dùng sub-schema cho từng khối (mỗi khối là một object con, `default: undefined` nếu không bật).
- Mảng có khuôn dùng sub-schema `_id: false` như `optionGroup` hiện tại. **Không** dùng `Mixed` / JSON tự do, vì sẽ không kiểm tra và lọc được.
- Viết `post.mapper` ở server (và giữ `post-mapper.ts` ở FE) để đổi tên trường ở một chỗ.
- Cập nhật `seeds/data.js` sau khi chốt khuôn, tăng `DATA_VERSION` theo CLAUDE.md.
