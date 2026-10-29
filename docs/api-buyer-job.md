# API — module Người mua + Nhận việc

> Trạng thái mỗi endpoint: **Chưa làm / Đang làm / Xong**. Backend đã làm xong (chạy được, có test); riêng các điểm **[Chờ chốt]** đang theo giả định ở `decisions.md` Mục 4.
> Nguồn hành vi: bản mẫu `design/mockups/` (`orders.html`, `job.html`, `detail.html`, `profile.html`…). Các chỗ **[Chờ chốt]** liên quan câu hỏi mở trong `decisions.md`.
> Swagger: mọi endpoint phải có trong `/api-docs`, tag theo module.

## 0. Quy ước chung

- Base URL: `/api`. Dữ liệu JSON. Xác thực: **session cookie** `connect.sid` (httpOnly), FE gọi với `withCredentials` (ký hiệu 🔒 = bắt buộc đăng nhập). *(Planning đổi từ JWT ngày 18/10 theo chương VIII — **D1 đã chốt 18/10**.)*
- Thành công: `{ "data": <object|array>, "meta": { "page", "limit", "total" } }` (`meta` chỉ có ở danh sách).
- Lỗi: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "field": "phone", "message": "…" }] } }`.
- Phân trang: `?page=1&limit=20`. Sắp xếp: `?sort=-createdAt`.
- `id` là ObjectId (24 ký tự hex); sai định dạng → 400.

| Mã | Ý nghĩa | `error.code` |
|---|---|---|
| 400 | Tham số/id sai định dạng | `BAD_REQUEST` |
| 401 | Chưa đăng nhập / hết phiên | `UNAUTHORIZED` |
| 403 | Không có quyền với tài nguyên này / tài khoản bị khóa | `FORBIDDEN`, `ACCOUNT_LOCKED` |
| 404 | Không tồn tại | `NOT_FOUND` |
| 409 | Sai trạng thái / trùng | `INVALID_STATE`, `DUPLICATE` |
| 413 | Ảnh tải lên quá 2 MB hoặc quá 4 ảnh | `PAYLOAD_TOO_LARGE` |
| 422 | Dữ liệu không hợp lệ | `VALIDATION_ERROR` |
| 429 | Đăng nhập quá nhiều lần (10 lần / 15 phút / IP) | `TOO_MANY_REQUESTS` |
| 500 | Lỗi server | `INTERNAL_ERROR` |

## 0.1 Ranh giới với Bán / Admin

| Việc | Thuộc | Ghi chú |
|---|---|---|
| Tạo/sửa/xóa bài (`Post`), việc (`Job`) | Bán + Đăng việc | Module này **chỉ đọc** |
| Xác nhận/từ chối đơn, cập nhật bước đơn phía bán | Bán | Module này đọc trạng thái + gửi yêu cầu hủy |
| Chọn người làm, xác nhận hoàn thành việc | Đăng việc | Chuyển `offered → chosen`, `reported → done` do phía Đăng việc gọi — **[Chờ chốt Q4]** |
| Xử lý báo cáo, duyệt người dùng | Admin | Người dùng tạo `Report` (Mục 10); admin xử lý ở Mục 15 |
| Đăng ký / đăng nhập | Module này (Q1, D1) | Session cookie, xem Mục 11 |
| Admin: người dùng, kiểm duyệt, thống kê | Module này làm tạm (D6) | Mục 15; đổi chủ nếu nhóm giao người khác |

## 0.2 Route tạm `/api/dev/*`

Thay cho phía Bán / Đăng việc để thử trọn luồng (chỉ có khi không phải production): `POST /dev/orders/:id/advance`, `/dev/orders/:id/surcharge`, `/dev/jobs/:id/offers/:offerId/choose`, `/dev/offers/:id/confirm-done`, `/dev/questions/:id/answer`. Xóa khi hai module kia xong.

## 1. Models liên quan

| Model | Sở hữu | Ghi chú |
|---|---|---|
| `User` | Chung **[Q1]** | `name`, `phone`, `avatar` (URL ảnh chân dung hoặc `null`), `area`, `role` (`enduser`\|`admin`), `status` (`active`\|`locked`) |
| `Post` | Bán | `type` (`food|goods|service`), `title`, `images`, `price`, `blocks` (7 khối), `seller`, `area`, `status` |
| `Job` | Đăng việc | `title`, `desc`, `pay`, `workTime`, `windows`, `area`, `exactAddress`, `headcount` (số người cần), `poster`, `status` (`open|closed`), `offerCount` |
| `Order` | Chung **[Q2]** | Đơn đặt: `code`, `buyer`, `seller`, `post`, `snapshot`, `items`, `address`, `total`, `payment`, `state` |
| `Offer` | Module này | Đề nghị nhận việc: `job`, `worker`, `intro`, `slots`, `state`, `history` |
| `Question` | Module này | Hỏi đáp công khai của `Job` |
| `Address` | Module này | Sổ địa chỉ của tôi |
| `Saved` | Module này | Bài đã lưu |
| `Review` | Module này | Đánh giá sau đơn/việc |
| `Conversation`, `Message` | Module này | Messenger |
| `Notification` | Module này (đọc/đánh dấu); bên khác có thể tạo | |
| `Report` | Module này (tạo); Admin xử lý | Hỗ trợ vấn đề với đơn |

---

## 2. Địa chỉ của tôi — model `Address`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET 🔒 | `/me/addresses` | Danh sách địa chỉ của tôi | Xong |
| POST 🔒 | `/me/addresses` | Thêm địa chỉ | Xong |
| PUT 🔒 | `/me/addresses/:id` | Sửa | Xong |
| DELETE 🔒 | `/me/addresses/:id` | Xóa (trừ địa chỉ mặc định) | Xong |
| PATCH 🔒 | `/me/addresses/:id/default` | Đặt làm mặc định | Xong |

Body (POST/PUT): `{ "name": "Ngọc Thủy", "phone": "0901234567", "block": "B", "unit": "B-1204", "note": "Gọi trước khi tới", "label": "home|family|other" }` — `phone` 10 số; `block` ∈ A–D.
Response mẫu: `{ "data": { "_id": "…", "name": "Ngọc Thủy", "phone": "0901234567", "block": "B", "unit": "B-1204", "label": "home", "isDefault": true } }`
Lỗi: 422 sai SĐT/block · 409 xóa địa chỉ mặc định · 403 địa chỉ của người khác · 404.

## 3. Bài đã lưu — model `Saved`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET 🔒 | `/me/saved?type=food\|goods\|service\|job` | Danh sách đã lưu (kèm tóm tắt bài, cờ `available`) | Xong |
| PUT 🔒 | `/me/saved/:postId` | Lưu (idempotent) | Xong |
| DELETE 🔒 | `/me/saved/:postId` | Bỏ lưu | Xong |

Response mẫu GET: `{ "data": [{ "postId": "…", "type": "food", "title": "Cơm gà", "price": 45000, "area": "B", "available": true }] }`
Lỗi: 404 bài không tồn tại.

## 4. Khám phá & tìm kiếm — model `Post`, `Job` (chỉ đọc)

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/posts` | Danh sách bài (food/goods/service) | Xong |
| GET | `/posts/:id` | Chi tiết bài (7 khối) | Xong |
| GET | `/jobs` | Danh sách việc làm | Xong |
| GET | `/jobs/:id` | Chi tiết việc (địa chỉ chính xác bị ẩn) | Xong |
| GET | `/search?q=&type=` | Tìm chung bài + việc **[Q8]** | Xong |

Query `/posts`: `type`, `area`, `q`, `minPrice`, `maxPrice`, `acceptsXu=true`, `sort` (`nearest|newest|price|-price`), `page`, `limit`.
Query `/jobs`: `area`, `q`, `minPay`, `sort` (`newest|nearest|-pay`), `page`, `limit`.
Response mẫu `/jobs/:id`: `{ "data": { "_id": "…", "title": "Cho mèo ăn", "pay": 80000, "area": "B", "poster": { "_id": "…", "name": "Chị Hoa" }, "status": "open", "offerCount": 3, "myOffer": null } }` — `myOffer` có khi đã đăng nhập và đã gửi đề nghị.
Lỗi: 400 id sai · 404 · 422 khoảng giá sai (`minPrice > maxPrice`).

## 5. Đơn đã đặt — model `Order`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| POST 🔒 | `/orders` | Tạo đơn từ một bài | Xong |
| GET 🔒 | `/orders?role=placed&state=&page=` | Đơn đã đặt của tôi (`state=active\|history`) | Xong |
| GET 🔒 | `/orders/:id` | Chi tiết đơn | Xong |
| POST 🔒 | `/orders/:id/cancel-request` | Gửi yêu cầu hủy (kèm lý do) | Xong |
| POST 🔒 | `/orders/:id/return-request` | Gửi yêu cầu trả hàng **[Chờ chốt Q6]** | Xong |
| POST 🔒 | `/orders/:id/approve-surcharge` | Đồng ý phụ thu **[Chờ chốt Q6]** | Xong |

Body POST `/orders`:
```json
{
  "postId": "…",
  "quantity": 1,
  "selections": [{ "group": "Size", "choices": ["L"] }],
  "answers": [{ "question": "Kích thước", "value": "Dưới 10kg" }],
  "fulfillment": "delivery|pickup",
  "addressId": "…",
  "scheduledAt": "2026-10-20T11:30:00Z",
  "utensils": true,
  "note": "Ít cay",
  "voucherCode": "XU10",
  "payment": "cash|transfer"
}
```
Response mẫu: `{ "data": { "_id": "…", "code": "AG-O3012", "state": "waiting", "total": 52000, "breakdown": { "items": 45000, "deliveryFee": 7000, "discount": 0 }, "snapshot": { "title": "Cơm gà", "seller": "Bếp Cô Lan" } } }`
Quy tắc: `total` **tính ở server** từ giá bài hiện tại; không nhận `total` từ client.
Lỗi: 404 bài không tồn tại · 409 bài hết hàng/ngoài giờ nhận đặt/đã bán (`INVALID_STATE`) · 422 thiếu địa chỉ khi `delivery`, thiếu câu hỏi bắt buộc, `scheduledAt` quá khứ · 403 xem đơn người khác · 409 hủy ở trạng thái không cho phép.
Trạng thái đơn thử (chưa chốt, **[Q6]**): `waiting → confirmed → preparing → delivering|ready → done`; nhánh `cancelled`, `declined`.

## 6. Việc đã nhận / Đề nghị nhận việc — model `Offer`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| POST 🔒 | `/jobs/:id/offers` | Gửi đề nghị nhận việc | Xong |
| GET 🔒 | `/offers?state=active\|history` | Việc đã nhận (đề nghị của tôi) | Xong |
| GET 🔒 | `/offers/:id` | Chi tiết đề nghị + việc | Xong |
| PATCH 🔒 | `/offers/:id` | Sửa lời giới thiệu/khung giờ (khi `offered`) | Xong |
| POST 🔒 | `/offers/:id/withdraw` | Rút đề nghị (`offered → withdrawn`) | Xong |
| POST 🔒 | `/offers/:id/start` | Bắt đầu làm (`chosen → working`) | Xong |
| POST 🔒 | `/offers/:id/report-done` | Báo hoàn thành (`working → reported`) | Xong |
| POST 🔒 | `/offers/:id/confirm-paid` | Xác nhận đã nhận tiền công **[Q4]** | Xong |
| POST 🔒 | `/offers/:id/cancel-request` | Xin hủy (`chosen|working → cancelled`) | Xong |
| POST | `/jobs/:id/offers/:offerId/choose` | Chọn người *(phía Đăng việc, **không** làm ở module này)* | — |

Body gửi đề nghị: `{ "slots": ["2026-10-20T09:00:00Z"], "intro": "Mình ở cùng block, rảnh sáng mai.", "price": 80000 }` — `price` chỉ có nếu nhóm chốt cho đề xuất giá **[Q5]**.
Body báo xong: `{ "note": "Đã cho ăn và dọn khay", "images": ["/uploads/…"] }` — `note` bắt buộc, `images` ≤ 4.
Body xin hủy: `{ "reason": "busy|sick|other", "detail": "…" }` — `reason` bắt buộc.
Response mẫu: `{ "data": { "_id": "…", "job": { "_id": "…", "title": "Cho mèo ăn", "pay": 80000 }, "state": "offered", "intro": "…", "history": [{ "state": "offered", "at": "2026-10-18T08:00:00Z" }] } }`
Quy tắc:
- `exactAddress` của việc chỉ có trong response khi `state` ∈ {`chosen`, `working`, `reported`, `done`}.
- Mỗi chuyển trạng thái ghi vào `history` (state + thời điểm) — FE hiển thị ngày giờ dưới từng bước.
- Tự hoàn thành sau 24 giờ khi `reported` mà chủ việc không phản hồi **[Q4]** (cần job nền hoặc tính khi đọc).
Lỗi: 404 việc/đề nghị · 403 đề nghị của người khác; **không được đề nghị việc của chính mình** · 409 việc đã đóng / đã có đề nghị đang hoạt động / chuyển trạng thái không hợp lệ · 422 thiếu `intro`, `slots` ngoài khung việc, thiếu `note`/`reason`.

## 7. Hỏi đáp công khai — model `Question`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/jobs/:id/questions` | Danh sách hỏi đáp của việc | Xong |
| POST 🔒 | `/jobs/:id/questions` | Đăng câu hỏi | Xong |
| POST 🔒 | `/jobs/:id/questions/:qid/answer` | Trả lời *(phía Đăng việc — **[Q3]** ai làm)* | — |

Body: `{ "text": "Mèo có hay cào người không?" }` — 5–500 ký tự, **không chứa chuỗi ≥ 9 chữ số liền (hoặc cách nhau)**.
Response mẫu: `{ "data": { "_id": "…", "text": "…", "author": { "name": "Minh" }, "answer": null, "createdAt": "…" } }`
Lỗi: 422 có số điện thoại/quá ngắn · 409 việc đã có người nhận (đóng hỏi đáp) · 404.

## 8. Đánh giá — model `Review`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| POST 🔒 | `/reviews` | Đánh giá sau đơn/việc hoàn thành | Xong |
| GET | `/reviews?postId=&userId=&rating=&hasPhoto=&sort=` | Danh sách + thống kê sao | Xong |

Body: `{ "targetType": "order|offer", "targetId": "…", "rating": 5, "comment": "Giao nhanh", "images": [] }` — `rating` 1–5 bắt buộc.
Response GET: `{ "data": { "average": 4.6, "count": 12, "distribution": { "5": 8, "4": 3, "3": 1, "2": 0, "1": 0 }, "items": [] } }`
Lỗi: 409 đơn chưa hoàn thành hoặc đã đánh giá · 403 không phải đơn của mình · 422 `rating` ngoài 1–5.

## 9. Hội thoại & thông báo — model `Conversation`, `Message`, `Notification`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET 🔒 | `/conversations` | Danh sách (kèm `unread`) | Xong |
| POST 🔒 | `/conversations` | Mở/lấy hội thoại với một người, gắn ngữ cảnh | Xong |
| GET 🔒 | `/conversations/:id/messages` | Tin nhắn (phân trang) | Xong |
| POST 🔒 | `/conversations/:id/messages` | Gửi tin | Xong |
| POST 🔒 | `/conversations/:id/read` | Đánh dấu đã đọc | Xong |
| GET 🔒 | `/notifications` | Danh sách thông báo | Xong |
| GET 🔒 | `/notifications/unread-count` | Số chưa đọc (chấm chuông) | Xong |
| POST 🔒 | `/notifications/read` | Đánh dấu đã đọc (`ids` hoặc tất cả) | Xong |

Body mở hội thoại: `{ "withUser": "…", "context": { "type": "order|offer|post|job", "id": "…" } }` — trả hội thoại cũ nếu đã có cùng cặp + ngữ cảnh.
Body gửi tin: `{ "text": "…" }` (1–2000 ký tự).
Lỗi: 403 không thuộc hội thoại · 404 · 422 tin rỗng · 409 nhắn cho chính mình.
Ghi chú: nhắn tin **không** đổi trạng thái đơn. Realtime (WebSocket/polling) **[Q7]**.

## 10. Báo cáo vấn đề — model `Report`

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| POST 🔒 | `/reports` | Gửi báo cáo vấn đề với đơn/việc/bài | Xong |
| GET 🔒 | `/reports?mine=true` | Báo cáo tôi đã gửi | Xong |

Body: `{ "targetType": "order|offer|post|job|user", "targetId": "…", "reason": "not_received|quality|payment|abuse|other", "detail": "…", "images": [] }`
Response mẫu: `{ "data": { "_id": "…", "state": "open", "createdAt": "…" } }`
Lỗi: 403 không liên quan tới đơn của mình · 422 thiếu `reason`/`detail` quá ngắn · 404.

## 11. Bổ sung ngày 18/10 (Planning) — bám bài dạy

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký (`username`, `fullName`, `password`; bcrypt) | Xong |
| POST | `/auth/login` | Đăng nhập (`rememberMe`); tạo session mới (`regenerate`) | Xong |
| POST 🔒 | `/auth/logout` | Hủy session + xóa cookie | Xong |
| GET 🔒 | `/auth/profile` | 200 + user hiện tại / 401 — FE `authGuard` hỏi endpoint này | Xong |
| GET | `/cart` | Nháp đơn trong session (khách chưa đăng nhập cũng có) | Xong |
| POST | `/cart` | Thêm món vào nháp `{ postId, quantity, selections }` | Xong |
| DELETE | `/cart/:postId` | Bỏ món | Xong |
| POST 🔒 | `/cart/checkout` | Chốt nháp thành đơn (401 nếu chưa đăng nhập), xóa nháp | Xong |
| POST 🔒 | `/uploads` | Upload ảnh (`png/jpg/webp` ≤ 2 MB), trả `{ "data": { "url": "/images/…" } }` **[D2]** | Xong |
| GET | `/posts/:id/similar` | Bài tương tự **[D3]** | Xong |
| GET 🔒 | `/me/recommendations` | Gợi ý cho tôi **[D3]** | Xong |

`/posts` và `/jobs` trả thêm `slug` (tên không dấu + ObjectId); `GET /posts/:slugOrId` nhận cả hai dạng.

## 12. Admin & vai trò (18/10, Planning — D6 đã chốt: vai trò `user`/`admin`)

`User` thêm: `role` (`user|admin`), `status` (`active|locked`). Mọi `/admin/*` yêu cầu `role = admin`: chưa đăng nhập → 401, `user` → 403 `FORBIDDEN`. Tài khoản bị khóa đăng nhập → 403 `ACCOUNT_LOCKED`.

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET 🔒 admin | `/admin/users?role=&status=&q=&page=` | Danh sách người dùng | Xong |
| GET 🔒 admin | `/admin/users/:id` | Chi tiết | Xong |
| POST 🔒 admin | `/admin/users/:id/lock` · `/unlock` | Khóa / mở khóa (kèm `reason`) | Xong |
| GET 🔒 admin | `/admin/posts?status=&q=` | Bài cần kiểm duyệt | Xong |
| POST 🔒 admin | `/admin/posts/:id/hide` · `/unhide` | Ẩn / hiện bài (kèm `reason`) | Xong |
| GET 🔒 admin | `/admin/reports?status=` | Hàng đợi báo cáo | Xong |
| POST 🔒 admin | `/admin/reports/:id/status` | Đổi trạng thái `{ "status": "reviewing|resolved|rejected", "note": "…" }` | Xong |
| GET 🔒 admin | `/admin/stats` | Số liệu tổng quan (đếm từ DB thật) | Xong |

Mọi hành động admin ghi vào `auditLog` (`actor`, `action`, `target`, `at`).

## 11. Xác thực — session cookie (model `User`)

Cookie `connect.sid`: `httpOnly`, `sameSite=lax`, `secure` khi production, hết hạn sau 1 giờ; phiên lưu trong MongoDB (`sessions`). FE gọi mọi request với `withCredentials: true`.

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký (luôn `enduser`, bỏ qua `role` client gửi) và đăng nhập luôn | Xong |
| POST | `/auth/login` | Đăng nhập; đổi Session ID, giữ giỏ nháp của khách | Xong |
| POST | `/auth/logout` | Hủy phiên + xóa cookie | Xong |
| GET 🔒 | `/auth/profile` | 200 + user nếu còn phiên, 401 nếu không (authGuard của FE hỏi endpoint này) | Xong |

Lỗi: 401 sai SĐT hoặc mật khẩu (thông báo chung) · 403 `ACCOUNT_LOCKED` · 409 SĐT đã đăng ký · 422 sai kiểu dữ liệu (chặn `{"$ne":null}`) · 429 thử quá nhiều.

## 12. Giỏ nháp — `req.session.cart` (dữ liệu tạm, mất khi hết phiên)

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/cart` | Xem giỏ + `estimate` (giá lấy lại từ DB) | Xong |
| POST | `/cart` | Thêm/thay món `{ postId, quantity, selections, answers }` (mỗi bài một dòng, tối đa 20) | Xong |
| DELETE | `/cart/:postId` | Bỏ món | Xong |
| POST 🔒 | `/cart/checkout` | Đặt cả giỏ: mỗi món một đơn; kiểm hết trước rồi mới ghi; xóa giỏ. Voucher chỉ áp cho đơn đầu | Xong |

Body checkout: `{ fulfillment, addressId?, scheduledAt?, utensils?, note?, voucherCode?, payment }`. Không tin giá/id người dùng từ client. Chưa đăng nhập → 401 (giỏ vẫn còn).

## 13. Upload ảnh

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| POST 🔒 | `/uploads` | `multipart/form-data`, field `images` (1–4 file png/jpg/webp, ≤ 2 MB). Trả `{ data: [{ url: "/images/uploads/<uuid>.png" }] }` | Xong |

Loại ảnh nhận dạng bằng chữ ký đầu file; tên file do server sinh. Các trường `images` của báo hoàn thành, đánh giá, báo cáo **chỉ nhận URL dạng trên**.

## 14. Gợi ý bài

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/posts/:id/similar?limit=` | Bài tương tự kèm `score` (id hoặc slug) | Xong |
| GET 🔒 | `/me/recommendations?limit=` | Gợi ý theo bài đã lưu/đã đặt; chưa có lịch sử → `reason: "new_in_area"` | Xong |

Thuật toán: `docs/thuat-toan-goi-y.md`.

## 15. Admin — chỉ `role = admin` (chưa đăng nhập 401, enduser 403)

| Method | Path | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/admin/users?role=&status=&q=` | Danh sách người dùng | Xong |
| GET | `/admin/users/:id` | Chi tiết + số đơn đã đặt, số việc đã đăng | Xong |
| POST | `/admin/users/:id/lock` `{ reason }` | Khóa (phiên đang có bị vô hiệu); không tự khóa mình, không khóa admin cuối cùng (409) | Xong |
| POST | `/admin/users/:id/unlock` | Mở khóa | Xong |
| PATCH | `/admin/users/:id/role` `{ role }` | Đổi vai trò; không đổi của chính mình (409) | Xong |
| GET | `/admin/posts?status=&type=&q=` | Danh sách bài kể cả bài ẩn | Xong |
| POST | `/admin/posts/:id/hide` `{ reason }` | Ẩn bài (hết hiện ở `/posts`, `/posts/:id` trả 404 cho người khác), báo người bán | Xong |
| POST | `/admin/posts/:id/unhide` | Hiện lại về trạng thái cũ | Xong |
| GET | `/admin/reports?state=` | Hàng đợi báo cáo, cũ nhất trước | Xong |
| GET | `/admin/reports/:id` | Chi tiết | Xong |
| POST | `/admin/reports/:id/transition` `{ to, note }` | `open → reviewing → resolved\|rejected`; kết thúc phải có `note`; người báo cáo được thông báo | Xong |
| GET | `/admin/stats` | Đếm thật bằng aggregation: người dùng, bài, việc, đơn theo trạng thái, báo cáo chờ xử lý | Xong |

Mọi hành động ghi vào `auditlogs` (ai, làm gì, đối tượng, lúc nào). Người báo cáo đọc được `state`, `adminNote`, `history` ở `GET /reports?mine=true`; không thấy admin nào phụ trách.

## 16. Ghi chú bổ sung cho Mục 4

`Post`/`Job` trả thêm `slug` (`<tên-không-dấu>-<id>`, cùng quy tắc `createSlug` ở FE). `GET /posts/:slugOrId` và `GET /jobs/:slugOrId` nhận cả id lẫn slug-có-id (sai định dạng → 400). `q` ở `/posts`, `/jobs`, `/search` tìm tương đối **không phân biệt dấu và hoa thường** ("bun bo" ra "Bún bò").

## 17. Ảnh đại diện (`avatar`)

`User.avatar` là **URL ảnh chân dung** (vuông, đã cắt quanh khuôn mặt) hoặc **`null`** nếu chưa có — không bao giờ là chuỗi rỗng. Khi `null`, FE hiện chữ cái đầu của `name`.

| Nơi người xuất hiện | Trường | Có `avatar` |
|---|---|---|
| `GET /auth/profile`, `/auth/login`, `/auth/register` | `data` (User đầy đủ) | Có |
| `GET /posts`, `/posts/:id`, `/posts/:id/similar`, `/me/recommendations` | `seller` | Có |
| `GET /jobs`, `/jobs/:id` | `poster` | Có |
| `GET /offers`, `/offers/:id` | `job.poster` | Có |
| `GET /conversations` | `with` | Có |
| `GET /reviews` | `items[].reviewer` | Có |
| `GET /jobs/:id/questions` | `[].author` | Có |
| `GET /orders`, `/orders/:id`, `POST /orders`, `POST /cart/checkout` | `snapshot.sellerAvatar` | Có (bản chụp lúc đặt; `seller` vẫn là id) |

Người rút gọn (`UserSummary`) luôn có `_id`, `name`, `avatar`, `area`. Chưa có endpoint để người dùng tự đổi ảnh (upload ở Mục 13 có thể dùng cho việc này) — xem `decisions.md` B1.


## 18. Phase 7A — chatbot, gợi ý giá, AntXu, theo dõi giao hàng (29/10)

### 18.1 `POST /assistant/chat` (đăng nhập)
Body `{ messages: [{ role: 'user'|'assistant', content }] }` (tin cuối phải của `user`, ≤ 500 ký tự). Trả `{ data: { reply, cards: [{ id, kind, title, price, unit, sellerName, area, image, slug }] } }`. Chế độ do `ASSISTANT_MODE` (xem `server/README.md`); thiếu khóa ở chế độ ép buộc → 503 `ASSISTANT_UNAVAILABLE`; nhà cung cấp lỗi → 503 thân thiện.

**Giờ vàng trong chatbot (7.20):** thẻ bài (`cards[]`) của bài đang giảm có `price` = giá thực trả, kèm `originalPrice`, `dealLabel`, `dealEndsAt`. Công cụ `deals_now` (Gemini/Groq) và bộ luật nhận câu "đang giảm giá gì", "khuyến mãi", "giờ vàng", "ưu đãi"; kết quả nêu giá gốc, % giảm, còn bao lâu và bài sắp giảm trong 3 giờ tới. `pick_dish` ưu tiên (~70%) món đang giảm, tìm kiếm bộ luật xếp bài đang giảm lên trước khi ngang điểm.

### 18.2 `GET /pricing/suggest?kind=&title=&category=` (đăng nhập)
`kind` ∈ food|goods|service|job. Trả `{ data: { low, suggested, high, samples, confidence, basis } | null }` (kNN TF-IDF, xem `thuat-toan-goi-y.md`).

### 18.3 AntXu — sổ Xu và game (đăng nhập)
| Route | Mô tả |
|---|---|
| `GET /me/xu` | `{ balance, ledger[{id,delta,title,kind,at}], vouchers[{id,cid,code,title,cond,expiresAt,status}], catalog[{cid,title,cond,cost}], game{id,playsLeft,capLeft,maxPlays,dailyCap} }`. Lần đầu gọi cộng 30 Xu chào mừng (một lần). |
| `POST /me/xu/game` `{ game:'hai-xu', score }` | Server tính Xu = `floor(score/8)`, cắt theo trần. Trả `{ granted, capLeft, playsLeft, balance }`. Điểm > 80 hoặc game lạ → 422; hết 3 lượt hoặc hết trần 30 Xu/ngày (giờ VN) → **429 `GAME_LIMIT`**. |
| `POST /me/xu/redeem` `{ cid:'v10'\|'v20'\|'ship' }` | 201 `{ id, cid, code, title, expiresAt, balance }` (mã `XU-XXXXXX`, hạn 30 ngày). Thiếu Xu → 409, cid lạ → 404. |

**Dùng voucher:** truyền `voucherCode: 'XU-XXXXXX'` ở `POST /orders` và giỏ nháp. Server kiểm voucher là của chính người đặt, chưa dùng, chưa hết hạn, bài có nhãn `acceptsXu`; `v10`/`v20` cần tiền hàng từ 50.000đ/150.000đ; `ship` chỉ áp cho đơn đồ ăn giao tận nơi (giảm đúng phí giao). Sai → 422 ở field `voucherCode`. Đơn bị hủy/từ chối thì voucher được trả lại. Mã cũ `XU10`/`XU5` vẫn dùng được để tương thích.

**Tự cộng Xu (server):** +10 khi đơn từ 30.000đ chuyển `done` (tối đa 3 đơn/ngày), +5 khi đánh giá có nhận xét, +15 khi đề nghị nhận việc thành `done` (người đăng xác nhận hoặc tự hoàn thành sau 24 giờ). Mỗi đơn/đánh giá/đề nghị chỉ cộng một lần; hiện ở `GET /me/xu` với `kind` = `order`/`review`/`job`.

### 18.4 `GET /orders/:id/tracking` (chủ đơn / người bán / admin)
`{ data: { simulated: true, note, shop:{lat,lng}, home:{lat,lng}, courier:{lat,lng,phase,etaMin,distanceKm} } }`. **Vị trí xe là mô phỏng**, tính từ mốc thời gian trong `history` (không có GPS thật) nên mọi thiết bị thấy cùng một chỗ. `phase`: `waiting` (chờ/đã xác nhận) · `preparing` (xe còn ở quán) · `delivering` (đang chạy shop→nhà, ~6 phút/km, tối thiểu 4 phút) · `delivered`. Toạ độ quanh tâm Block A–D. Đơn tự lấy, dịch vụ hoặc đã hủy/từ chối → 404 `NO_TRACKING`; người ngoài đơn → 403; id sai → 400.

### 18.5 Giờ vàng — giảm giá theo khung giờ (29/10)
`Post.promo = { kind:'percent'|'amount', value, from:'HH:mm', to:'HH:mm', days:[0-6], active }`. `days` là ngày **bắt đầu** khung (0 = Chủ nhật); khung `from > to` vắt qua nửa đêm (vd 21:00–02:00 bắt đầu thứ Năm kéo tới 02:00 thứ Sáu). Giờ tính theo **Asia/Ho_Chi_Minh**. `percent` 1–90, `amount` là số đồng; giá làm tròn 100đ, không âm. Schema kiểm tra: `promoSchema` (zod) ở `server/src/utils/promo.js` cho phía Bán dùng khi đăng/sửa bài.

- **Danh sách/chi tiết bài** (`GET /posts`, `/posts/:id`, `/me/recommendations`…) trả thêm `promo` (cấu hình) và `deal` = `{ price, original, label, endsAt }` khi Giờ vàng **đang chạy**, ngược lại `deal: null`. `price` của bài vẫn là giá gốc.
- **Giá do server tính** bằng `effectivePrice(post, now)` ở `priceOrder`, `POST /orders`, giỏ nháp (`/cart`, `/cart/checkout`); giá/`total` từ trình duyệt bị bỏ qua. Hết khung giờ thì về giá gốc ngay lúc đặt. Đơn ghi `snapshot.unitPrice` (giá đã giảm), `snapshot.originalPrice`, `snapshot.promoLabel`, `breakdown.promoSaved`.
- **Cộng dồn với voucher Xu:** Giờ vàng giảm trước, voucher tính **sau** trên giá đã giảm; mức tối thiểu của voucher (`v10` ≥ 50.000đ, `v20` ≥ 150.000đ) cũng so với tiền hàng **đã giảm**.
- **`GET /deals?now=&area=&type=`** (công khai): `{ data: { now, active: [Post + deal], upcoming: [Post + upcoming{label,startsAt}] } }`. `active` xếp bài sắp hết giờ lên trước; `upcoming` là bài bắt đầu giảm trong 3 giờ tới. `now` (ISO có múi giờ) chỉ để demo/test, mặc định giờ server; sai định dạng → 422.
- Seed: 10 bài có Giờ vàng, các khung nối nhau để **mọi giờ trong ngày** luôn có 1–2 bài đang giảm (01–07 giặt sấy · 06–10 sáng · 10–14 trưa · 14–17 giải khát · 17–21 tối · 21–02 ăn khuya).
