# Quyết định kỹ thuật & câu hỏi mở

> Phạm vi: module Người mua + Nhận việc. Cập nhật file này mỗi khi chốt thêm một điều.
> Ký hiệu: **[Đã chốt]** = quyết định đã có (nguồn ghi bên cạnh). **[Đề xuất]** = tôi đề xuất, cần nhóm đồng ý trước khi coi là chốt.

## 1. Quyết định đã chốt / đề xuất

### 1.1 Công nghệ
| Mục | Quyết định | Trạng thái |
|---|---|---|
| Backend | Node.js + Express + MongoDB (Mongoose), JWT, Swagger cho mọi module | **[Đã chốt]** |
| Frontend | Angular (repo đã có `client/`, Angular 22, test bằng Vitest) | **[Đã chốt]** theo repo; xác nhận lại với nhóm (Q9) |
| Giao diện | Chờ Figma; FE làm logic trước với mock data | **[Đã chốt]** |
| Bản mẫu HTML ở `design/mockups/` | Chỉ để tham khảo hành vi/dữ liệu, không phải code đồ án | **[Đã chốt]** |
| Mật khẩu | Hash bằng `bcryptjs` | **[Đề xuất]** |

### 1.2 Cấu trúc thư mục `server/` **[Đề xuất]**
```
server/
  src/
    app.js              # tạo Express app (middleware, routes)
    server.js           # connect DB + listen
    config/             # env, db, swagger
    middlewares/        # auth, validate, errorHandler, notFound
    modules/
      buyer/            # module của tôi
        address/        # *.model.js, *.routes.js, *.controller.js, *.service.js, *.validation.js
        saved/
        order/
        offer/
        question/
        review/
        chat/
        notification/
        report/
      shared/           # model dùng chung (User, Post, Job) — chỉ sửa khi nhóm đồng ý
    utils/              # ApiError, asyncHandler, pagination
    seeds/
  .env.example
```
Mỗi module tách `routes → controller → service → model`: controller không chứa logic nghiệp vụ.

### 1.3 Cấu trúc `client/src/app/` **[Đề xuất]**
`core/` (interceptor, guard, `ApiService`, `AuthService`), `models/` (interface), `services/`, `features/<tên>/` (lazy loading theo route), `shared/` (component dùng chung). Cờ `useMock` trong `environment`.

### 1.4 Quy ước đặt tên **[Đề xuất]**
- Code (biến, field, endpoint, collection): tiếng Anh. Tài liệu và thông báo lỗi hiển thị: tiếng Việt.
- File BE: `kebab-case` + hậu tố vai trò (`offer.model.js`). Class/Model: `PascalCase`, collection số nhiều (`offers`). Field: `camelCase`.
- Endpoint: danh từ số nhiều, `kebab-case`; hành động không CRUD dùng `POST /resource/:id/<action>` (vd. `/offers/:id/withdraw`).
- Enum giá trị: chữ thường, gạch dưới (`not_received`); trạng thái dùng đúng tên ở Mục 2.
- Git: nhánh `ten/tinh-nang`, gộp bằng Pull Request vào `main`.
- Mã đơn hiển thị: `AG-O####` (đơn mua), `AG-J####` (việc) — sinh ở server, khác `_id`.

### 1.5 Quy ước API
Định dạng response/lỗi/mã lỗi/phân trang: xem `api-buyer-job.md` Mục 0. **[Đề xuất]**

### 1.6 Quy tắc nghiệp vụ lấy từ thiết kế hiện tại (CLAUDE.md, user-flows)
- **Gửi đề nghị ≠ đã nhận việc.** Người đăng việc là bên chọn người. **[Đã chốt]**
- **Địa chỉ chính xác của việc chỉ lộ từ bước `chosen`.** Trước đó chỉ có khu/block. **[Đã chốt]**
- **Trả công trực tiếp** giữa hai bên (tiền mặt/chuyển khoản); hệ thống không giữ tiền. Người nhận việc bấm "Đã nhận tiền công". **[Đã chốt]**
- Phương thức thanh toán đơn mua chỉ có `cash` / `transfer`. **[Đã chốt]**
- **Hỏi đáp công khai** chặn số điện thoại (≥ 9 chữ số); người dùng vẫn nhắn riêng được bất cứ lúc nào. **[Đã chốt]**
- Hủy/trả hàng chỉ là **yêu cầu**, không tự hủy hay hoàn tiền. **[Đã chốt]**
- Xin hủy việc phải chọn lý do. **[Đã chốt]**
- Dữ liệu mẫu (đơn, đánh giá, tin nhắn…) được phép để minh họa đồ án; seed tạo sẵn ở `server/src/seeds`. *(Đã bỏ quy tắc "không số liệu giả" ngày 18/10 theo Khải.)* **[Đã chốt]**
- Tổng tiền đơn **tính ở server**; đơn lưu snapshot giá/tên bài lúc đặt. **[Đề xuất]**
- `Order.code` và `Offer` có `history` (mảng `{state, at}`) để FE hiện ngày giờ dưới từng bước. **[Đề xuất]**

## 2. Trạng thái đề nghị nhận việc (`Offer.state`)

**[Đã chốt]** (theo bản mẫu `orders.html`; cách thực thi ở server là **[Đề xuất]**)

```
offered ──(người đăng chọn mình)──▶ chosen ──(Bắt đầu làm)──▶ working ──(Báo hoàn thành)──▶ reported ──(chủ việc xác nhận | tự động sau 24h)──▶ done
   │                                  │                           │
   ├─(chọn người khác)─▶ rejected     └──(Xin hủy)──▶ cancelled ◀─┘
   └─(Rút đề nghị)────▶ withdrawn
```

| Trạng thái | Ai chuyển | Hành động của người nhận việc |
|---|---|---|
| `offered` | Người nhận gửi | Sửa lời giới thiệu · Rút đề nghị |
| `chosen` | Người đăng việc | Bắt đầu làm · Xin hủy (chọn lý do) · thấy địa chỉ chính xác |
| `working` | Người nhận | Báo hoàn thành (ghi chú bắt buộc, ảnh ≤ 4) · Xin hủy |
| `reported` | Người nhận | Chờ; tự `done` sau 24 giờ nếu chủ việc không phản hồi |
| `done` | Người đăng / hệ thống | Xác nhận đã nhận tiền công → Đánh giá người đăng |
| `rejected`, `withdrawn`, `cancelled` | — | Trạng thái cuối; chỉ xem lại / tìm việc tương tự |

Ràng buộc: mỗi `(job, worker)` chỉ có **một đề nghị đang hoạt động** (`offered|chosen|working|reported`). Chuyển sai trạng thái → 409 `INVALID_STATE`. Mỗi lần chuyển ghi `history`.
Khi một người được `chosen` và việc đủ `slots`: các đề nghị `offered` còn lại tự chuyển `rejected` và `Job.status = closed` (số người cần > 1 → **[Q4]**).

Trạng thái `Job`: `open` (kèm `offerCount`) → `closed` (đã có người nhận) → `done`/`cancelled` (phía Đăng việc quyết định).

Trạng thái `Order` (đơn mua) — **bản thử, chưa chốt (Q6):** `waiting → confirmed → preparing → delivering|ready → done`; nhánh `cancelled`, `declined`.

## 3. Câu hỏi mở — hỏi nhóm

### Cần trả lời trước Phase 2.5 (Đề nghị nhận việc) và Phase 3.1 (interface + service FE)

Hai phần này dựa vào schema chung nên **Q1–Q8** nên được chốt trước.

| # | Câu hỏi | Vì sao cần | Chặn |
|---|---|---|---|
| **Q1** | Ai làm **User + Auth** (đăng ký, đăng nhập, JWT, middleware `auth`, phân quyền)? Một `User` dùng cho cả Mua và Bán hay tách hai loại? Field tối thiểu của `User`? | Mọi endpoint 🔒 cần `req.user`; `Offer.worker`, `Order.buyer` trỏ tới `User` | 2.0, 2.5, 3.1, 3.3 |
| **Q2** | Schema chung của **`Post`** và **`Order`**: ai sở hữu file model, tên field của 7 khối (giá, số lượng, thời gian, địa điểm, tùy chọn, câu hỏi riêng, tình trạng bán)? Đơn mua dùng **một** collection `orders` cho cả hai phía? | Tôi tạo `Order`, bên Bán đọc/cập nhật cùng bản ghi; tránh hai model trùng | 2.3, 2.4, 3.1 |
| **Q3** | Bên Đăng việc có làm các endpoint: tạo `Job`, **chọn người** (`choose`), **trả lời Hỏi đáp**, đóng việc không? Đường dẫn và tên field `Job` (`pay`, `slots`, `workTime`, `exactAddress`, `status`) là gì? | Offer tham chiếu `Job`; tôi cần biết `slots`/`status` để kiểm tra khi gửi đề nghị | 2.5, 2.6 |
| **Q4** | Việc **cần nhiều người** (`slots` > 1) xử lý thế nào? Ai bấm **xác nhận hoàn thành** (`reported → done`) và **"đã nhận tiền công"** — chủ việc, người nhận, hay cả hai? **Tự hoàn thành sau 24 giờ** thực thi bằng cron/job nền hay tính lúc đọc? | Quyết định logic máy trạng thái và có cần job nền | 2.5 |
| **Q5** | Có cho người nhận **đề xuất tiền công khác** trong đề nghị (kiểu Airtasker) không? Nếu có, tiền công trong Đơn hàng lấy theo giá được chấp nhận. | Thêm field `price` vào `Offer` và `Job`; đổi cả phía Đăng việc | 2.5, 3.1 |
| **Q6** | Chốt **bộ trạng thái Đơn đã đặt** và quy tắc **hủy / trả hàng / hoàn tiền / phụ thu** (chỉ hàng hóa được trả? hủy sau xác nhận thì sao? đồng ý phụ thu cho dịch vụ giao nhận hộ?) | Hiện mockup chưa chốt, ảnh hưởng enum `Order.state` và endpoint mục 5 | 2.4, 3.1 |
| **Q7** | Tin nhắn/thông báo **realtime** (WebSocket/Socket.IO) hay chỉ polling? Ai tạo `Notification` khi sự kiện xảy ra (mỗi module tự tạo hay có service chung)? | Quyết định cấu trúc service chat/thông báo | 2.8, 3.4 |
| **Q8** | Tìm kiếm: một endpoint `/search` gộp bài + việc hay hai endpoint `/posts`, `/jobs` riêng? Khu vực lưu dạng chuỗi `A–D` hay có model `Area`? Thông tin "khoảng cách" lấy ở đâu? | Interface FE cho danh sách/lọc | 2.3, 3.1 |

### Các câu hỏi khác (không chặn hai phần trên)
- **Q9** Xác nhận lại FE là **Angular** (repo đang có `client/` Angular 22) và phiên bản Node/MongoDB cả nhóm dùng (Atlas hay local)?
- **Q10** Upload ảnh (đánh giá, báo cáo, báo hoàn thành): lưu local `uploads/` bằng `multer` hay dịch vụ ngoài? Ai viết middleware upload?
- **Q11** AntXu / voucher: ai sở hữu `Voucher` và số dư Xu? Module này chỉ cần **áp** voucher khi đặt đơn — tính giảm giá ở đâu?
- **Q12** `Review` dùng chung cho đơn mua và việc, hay tách? Có cho người bán/người đăng việc đánh giá ngược lại không (bản mẫu chỉ có chiều người nhận việc đánh giá người đăng)?
- **Q13** Ngôn ngữ thông báo lỗi trả về: tiếng Việt hay mã lỗi để FE tự dịch?
- **Q14** Báo cáo vấn đề (`Report`): Admin cần field nào để xử lý, và trạng thái xử lý gồm những bước nào?


---

## 4. Đề xuất của Planning ngày 18/10 (bám bài dạy) — cần nhóm chốt

### [18/10] D1 — Xác thực bằng session cookie thay JWT
- Trạng thái: ĐÃ CHỐT
- Người ghi: Planning
- Nội dung: Mục 1.1 ghi JWT, nhưng chương VIII dạy Cookie + Session (`express-session`, `regenerate`, `destroy`) và thầy yêu cầu thể hiện trong đồ án. Đề xuất: session lưu `connect-mongo`, cookie `httpOnly/sameSite/secure`, FE dùng `withCredentials`, guard hỏi `GET /auth/profile`.
- Quyết định: **Dùng session cookie** (`express-session` + `connect-mongo`, cookie `httpOnly`/`sameSite`/`secure` theo môi trường). Khải chốt 18/10: chọn cách tối ưu và có trong bài dạy (chương VIII). BE phải làm lại 2.0 (JWT → session, bước 2.0b); FE gắn `withCredentials` khi BE xong, không lưu token.
- **[BE 18/10] Đã làm theo đề xuất này** (chờ nhóm xác nhận; sai thì sửa theo `api-buyer-job.md` Mục 11–15).

### [18/10] D2 — Upload ảnh dùng `express-fileupload`
- Trạng thái: CẦN CHỐT (thay Q10)
- Người ghi: Planning
- Nội dung: Giống bài dạy; server tự sinh tên file, giới hạn loại + 2 MB, lưu `public/images`.
- Quyết định: (điền khi chốt)
- **[BE 18/10] Đã làm theo đề xuất này** (chờ nhóm xác nhận; sai thì sửa theo `api-buyer-job.md` Mục 11–15).

### [18/10] D3 — Máy học (CO3): gợi ý bài tương tự
- Trạng thái: CẦN CHỐT
- Người ghi: Planning
- Nội dung: Mục tiêu môn học có máy học nhưng chưa có chương. Đề xuất bản nhỏ: content-based (TF-IDF tên+mô tả, loại, giá, khu) cho "Tương tự trong khu" và "Gợi ý cho bạn" (2.14, 3.8). Cần xác nhận thầy chấp nhận mức này.
- Quyết định: (điền khi chốt)
- **[BE 18/10] Đã làm theo đề xuất này** (chờ nhóm xác nhận; sai thì sửa theo `api-buyer-job.md` Mục 11–15).

### [18/10] D4 — Quy ước nhánh Git thống nhất
- Trạng thái: CẦN CHỐT
- Người ghi: Planning
- Nội dung: Mục 1.4 và `README` cũ ghi `ten/tinh-nang` → `main`; `HUONG-DAN-LAM-VIEC.md` và `docs/git-workflow.md` ghi `dev` mặc định, `feature/be-*`, `feature/fe-*`. Đề xuất dùng bản sau.
- Quyết định: (điền khi chốt)

### [18/10] D5 — Cấu trúc `client/` thực tế
- Trạng thái: CẦN CHỐT
- Người ghi: Planning
- Nội dung: Mục 1.3 đề xuất `models/ services/ features/`; khung đã dựng dùng `core/{models,services,guards,utils,layout}`, `shared/`, `features/` (NgModule, lazy). Đề xuất coi cấu trúc đã dựng là chính thức; đường dẫn tiếng Anh (`/posts/:slug`, `/search`).
- Quyết định: (điền khi chốt)

### [18/10] Q0 — Quyền ghi repo
- Trạng thái: CẦN CHỐT
- Người ghi: Planning
- Nội dung: `KhaiNgo2811` chỉ có quyền đọc `nhutthuy140106/261BIE503102_WebNC_Group1` (push bị 403). Nhờ chủ repo mời quyền Write, rồi tạo `dev` mặc định.
- Quyết định: (điền khi chốt)

### [18/10] D6 — Vai trò `admin` / `enduser` và tên database
- Trạng thái: ĐÃ CHỐT
- Người ghi: Planning (theo yêu cầu của Khải)
- Nội dung: (1) `User.role` ∈ `enduser | admin` (client đang dùng `user | admin` → FE đổi theo, planning 3.10). Đăng ký công khai luôn là `enduser`; admin tạo bằng seed. (2) Thêm endpoint admin 2.16–2.18; `User.status` (`active|locked`), `Post.status` có `hidden`, `Report.status` gồm `open|reviewing|resolved|rejected` (liên quan Q14). (3) Database là **`DoAnWeb`** trên `mongodb://127.0.0.1:27017`; collection trống `BackendWeb` trong Compass chỉ là chỗ thử, xóa khi Mongoose đã tự tạo collection theo model. (4) Ai làm Admin: terminal BE hiện tại hay thành viên khác? (đụng Q1, Q3).
- Quyết định: **Giữ `user | admin`** (không đổi thành `enduser`); database **`DoAnWeb`**. Khải chốt 18/10. Các chỗ trong planning/hợp đồng ghi `enduser` đã đổi thành `user`. Vẫn cần xác nhận phần (2) endpoint admin 2.16–2.18 và (4) ai làm Admin.
- **[BE 18/10] Đã làm theo đề xuất này** (chờ nhóm xác nhận; sai thì sửa theo `api-buyer-job.md` Mục 11–15).

---

## 5. CẦN CHỐT do phiên FE ghi (18/10)

### [18/10] F1 — Mô hình `Post` ở FE lệch hợp đồng API
- Trạng thái: CẦN CHỐT
- Người ghi: FE
- Nội dung: Khung FE có sẵn dùng `kind` / `block` / `price` / `sellerName` / `job.{due,offers,status}`, còn `api-buyer-job.md` mục 4 dùng `type` / `area` / `pay` / `poster{_id,name}` / `status` / `offerCount`; Việc làm trong hợp đồng là `Job` riêng (`/jobs`), FE đang coi là `Post.kind = 'job'` (`/posts`). Ngoài ra `Post` chưa có 7 khối (tùy chọn cộng giá, câu hỏi riêng, tình trạng bán) nên đặt hàng ở FE mới có số lượng, giao/tự lấy, giờ, ghi chú, thanh toán; **chưa có chọn size/topping và voucher Xu** (Q2, Q11).
- Đề xuất: Planning/BE chốt tên field. FE sẽ đổi interface theo hợp đồng khi chốt; hiện giữ nguyên để mock chạy.
- Quyết định: (điền khi chốt)

### [18/10] F2 — Việc đã nhận gộp vào danh sách Đơn hàng thế nào
- Trạng thái: CẦN CHỐT
- Người ghi: FE
- Nội dung: Hợp đồng tách `GET /orders` (đơn đã đặt) và `GET /offers` (việc đã nhận). FE gộp hai nguồn thành một danh sách `Order` (`offerToOrder`) và gọi cả hai khi mở trang Đơn hàng. Nếu BE muốn một endpoint gộp (`GET /me/orders`) thì báo để FE đổi.
- Quyết định: (điền khi chốt)

### [18/10] F3 — Địa chỉ: hợp đồng dùng `block` A–D, `unit`; `User.block` ở FE là "Block B"
- Trạng thái: CẦN CHỐT
- Người ghi: FE
- Nội dung: `Address` ở FE đã đổi theo hợp đồng (`_id`, `name`, `unit`, `block ∈ A–D`, `label ∈ home|family|other`). `User.block` và `Post.block` vẫn là chuỗi "Block B". Cần thống nhất một dạng cho `area`/`block` (Q8).
- Quyết định: (điền khi chốt)

### [18/10] F4 — Giỏ hàng bỏ qua ở luồng đặt hàng mock
- Trạng thái: CẦN CHỐT
- Người ghi: FE
- Nội dung: Bản FE đặt hàng 2 bước gọi thẳng `POST /orders` (một bài một đơn), không qua `/cart` + `/cart/checkout` ở mục 11. `CartService` còn đó nhưng chưa dùng. Cho biết có cần giỏ nhiều món không, hay giữ "một bài một đơn" như mockup.
- Quyết định: (điền khi chốt)

## 4. Giả định đã dùng khi làm BE (chờ nhóm xác nhận — sai thì sửa ở đúng chỗ ghi bên cạnh)

| Câu hỏi | Giả định trong code | Sửa ở đâu |
|---|---|---|
| Q1 | Mình làm Auth. **Một** `User` cho cả Mua và Bán, đăng nhập bằng **SĐT + mật khẩu**, `role`: `user`/`admin` | `modules/auth`, `shared/user.model.js` |
| Q2 | `Post`, `Job` có bản tối thiểu ở `modules/shared` để đọc/đặt đơn; **một** collection `orders` cho cả hai phía | `shared/post.model.js`, `order.model.js` |
| Q3 | Số người cần của `Job` đặt tên `headcount` (tránh trùng `slots` của Offer). Chọn người / trả lời hỏi đáp làm tạm ở `/api/dev` | `shared/job.model.js`, `modules/dev` |
| Q4 | `headcount` > 1: đủ người được chọn thì đóng việc và các đề nghị `offered` còn lại thành `rejected`. Chủ việc bấm `reported → done`; **tự hoàn thành sau 24 giờ tính lúc đọc**, không cần cron. Người nhận bấm "đã nhận tiền công" ở `done` | `offer.service.js` |
| Q5 | **Chưa** làm đề nghị kèm giá | — |
| Q6 | Trạng thái đơn bản thử `waiting → confirmed → preparing → delivering|ready → done` + `cancelled`/`declined`. Hủy chỉ khi `waiting|confirmed|preparing`; trả hàng chỉ đồ dùng, đơn `done`, trong 7 ngày; phụ thu do người bán báo, người mua đồng ý | `order.model.js`, `order.service.js` |
| Q7 | Polling, chưa realtime. `notify()` là service chung, module nào có sự kiện thì gọi | `shared/notify.js` |
| Q8 | Có cả `/posts`, `/jobs` và `/search` (gộp). Khu vực là chuỗi (`A`–`D`, `Shop 5`); khoảng cách là field `distance` (mét) lưu sẵn trên bài | `catalog.service.js` |
| Q11 | Voucher tạm cứng trong code (`XU10`, `XU5`), chỉ áp cho bài `acceptsXu` | `VOUCHERS` ở `order.service.js` |
| Q12 | Một `Review` cho cả đơn mua (`order`) và việc (`offer`); chỉ chiều người mua/người nhận việc → người bán/người đăng | `review.routes.js` |
| Q13 | Thông báo lỗi tiếng Việt kèm `code` cố định để FE tự dịch nếu muốn | — |
| Q10 | Chưa upload ảnh: `images` chỉ nhận mảng URL/đường dẫn chuỗi | — |

---

## 6. CẦN CHỐT do phiên FE ghi (18/10, đợt 2 — phía Bán, phụ thu, Xu)

### [18/10] F5 — Endpoint phía Bán & Đăng việc chưa có trong hợp đồng
- Trạng thái: CẦN CHỐT
- Người ghi: FE
- Nội dung: FE đã dựng khu `/seller` (tổng quan, bài của tôi, form đăng/sửa, giao dịch) bằng mock. `SellerService` đang dùng đường dẫn **đề xuất**: `GET/POST /seller/posts`, `PUT/PATCH/DELETE /seller/posts/:id`, `GET /seller/orders`, `POST /seller/orders/:id/<action>` (`confirm|prepare|deliver|complete|decline|approveCancel`), `GET /seller/offers`, `POST /seller/offers/:id/<action>` (`choose|reject|confirmDone`). Cần Planning/phiên Bán chốt đường dẫn thật hoặc báo để FE đổi. Ghi chú: `GET /seller/offers` trả `Offer` kèm `workerName`.
- Quyết định: (điền khi chốt)

### [18/10] F6 — Từ chối đơn của người bán dùng trạng thái `cancelled`
- Trạng thái: CẦN CHỐT (liên quan Q6)
- Người ghi: FE
- Nội dung: `PlacedStatus` ở FE chưa có `declined` như `api-buyer-job.md` mục 5 nên "Từ chối" đi tới `cancelled`. Nếu BE có `declined` riêng thì thêm vào `PlacedStatus` + nhãn.
- Quyết định: (điền khi chốt)

### [18/10] F7 — Phụ thu: ai tạo, lưu thế nào
- Trạng thái: CẦN CHỐT (Q6)
- Người ghi: FE
- Nội dung: FE đã có phía người mua: đơn có `surcharge { amount, reason, state: pending|approved|declined }`, nút **Đồng ý / Không đồng ý** gọi `POST /orders/:id/approve-surcharge { approve: boolean }` (hợp đồng chỉ ghi "đồng ý" — cần thêm trường `approve` hoặc endpoint từ chối). **Chưa có nút "Báo phụ thu" phía người bán** vì chưa rõ: chỉ dịch vụ hay cả đồ ăn, báo ở bước nào, có trần số tiền không, từ chối thì xử lý ra sao.
- Quyết định: (điền khi chốt)

### [18/10] F8 — Ngăn kéo AntXu chỉ hiện số dư
- Trạng thái: CẦN CHỐT (Q11)
- Người ghi: FE
- Nội dung: Chưa có quy tắc nhận/đổi Xu và danh sách voucher nên ngăn kéo chỉ hiện số dư (`User.xu`) và hướng dẫn nơi dùng. Ở bước xác nhận đơn, bài `acceptsXu` có ô nhập mã voucher, gửi `voucherCode` lên `POST /orders`; BE (giả định `XU10`, `XU5`) kiểm tra. Cần: API số dư/lịch sử Xu, danh sách voucher, cách đổi.
- Quyết định: (điền khi chốt)

---

## 7. CẦN CHỐT do phiên BE ghi (18/10)

### [18/10] B1 — Đơn trả `seller`/`buyer` là id; avatar nằm trong `snapshot.sellerAvatar`
- Trạng thái: CẦN CHỐT
- Người ghi: BE
- Nội dung: Để không đổi hợp đồng, BE giữ `Order.seller`/`buyer` là ObjectId và chỉ **thêm** `snapshot.sellerAvatar` (chụp lúc đặt, `null` nếu chưa có). Hệ quả: nếu người bán đổi ảnh sau đó thì đơn cũ vẫn hiện ảnh cũ; và đơn chưa trả avatar của **người mua** (phía Bán cần, F5). Đề xuất: trả thêm `seller` và `buyer` dạng `UserSummary { _id, name, avatar, area }` (populate khi đọc) — FE đang đọc id thì phải đổi. Ngoài ra chưa có `PATCH /me` để người dùng tự đổi `avatar`/`name`.
- Quyết định: (điền khi chốt)

### [18/10] B2 — Mỗi bài 2–3 ảnh (planning 5.8) và avatar người dùng thật
- Trạng thái: CẦN CHỐT
- Người ghi: BE
- Nội dung: `Post.images` đã là mảng nhưng seed mới có **1 ảnh/bài**; chưa bổ sung theo 5.8 vì ngoài phạm vi 2.19 (cần chọn ảnh Unsplash đúng chủ đề cho 25 bài). Ghi 2.19 sang việc riêng nếu nhóm muốn BE làm. Avatar mẫu dùng ảnh người nước ngoài từ Unsplash, chỉ để minh họa; người dùng đăng ký thật có `avatar: null`.
- Quyết định: (điền khi chốt)

### [18/10] B3 — Phụ thu: FE (F7) và BE đang lệch hợp đồng
- Trạng thái: CẦN CHỐT (Q6, F7)
- Người ghi: BE
- Nội dung: BE đang có `surcharge { amount, reason, status: pending|approved }` và `POST /orders/:id/approve-surcharge` **không body**. F7 mô tả FE dùng `surcharge.state` có thêm `declined` và body `{ approve: boolean }`. Chưa sửa vì không thuộc 2.19; cần chốt một bên rồi BE sửa theo.
- Quyết định: (điền khi chốt)

### [18/10] F9 — FE đã gắn API thật; các chỗ lệch hợp đồng được chuyển đổi ở FE
- Trạng thái: CẦN CHỐT (Planning/BE xác nhận)
- Người ghi: FE
- Nội dung: `USE_MOCK = false` (trừ khu Bán). FE đăng nhập/đăng ký bằng **SĐT** (`phone`, `name`) đúng BE, bỏ `username`. Lớp `api-mappers.ts` đổi `type→kind`, `seller/poster→sellerName/sellerAvatar/sellerId`, `unit→priceUnit`, `pay/desc→price/description`, `area "B"→"Block B"`, `Order.snapshot→postTitle/image/counterpart*`, đơn `waiting→pending`, `Offer.job` lồng, v.v. Nếu BE đổi tên field thì sửa một chỗ này. Điểm cần BE/Planning xác nhận: (1) `User` không có `xu` → ẩn nút Xu ở header; (2) `Post` không có `promoted`/`rating`/`reviewCount` nên "Nổi bật trong khu" trống và gian hàng không có điểm ★; (3) API chỉ có **đồng ý** phụ thu, không có từ chối (F7) → nút "Không đồng ý" chỉ hiện ở mock; (4) `Message` không kèm tên người gửi, FE dùng `sender === mình`.
- Quyết định: (điền khi chốt)
