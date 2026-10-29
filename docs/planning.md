# Kế hoạch — module Người mua + Nhận việc (BE ‖ FE song song)

> Phạm vi: **hai loại người dùng — `user` (Người mua + Nhận việc; phía Bán/Đăng việc do thành viên khác phụ trách) và `admin` (quản trị)**. Kế hoạch có đủ cả hai vai trò (xem "Vai trò & phân quyền"); phần Bán chỉ ghi ranh giới để **không trùng endpoint và model** (xem `decisions.md`).
> Cách phối hợp 3 phiên (Planning / BE / FE): `HUONG-DAN-LAM-VIEC.md`. Hợp đồng API: `api-buyer-job.md`. Quyết định + câu hỏi mở: `decisions.md`.
> Bám đúng bài dạy: `docs/tham-khao/kien-thuc-mon-hoc-angular-express-mongodb.md` (viết tắt **KT**, kèm mục/chương). Cập nhật: 29/10/2026 (Planning: thêm **Phase 7** — AI/ML, theo dõi đơn, Vườn AntGo, lấp lỗ hổng môn học).
>
> **Quy ước thẻ:** `[BE]` = terminal BE, chỉ sửa `server/` · `[FE]` = terminal FE, chỉ sửa `client/` · `[PL]` = Planning/nhóm chốt, ghi vào `docs/`. Mỗi bước nhỏ, có "Xong khi" kiểm tra được; xong thì đổi `[ ]` → `[x]`. **Số thứ tự Phase/bước giữ nguyên** để `decisions.md` và `api-buyer-job.md` còn tham chiếu đúng.

## Việc đang làm / tiếp theo (mỗi terminal một dòng)

| Terminal | Đang làm | Tiếp theo |
|---|---|---|
| **BE** | Xong Phase 7A (7.1 → 7.6). Đang làm thêm (29/10): server cộng Xu khi xong đơn/việc/đánh giá + dùng mã `XU-…` ở `POST /orders` + test rate limit (xong, chờ push). | Chờ chốt F10 (hết hạn Xu 6 tháng, luật cộng Xu) |
| **FE** | Xong giao diện trang chính + chatbot, skeleton, bản đồ theo dõi, Vườn AntGo/Hái xu (commit `8a5f959`, `77669b6`). | **Phase 7B: 7.7 → 7.11** (bản đồ cho mọi đơn giao + "Cách bạn X km", làm đẹp + 2 game còn lại, lấp lỗ hổng môn học, `/admin`) |
| **PL / nhóm** | Phase 7 (29/10) | 7.12–7.14 · F1–F4 · **0.6/Q0** quyền ghi repo |

## Trạng thái hiện tại

- [x] Repo: `client/` (Angular **22**, NgModule `--no-standalone`, lazy loading, Vitest), `server/` (mới có README), `docs/`, `design/mockups/` (bản mẫu HTML — chỉ để tham khảo hành vi/dữ liệu).
- [x] **FE khung đã dựng** (nhánh `feature/angular-setup`, **chưa push được** — xem 0.6): 9 feature module tải lười (`home, search, posts, orders, messenger, notifications, profile, auth, seller`), `authGuard` + `pendingChangesGuard`, `slug-helper` (sửa chữ "đ", có test), `PostService/OrderService/AuthService/CartService/SavedService` có `retry(3)+catchError`, Reactive Form (đăng nhập, đăng ký có validator chéo, đề nghị nhận việc, đăng bài), `proxy.conf.json`, dữ liệu mẫu `client/public/datasets/`, cờ `USE_MOCK`. Giao diện chỉ là khung chức năng.
- [x] **BE đã dựng** (`server/`, Express 5 + Mongoose 9 + Zod + Swagger `/api-docs`, chạy `npm run dev` cổng 3000): auth, địa chỉ, đã lưu, catalog/tìm kiếm, đơn, đề nghị nhận việc, hỏi đáp, đánh giá, chat, thông báo, báo cáo; `npm run seed` nạp `DoAnWeb`. **Lệch bài dạy:** auth đang trả **JWT trong body** (`jsonwebtoken`), chưa dùng `express-session` + cookie `httpOnly` → đã chốt đổi sang session (**2.0b**); chưa có cart/upload/gợi ý/admin.
- [ ] Chưa chốt schema chung với nhóm (User, Post, Job, Order) — Q1–Q8, D1–D6, F1–F4 còn **CẦN CHỐT** ở `decisions.md`.
- [x] Không cần chờ Figma: **mockup `design/mockups/` là bản thiết kế đã duyệt** — FE chuyển giao diện từ đó (Phase 5). Trang chủ đã xong.
- [ ] Chưa push được lên GitHub (tài khoản `KhaiNgo2811` chỉ có quyền đọc repo `nhutthuy140106/…`).

## Vai trò & phân quyền (`admin` và `user`)
  
Một collection `users`, trường `role`. Quyền thật **do server kiểm tra** (`requireAuth` → `requireRole`); FE chỉ ẩn/hiện cho dễ dùng (KT 5.8, 9.3).

| Việc | Khách (chưa đăng nhập) | `user` | `admin` |
|---|---|---|---|
| Xem trang chủ, tìm kiếm, chi tiết bài/việc, nháp đơn trong session | ✔ | ✔ | ✔ |
| Đăng ký / đăng nhập | ✔ | — | — |
| Đặt đơn, đề nghị nhận việc, hỏi đáp, đánh giá, nhắn tin, địa chỉ, bài đã lưu, báo cáo vấn đề | ✘ (401) | ✔ **chỉ trên dữ liệu của mình** (403 nếu của người khác) | ✔ chỉ xem |
| Đăng bài / đăng việc, xác nhận đơn, chọn người làm (không gian Bán) | ✘ | ✔ (phía Bán — thành viên khác) | ✔ |
| `/admin/**`: người dùng, kiểm duyệt bài, báo cáo, thống kê | ✘ (401) | ✘ (**403**) | ✔ |
| Khóa tài khoản, gỡ bài vi phạm, xử lý báo cáo | ✘ | ✘ | ✔ (có `auditLog`) |

Quy tắc: `role` mặc định `user`; chỉ seed hoặc admin tạo được `admin`; client không bao giờ gửi `role`. Người vừa mua vừa bán vẫn là **một** `user` (công tắc Mua | Bán chỉ là giao diện).

## Đối chiếu với bài dạy — cái nào dùng, cái nào chỉnh

| Chủ đề | Bài dạy (KT) | Kế hoạch trước | Quyết định trong kế hoạch này |
|---|---|---|---|
| Xác thực | Cookie + **Session** (`express-session`, `connect.sid`, `regenerate`/`destroy`), mục 9 | JWT + `Authorization: Bearer` | **Đổi sang session cookie** (đã chốt) (**D1 đã chốt 18/10**): đúng chương VIII; thầy yêu cầu thể hiện cookie/session. FE dùng `withCredentials`, không có token trong `localStorage` |
| Mật khẩu | "Cần mã hóa" (mở rộng chương VIII); KT 9.3 | `bcryptjs` | Giữ `bcrypt`/`bcryptjs`; ép `username/password` về **string** trước khi truy vấn (chặn NoSQL injection) |
| CSDL | `mongodb` driver + `ObjectId`; có cài `mongoose` | Mongoose | Giữ **Mongoose** (schema, validate); id luôn là `ObjectId`, kiểm `ObjectId.isValid` → 400 |
| Upload ảnh | `express-fileupload`, Base64 trong demo | `multer` (Q10) | Đề xuất **D2**: `express-fileupload`; **server tự sinh tên file**, giới hạn loại/kích thước, lưu `public/images` (KT 9.3) |
| CORS | `origin: http://localhost:4200` + `credentials: true` | `cors` | Giới hạn origin + credentials (không `cors()` mở toang) |
| Swagger | Không có trong slide | Bắt buộc mọi endpoint | **Giữ** (nhóm đã chốt) — phần cộng thêm, không thay Postman |
| Máy học (CO3) | Mục tiêu môn học, chưa có chương | Không có | **Thêm** gợi ý bài tương tự / "Gợi ý cho bạn" (2.14, 3.8) — đề xuất **D3** |
| Route & URL | `:id`, **slug SEO**, query params, `**` cuối, nested, lazy, Guard (CanActivate/CanDeactivate/CanMatch) | Có một phần | Slug `ten-bai-<ObjectId>`; đường dẫn tiếng Anh (`/posts/:slug`, `/search?...`) thay cho `/bai/:id` cũ |
| Giỏ hàng tạm | Session `req.session.cart` → checkout ghi `Orders` | Không có | **Thêm** nháp đơn bằng session (2.12) khớp "đặt hàng 2 bước" |
| Nhánh Git | — | `ten/tinh-nang` → `main` | **`dev` mặc định**, `feature/be-*`, `feature/fe-*`, `main` = bản nộp (khớp `HUONG-DAN-LAM-VIEC.md`, `docs/git-workflow.md`) |

---

## Phase 0 — Chuẩn bị

- [x] **0.1 [BE] Khởi tạo `server/`:** `npm init`; cài `express`, `mongoose`, `dotenv`, `cors`, `morgan`, `cookie-parser`, `express-session`, `connect-mongo`, `bcryptjs`, `express-fileupload`, `helmet`, `express-rate-limit`, `swagger-ui-express`, `swagger-jsdoc`; dev: `nodemon`. Cấu trúc thư mục theo `decisions.md` Mục 1.2; `npm run dev` = nodemon (KT 7.3).
  *Xong khi:* `npm run dev` chạy cổng **3000**, `GET /api/health` trả `{ "data": { "ok": true } }`, log request bằng `morgan`.
- [x] **0.2 [BE] Kết nối MongoDB** (Mongoose). Máy cả nhóm dùng **MongoDB local + Compass**: `localhost:27017` (dùng `127.0.0.1` nếu lỗi), **database `DoAnWeb`** (đã tạo, khác `FashionData` của bài tập trên lớp). `.env.example`: `MONGODB_URI=mongodb://127.0.0.1:27017/DoAnWeb`, `SESSION_SECRET`, `CLIENT_ORIGIN=http://localhost:4200`; `.env` nằm trong `.gitignore`. Collection **do Mongoose tự tạo theo model** (`users`, `posts`, `orders`…); collection trống `BackendWeb` đang có trong DB chỉ là chỗ thử, **không dùng** — xóa khi chốt (D6).
  *Xong khi:* log "Mongo connected: DoAnWeb"; DB tắt thì báo lỗi rõ, không treo; `SESSION_SECRET` không viết cứng trong code.
- [x] **0.3 [BE] Middleware nền:** `errorHandler` (định dạng lỗi chung, không lộ `err.message` nội bộ — KT 9.3), `notFound`, `validate` (**whitelist** field, kiểm kiểu/độ dài), `validateObjectId`, `asyncHandler`, `requireAuth`, `requireRole`.
  *Xong khi:* route lạ trả 404 đúng định dạng; id sai trả 400; ném lỗi trong route trả 500 chung chung; body có field thừa bị bỏ qua.
- [x] **0.4 [BE] Swagger nền:** `/api-docs`, `securitySchemes` dạng **cookie session** (`connect.sid`), mỗi module một tag.
  *Xong khi:* mở `/api-docs` thấy `health`.
- [ ] **0.5 [PL] Thống nhất schema chung với nhóm** (User, Post, Job, Order — `decisions.md` Mục 3, Q1–Q8) và 5 đề xuất mới **D1–D5**. Ghi kết quả vào `decisions.md`.
  *Xong khi:* mỗi model dùng chung có tên collection + field + người sở hữu; D1–D5 có "ĐÃ CHỐT" hoặc bị từ chối.
- [ ] **0.6 [PL] Quy ước Git + quyền ghi:** chủ repo mời `KhaiNgo2811` quyền **Write** (hoặc dùng tài khoản đúng); tạo `dev` làm **nhánh mặc định**; phiên làm trên `feature/be-*` / `feature/fe-*` (dùng `git worktree` khi chạy 2 terminal — `HUONG-DAN-LAM-VIEC.md` mục 5); PR vào `dev`.
  *Xong khi:* `git push` từ máy Khải thành công; `dev` là default; nhánh `feature/angular-setup` đã mở PR.
- [ ] **0.7 [FE] Hoàn tất khung client:** push khung Angular (đã dựng), thêm `client/README` hướng dẫn chạy, mục tiêu `npm run build` + `npm test -- --no-watch` qua trước mỗi PR.
  *Xong khi:* PR `feature/angular-setup → dev` được merge; CI/local build xanh.

## Phase 1 — Hợp đồng API *(chủ yếu [PL]; BE/FE chỉ đọc, góp ý qua `CẦN CHỐT`)*

- [ ] **1.1 [PL] Rà `api-buyer-job.md` với dữ liệu mẫu** trong `design/mockups/` (`antgo_orders`, `antgo_saved`, `antgo_addresses`, `antgo_qa_*`): mỗi field mockup có chỗ trong schema hoặc ghi "bỏ".
  *Xong khi:* không còn field mẫu "mồ côi".
- [ ] **1.2 [PL] Chốt định dạng chung:** response thành công/lỗi, phân trang (`page`, `limit`), sắp xếp (`sort`), mã lỗi. **Xác thực bằng session cookie** (đã sửa Mục 0 của `api-buyer-job.md` ngày 18/10, chờ D1).
  *Xong khi:* Mục 0 của `api-buyer-job.md` khớp với nhóm.
- [ ] **1.3 [PL] Chốt ranh giới endpoint với Bán/Admin** (đăng bài, chọn người làm, xác nhận đơn…).
  *Xong khi:* bảng 0.1 trong `api-buyer-job.md` được nhóm đồng ý (tin nhắn xác nhận là đủ).
- [x] **1.4 [BE] Bộ request mẫu** (file `.http` hoặc collection Postman, KT mục 1: dùng Postman) cho mọi endpoint, gồm cả luồng đăng nhập có cookie.
  *Xong khi:* đủ request khớp tài liệu; FE đọc vào hiểu được hợp đồng.

## Phase 2 — Backend **[BE]**

> Mỗi bước: model + route + controller/service + Swagger + test bằng bộ request. "Xong" luôn gồm: **happy path đúng, mã lỗi đúng, có Swagger**, và mọi route ghi/đọc dữ liệu riêng tư đều qua `requireAuth` + **kiểm quyền sở hữu** (KT 9.3). Xong endpoint → đổi trạng thái trong `api-buyer-job.md` thành **Xong**.

- [x] **2.0 Auth dùng chung** *(D1 đã chốt: session cookie)*: `POST /auth/register` (bcrypt), `POST /auth/login` (`req.session.regenerate()` rồi gán `req.session.user = { _id, role }` **lấy từ DB**, không nhận `role` từ client), `POST /auth/logout` (`session.destroy` + `clearCookie('connect.sid')`), `GET /auth/profile` (200/401 — FE guard hỏi endpoint này). **Model `User` có `role: 'user' | 'admin'`** (mặc định `user`; đăng ký công khai **luôn** là `user`, không nhận `role` từ client); middleware `requireRole('admin')`. Cookie `httpOnly`, `sameSite:'lax'`, `secure` theo môi trường, `maxAge` 1 giờ; session lưu `connect-mongo`; `express-rate-limit` cho login. Tùy chọn "nhớ tên đăng nhập" chỉ là cookie thường, **không dùng để xác thực** (KT 9.1, 9.3). **[PL 18/10] 2.0b — cần làm lại nếu chốt D1:** hiện là JWT trả trong body; bài dạy chương VIII yêu cầu `express-session` (+ `connect-mongo`) và cookie `httpOnly`, `req.session.regenerate()` khi login, `destroy` + `clearCookie` khi logout, `GET /auth/profile` cho `authGuard`. FE giữ mock auth cho đến khi 2.0b xong, rồi gắn `withCredentials` (4.2).
  *Xong khi:* endpoint 🔒 không cookie trả 401; đăng nhập sai trả 401 chung (không nói sai tên hay mật khẩu); Session ID đổi sau login; NoSQL injection `{"$ne":null}` bị chặn (422).
- [x] **2.1 Địa chỉ của tôi** (`/me/addresses`): CRUD + đặt mặc định.
  *Xong khi:* luôn đúng 1 mặc định; xóa mặc định → 409; SĐT sai → 422; địa chỉ người khác → 403.
- [x] **2.2 Bài đã lưu** (`/me/saved`): thêm, bỏ, danh sách lọc theo loại.
  *Xong khi:* lưu hai lần không trùng (idempotent).
- [x] **2.3 Khám phá & tìm kiếm** (`GET /posts`, `/posts/:id`, `/jobs`, `/jobs/:id`, `/search`): lọc loại, khu vực, khoảng giá, sắp xếp, phân trang; **tìm kiếm tương đối theo tên/mô tả** (bỏ dấu tiếng Việt, escape regex hoặc text index — bài mở rộng chương VII); trả thêm trường `slug` (`createSlug` tên+ObjectId) để FE dựng link; `GET /posts/:slugOrId` nhận cả id lẫn slug-có-id (cùng quy tắc `resolveId` ở FE). *(Chỉ đọc; model `Post` do phía Bán sở hữu.)*
  *Xong khi:* có seed để thử; lọc/sắp xếp/phân trang đúng; `min>max` → 422; id sai → 400, không có → 404; tìm "bun bo" ra "Bún bò".
- [x] **2.4 Đơn đã đặt** (`/orders`): tạo đơn, danh sách của tôi, chi tiết, yêu cầu hủy.
  *Xong khi:* tổng tiền tính **ở server**; đơn lưu snapshot giá/tên bài; hủy sai trạng thái → 409; chỉ chủ đơn xem được (403).
- [x] **2.5 Đề nghị nhận việc** (`/jobs/:id/offers`, `/offers`): gửi, sửa lời giới thiệu, rút, bắt đầu làm, báo hoàn thành, xác nhận đã nhận tiền công, xin hủy. **Phụ thuộc Q3–Q6.**
  *Xong khi:* máy trạng thái (`decisions.md` Mục 2) chặn chuyển sai (409); mỗi người một đề nghị đang hoạt động / việc; địa chỉ chính xác **chỉ** có từ `chosen`; việc đã đóng không gửi thêm được.
- [x] **2.6 Hỏi đáp công khai** (`/jobs/:id/questions`): đăng câu hỏi, danh sách; chặn số điện thoại (≥ 9 chữ số).
  *Xong khi:* câu có SĐT → 422; việc đã có người nhận không đăng thêm được. Nội dung người dùng nhập được lưu nguyên văn, **không** chèn HTML (FE hiển thị bằng interpolation).
- [x] **2.7 Đánh giá** (`/reviews`).
  *Xong khi:* chỉ đánh giá đơn của mình đã hoàn thành; mỗi đơn một lần; điểm trung bình đúng.
- [x] **2.8 Hội thoại & thông báo** (`/conversations`, `/notifications`): danh sách, gửi tin, đánh dấu đã đọc, đếm chưa đọc (polling, Q7).
  *Xong khi:* chỉ thành viên hội thoại đọc/gửi (403 nếu khác); đếm đúng sau khi đánh dấu.
- [x] **2.9 Báo cáo vấn đề** (`POST /reports`).
  *Xong khi:* lưu `open`; người khác không đọc được báo cáo của mình.
- [x] **2.10 Seed data** từ mockup (`client/public/datasets/*.json` là bản đã chuẩn hóa ObjectId).
  *Xong khi:* `npm run seed` chạy lặp lại, không nhân đôi.
- [x] **2.11 Rà Swagger toàn module.**
  *Xong khi:* "Try it out" thành công ≥ 1 request mỗi nhóm.
- [x] **2.12 Nháp đơn bằng session** (`GET/POST /cart`, `DELETE /cart/:postId`, `POST /cart/checkout`) — **mới**, theo kịch bản giỏ hàng chương VIII: khách chưa đăng nhập vẫn chọn món (lưu `req.session.cart`), bấm đặt mà chưa đăng nhập → 401, đăng nhập rồi `checkout` → ghi collection `orders` (tính tiền lại ở server) và xóa `req.session.cart`.
  *Xong khi:* nháp mất khi hết phiên (dữ liệu tạm ≠ dữ liệu bền); checkout tạo đơn đúng người, đúng tổng; không tin giá/ id người dùng từ client.
- [x] **2.13 Upload ảnh** (`POST /uploads`) — **mới**, cho báo hoàn thành (≤ 4 ảnh), đánh giá, báo cáo. Phụ thuộc **D2**.
  *Xong khi:* chỉ nhận `png/jpg/webp` ≤ 2 MB; tên file do server sinh (không dùng tên client, chặn path traversal); `limit` body hạ khỏi 50 MB; trả URL `/images/...`.
- [x] **2.14 Gợi ý bài tương tự** (`GET /posts/:id/similar`, `GET /me/recommendations`) — **mới**, phần máy học CO3, phụ thuộc **D3**. Bản đơn giản chạy được: content-based (TF-IDF trên tên+mô tả + cùng loại + khoảng giá + cùng khu) tính bằng Node, không cần dịch vụ ngoài; "gợi ý cho bạn" dựa trên bài đã lưu/đã đặt.
  *Xong khi:* có mô tả thuật toán 1 trang trong `docs/`; kết quả hợp lý trên seed (bài "Phở bò" gợi ý món nước/ăn trưa, không gợi ý "Sofa").
- [x] **2.15 [BE] Seed tài khoản theo vai trò** — **mới**: 1 `admin` + ≥ 3 `user` (người mua, người bán, người đăng việc) trong `npm run seed`; mật khẩu seed lấy từ biến môi trường, **không** viết cứng trong repo.
  *Xong khi:* đăng nhập được cả hai vai trò; chạy seed lặp lại không nhân đôi tài khoản.
- [x] **2.16 [BE] Admin — quản lý người dùng** (`/admin/users`): danh sách (lọc `role`, `status`, `q`), chi tiết, **khóa/mở khóa** (`status: active|locked`; tài khoản bị khóa không đăng nhập được, session đang có bị vô hiệu); không đổi được role của chính mình, không khóa admin cuối cùng.
  *Xong khi:* `user` gọi `/admin/*` nhận **403**, chưa đăng nhập nhận **401**; người bị khóa đăng nhập → 403 `ACCOUNT_LOCKED`; có Swagger.
- [x] **2.17 [BE] Admin — kiểm duyệt nội dung** (`/admin/posts`, `/admin/reports`): ẩn/gỡ bài vi phạm (`status: hidden`, kèm lý do; bài ẩn không hiện ở `/posts`), hàng đợi **báo cáo** (2.9) đổi trạng thái `open → reviewing → resolved|rejected` kèm ghi chú; người báo cáo thấy trạng thái của mình. Admin chỉ ẩn/hiện, không sửa nội dung bài của phía Bán. **Phụ thuộc Q14.**
  *Xong khi:* chuyển trạng thái sai → 409; mọi hành động admin ghi `auditLog` (ai, làm gì, lúc nào).
- [x] **2.18 [BE] Admin — tổng quan** (`GET /admin/stats`): số người dùng, bài đang mở, đơn theo trạng thái, báo cáo chờ xử lý — **đếm từ dữ liệu trong DB** (aggregation).
  *Xong khi:* số khớp DB trên seed; chỉ admin gọi được.
- [x] **2.19 [BE] Ảnh đại diện trong dữ liệu** — **mới (18/10, cho bước 5.6 của FE)**: thêm `avatar` (URL ảnh chân dung Unsplash) cho 7 người dùng trong `seed.js`; các API trả người bán/người đăng/người nhận (`seller`, `poster`, `worker`, `participants`) có kèm `avatar`; đơn trả `snapshot.image` (đã có).
  **[BE 18/10] Đã làm:** `User.avatar` (URL hoặc `null`, chuỗi rỗng cũ cũng ra `null`); seed gắn ảnh chân dung Unsplash cho **cả 18** tài khoản mẫu (không trùng, đã kiểm HTTP 200 và xem từng ảnh); `seller`/`poster`/`reviewer`/`author`/`with` trả `avatar`; đơn trả thêm `snapshot.sellerAvatar`; Swagger có schema `User`, `UserSummary`, `OrderSnapshot`; test 20/20. Điểm cần chốt: `decisions.md` B1, B2.
  *Xong khi:* `GET /posts`, `/jobs`, `/orders`, `/conversations` đều trả `avatar` (hoặc `null` nếu người dùng chưa có); ID ảnh đã kiểm tra mở được (HTTP 200) và đúng là ảnh người.

## Phase 3 — Frontend logic (mock data, chưa cần giao diện) **[FE]**

> Dùng đúng mẫu bài dạy: Component chỉ điều phối, **logic + gọi API nằm ở Service** (KT 2.2); template dùng `@if/@for (track id)/@switch`, `@Input/@Output`, Signals (gọi `x()`); mọi `subscribe` có nhánh lỗi → **Safe State** (mảng rỗng + thông báo, không để spinner quay mãi, KT 4.3); không dùng `[innerHTML]`/`bypassSecurityTrust*` với nội dung người dùng.

- [x] **3.1 Interface và service nền** *(FE xong 18/10: `models/{api,offer,social,order,user}.ts`, `ApiService` + `AppError`, `MockDb`; còn lệch tên field `Post`/`Job` so hợp đồng → decisions F1)*: `models/` khớp `api-buyer-job.md` (id là ObjectId 24 hex); `ApiService` bọc `HttpClient` + `catchError`; `environment`/`api.config` có `API_BASE`. **Phụ thuộc Q2, Q7, Q8.**
  *Xong khi:* có interface cho mọi model trong hợp đồng; `ng build` không lỗi.
- [x] **3.2 Mock data & chế độ mock** — cờ `USE_MOCK` ở `core/config/api.config.ts`, dữ liệu `client/public/datasets/`. *(Cần nâng lên cờ theo từng service để bật API thật dần, xem 4.2.)*
- [x] **3.3 Auth phía FE** *(FE xong 18/10: thêm `apiInterceptor` — `withCredentials` + 401 → `/auth/login?returnUrl=`; guard hỏi `checkSession`; chưa thử với server thật)*: `AuthService` (`login/register/logout/checkSession`, `currentUser` signal), `authGuard` hỏi **server** (`GET /auth/profile`) chứ không đọc `localStorage` (KT 5.8, 9.3), interceptor `withCredentials` + bắt 401 → `/auth/login?returnUrl=`, "nhớ tên đăng nhập" bằng cookie thường (`ngx-cookie-service` hoặc tương đương).
  *Xong khi:* vào route cần đăng nhập khi chưa đăng nhập bị chuyển về login rồi quay lại đúng trang; F12 sửa `localStorage` **không** vượt được guard.
- [x] **3.4 Service theo module** *(FE 18/10: đã thêm `JobOfferService`, `AddressService`, `ReviewService`, `ChatService`, `NotificationService`, `QuestionService`, `ReportService`, `OrderService` đủ create/cancel; `UploadService` (kiểm tra png/jpg/webp ≤ 2 MB), `RecommendService`, `SavedService` → API lạc quan, cờ mock riêng từng service `MOCK_OVERRIDES` ở `api.config.ts`; `CartService` chưa nối session — chờ F4)*: `PostService`✓, `OrderService`✓(đọc), `CartService`✓(bộ nhớ) cần nối session (2.12), `SavedService`✓(localStorage → API), còn thiếu `JobOfferService`, `AddressService`, `ReviewService`, `ChatService`, `NotificationService`, `QuestionService`, `UploadService`, `RecommendService`. Mỗi hàm có `retry(3)` + `catchError`.
  *Xong khi:* mỗi service có hàm khớp từng endpoint; test đơn vị cho logic tính toán (tổng tiền hiển thị, `matches` lọc).
- [x] **3.5 Routing** *(đã có khung)*. Đường dẫn chính thức: `/`, `/search?q=&kind=&min=&max=`, `/posts/:slug`, `/posts/job/:slug`, `/orders`, `/orders/:id`, `/messenger(/:chatId)`, `/notifications`, `/profile`, `/auth/login|register`, `/seller/**` (nested), `**` = 404 **đặt cuối**; lazy loading mọi feature; `''` là trang mặc định. Bổ sung: `CanDeactivate` cho form nhập dở (đặt hàng, đề nghị, đánh giá), `CanMatch` cho `/seller` (tự nghiên cứu theo chương IV), `Router` điều hướng bằng code vs `ActivatedRoute` đọc tham số.
  *Xong khi:* link slug và link id đều mở đúng bài; slug lạ → trang "không tồn tại" (không văng lỗi); copy URL lọc mở lại đúng kết quả; Network chỉ tải chunk khi vào route (kiểm bằng DevTools).
- [x] **3.6 Logic màn hình bằng component thô (không CSS)** *(FE xong 18/10 với mock: đặt hàng 2 bước ở `post-detail`, đề nghị + hỏi đáp ở `job-detail`, chi tiết đơn có thanh 5 bước + hành động theo trạng thái + đánh giá, báo cáo vấn đề `/orders/:id/report`, sổ địa chỉ ở Tôi, Messenger, Thông báo)*: danh sách + lọc, **đặt hàng 2 bước** (chọn món → xác nhận: địa chỉ, nhận hàng, giờ, ghi chú, voucher, tiền mặt/chuyển khoản), gửi đề nghị nhận việc, đổi trạng thái đơn, hỏi đáp công khai (chặn SĐT phía client chỉ để gợi ý, server mới là bắt buộc).
  *Xong khi:* chạy trọn "tìm → xem → đặt/đề nghị → thấy trong Đơn hàng" bằng mock.
- [x] **3.7 Form & validation** *(FE xong 18/10: địa chỉ, đặt hàng, đề nghị, hỏi đáp, đánh giá, báo cáo; `phoneValidator`, `noPhoneValidator`, lỗi 422 gắn đúng field qua `AppError.details`)* (Reactive Forms): địa chỉ (SĐT 10 số, Block A–D), đặt hàng, đề nghị nhận việc, đánh giá, đăng ký (validator tùy biến + **cross-field** xác nhận mật khẩu gắn ở `FormGroup`, KT 6.4). Quy tắc UX: chỉ báo lỗi khi `touched`; nút gửi khóa khi `invalid`; **server vẫn validate lại** (KT 6.3).
  *Xong khi:* nhập sai hiện lỗi đúng chỗ; server trả 422 thì lỗi hiện đúng từng field.
- [x] **3.8 Gợi ý (CO3)** *(FE xong 18/10 bằng mock content-based `utils/recommend.ts` TF-IDF + test; "Tương tự trong khu" ở chi tiết bài, "Gợi ý cho bạn" ở trang chủ, rỗng thì ẩn; chờ D3 để chuyển API)* — **mới**, phụ thuộc 2.14 / **D3**: khối "Tương tự trong khu" ở chi tiết bài, "Gợi ý cho bạn" ở trang chủ; mock bằng so khớp từ khóa/loại trước, chuyển API sau.
  *Xong khi:* hai khối hiện có dữ liệu thật, rỗng thì ẩn.
- [x] **3.9 Tìm kiếm nâng cao** *(FE xong 18/10: ô header đồng bộ `?q=`, bỏ dấu, ưu tiên khu của tôi + "Ở khu gần đó")* — **mới**: ô tìm trên header → `/search?q=`; **tìm tương đối bỏ dấu** (dùng `stripAccents` đã có); gợi ý khi không có kết quả (“Ở khu gần đó”); giữ bộ lọc trong query params (KT 5.4).
  *Xong khi:* gõ "ca phe" ra "Cà phê"; đổi bộ lọc cập nhật URL, F5 giữ nguyên kết quả.
- [ ] **3.10 [FE] Phân quyền theo vai trò** — **mới**: `User.role` giữ `'user' | 'admin'` (đã chốt D6; đồng bộ `models/user.ts`, mock, test); `roleGuard` (`CanMatch`/`CanActivate`) cho `/admin/**`; header chỉ hiện mục **Quản trị** với admin; `user` mở `/admin` bằng URL → trang "Không có quyền" (403), không lộ nội dung (server vẫn chặn thật).
  *Xong khi:* đăng nhập `user` vào `/admin` bị chặn, `admin` vào được; sửa `sessionStorage`/`localStorage` không đổi được vai trò (vai trò lấy từ `GET /auth/profile`).
- [ ] **3.11 [FE] Không gian Quản trị** — **mới**: `ng g m features/admin --routing` (**lazy**, route lồng nhau `/admin` → `users`, `posts`, `reports`, `stats`); component `admin-layout`, `user-admin`, `post-moderation`, `report-queue`, `admin-stats`; service `AdminService`. Làm bằng mock trước theo hợp đồng 2.16–2.18; thao tác nguy hiểm (khóa, gỡ bài) có hộp xác nhận.
  *Xong khi:* chạy trọn "xem người dùng → khóa/mở khóa" và "xem báo cáo → xử lý" với mock; có trạng thái rỗng/lỗi.

### Bản đồ mockup → Angular (cách chuyển HTML sang `ng g c` / `ng g s`)

Quy tắc: **mỗi màn hình HTML = 1 component** (`ng g c features/<nhóm>/<tên> --no-standalone --module=features/<nhóm>`); **mỗi nhóm dữ liệu/logic dùng chung = 1 service** (`ng g s core/services/<tên>`); mảnh giao diện lặp lại ở nhiều màn = component trong `shared/`. Phần `<script>` của mockup → chuyển thành code TS trong service (logic) và component (điều phối); CSS → file `.css` của component, màu/chữ chung → `styles.css`.

| Mockup | Component (`ng g c`) | Service / ghi chú (`ng g s`) |
|---|---|---|
| `home-v5.html` | `features/home/home` (đã có) | `PostService`, `SavedService`; dải "Kiếm thêm gần nhà" → `shared/earn-band` |
| `search.html` | `features/search/search-results` (đã có) | `PostService.search`, bộ lọc = query params |
| `detail.html` | `features/posts/post-detail` (đã có) + con: `order-box` (khung chọn món), `confirm-order` (hộp xác nhận), `review-list` | `OrderService`, `CartService`, `ReviewService`, `AddressService` |
| `job.html` | `features/posts/job-detail` (đã có) + con: `offer-form`, `job-qa` | `JobOfferService`, `QuestionService` |
| `orders.html` | `features/orders/order-list`, `order-detail` (đã có) + con: `order-stepper`, `order-actions` | `OrderService`, `JobOfferService` |
| `messenger.html` | `features/messenger/messenger` (đã có) | `ChatService` |
| `notifications.html` | `features/notifications/notification-list` (đã có) | `NotificationService` |
| `profile.html` | `features/profile/profile` + con: `address-book` | `AddressService`, `SavedService` |
| `shop.html` | **mới:** `ng g m features/shop --routing`, `ng g c features/shop/shop` (route `/shop/:id`) | `ShopService` (hoặc dùng `PostService`) |
| `support.html` | **mới:** `features/support/report-form` (route `/orders/:id/report`) | `ReportService` |
| `shared/common.js` (header/footer) | `core/layout/header`, `footer` (đã có) | `AuthService`, `NotificationService` (chấm chuông) |
| `shared/drawers.js` (Đã lưu, AntXu) | `shared/saved-drawer`, `shared/xu-drawer` | `SavedService`, `XuService` |
| `shared/addresses.js` | `shared/address-dialog` | `AddressService` |
| `shared/catalog.js`, `antgo_*` localStorage | — | Thay bằng service gọi API/mock; **không** giữ `localStorage` làm nguồn dữ liệu chính |

Làm **một màn một lần** (đúng luật `CLAUDE.md`): tạo component bằng `ng g`, chuyển HTML+CSS, nối service, chạy `ng build`, đối chiếu ảnh chụp với mockup rồi mới sang màn tiếp.

## Phase 4 — Gắn BE với FE

- [ ] **4.1 [BE+FE] CORS & proxy:** BE chỉ cho `CLIENT_ORIGIN` + `credentials: true`; FE dùng `proxy.conf.json` (`/api` → `http://localhost:3000`, đã có) và `withCredentials`.
  *Xong khi:* FE gọi `GET /api/health` từ trình duyệt thành công; cookie `connect.sid` được lưu và gửi lại.
- [ ] **4.2 [FE] Gắn từng service** *(FE 18/10: đã gắn API thật cho auth (đăng nhập bằng SĐT), bài + việc, tìm kiếm, gợi ý, đơn đã đặt, đề nghị nhận việc, hỏi đáp, địa chỉ, đã lưu, thông báo, Messenger, báo cáo — qua lớp chuyển đổi `core/utils/api-mappers.ts`; `USE_MOCK=false`, chỉ khu Bán còn mock; đã chạy thử với DB seed: đăng nhập, xem bài/việc, đặt đơn có tùy chọn, đồng ý phụ thu, Messenger, Thông báo. Còn: đánh giá, upload, gian hàng theo người bán, 4.3 lỗi thống nhất)*  sang API thật theo thứ tự: auth → địa chỉ → bài/tìm kiếm → giỏ/đơn → đề nghị → hỏi đáp → đánh giá → chat/thông báo → upload → gợi ý. **Chỉ gắn khi endpoint tương ứng đã "Xong"** trong `api-buyer-job.md`; mỗi service có cờ riêng, xong thì tắt mock của service đó.
  *Xong khi:* mỗi service chạy trọn luồng với API thật.
- [ ] **4.3 [FE] Xử lý lỗi thống nhất:** 401 → đăng nhập lại, 403, 404, 422 (lỗi từng field), 500 (thông báo chung).
  *Xong khi:* gây từng lỗi (hết phiên, id không có, dữ liệu sai) đều hiện đúng thông báo.
- [ ] **4.4 [BE+FE] Chạy thử trọn luồng 2 tài khoản** (người đăng việc ↔ người nhận việc; người bán ↔ người mua) cùng DB.
  *Xong khi:* đổi trạng thái ở tài khoản này thì tài khoản kia thấy.

## Phase 5 — Giao diện: chuyển từ mockup sang component Angular **[FE]**

- [x] **5.1 Rà component dùng chung** từ `design/mockups` (không cần Figma): token màu/chữ nằm ở `client/src/styles.css`; bộ icon Phosphor dạng sprite trong `src/index.html`.
- [x] **5.2 Dựng component dùng chung** — xong 18/10: `Header` (tìm kiếm, Mua|Bán, khu, Xu, Đã lưu, chuông, avatar), `Footer`, `PostCard`, `JobCard`. Còn thiếu: ngăn kéo Đã lưu/AntXu (`shared/saved-drawer`, `xu-drawer`), hộp địa chỉ (`address-dialog`).
- [ ] **5.3 Dựng từng màn theo mockup, mỗi lần MỘT màn** (tạo component bằng `ng g c`, chuyển HTML+CSS, nối service, `ng build`, chụp ảnh đối chiếu — `CLAUDE.md` mục 1). Thứ tự: ✔ Trang chủ (`home-v5.html`) → Tìm kiếm → Chi tiết bài + khung đặt 2 bước → Chi tiết việc → Đơn hàng (list + chi tiết) → Messenger → Thông báo → Tôi (+ sổ địa chỉ) → Gian hàng (`shop.html`, route mới `/shop/:id`) → Hỗ trợ (`support.html`). Chưa làm ở trang chủ: hero có chuyển động, tìm bằng giọng nói/hình ảnh, header thu gọn khi cuộn, tự tải thêm khi cuộn.
  *Xong khi:* mỗi màn khớp ảnh chụp mockup ở màn hình máy tính và chạy với dữ liệu mock (rồi API thật). *(Không làm kiểu "AI".)*
- [ ] **5.4 Trạng thái rỗng / đang tải / lỗi** cho mọi danh sách.
  *Xong khi:* không màn nào trắng trơn.
- [ ] **5.5 Hiệu năng:** lazy loading đã kiểm bằng Network; ảnh `loading="lazy"`; `track id` ở mọi `@for` (KT 3.2); LCP ≤ 2.5s khi chạy local trên trang chủ (KT 2.2).
  *Xong khi:* có ghi chú đo được trong PR.

### Thêm hình ảnh cho giao diện (18/10) — làm theo thứ tự, mỗi bước một lần, chụp ảnh đối chiếu trước khi sang bước sau

> Lý do: giao diện còn nhiều chỗ chỉ có chữ so với mockup. Nguồn ảnh: Unsplash như mockup, **kiểm tra ID mở được (HTTP 200) và xem ảnh đúng chủ đề** trước khi dùng; ảnh linh vật dùng bộ có sẵn ở `client/public/assets/clean/`.

- [x] **5.6 [FE] Ảnh đại diện người dùng** *(xong 18/10: component `shared/components/avatar`, dùng ở header, JobCard, chi tiết bài/việc, Messenger, Đơn hàng; mock có `sellerAvatar`/`posterAvatar`/`workerAvatar`/`withAvatar`/`counterpartAvatar`; 10 ảnh Unsplash đã kiểm HTTP 200 và là ảnh chân dung; "Quán Phở Bà Tư" cố ý để trống để kiểm fallback; chờ BE 2.19 trả `avatar` thật)* *(bước 1a — phụ thuộc 2.19 của BE; trong lúc chờ, FE gắn `avatar` vào mock `client/public/datasets/` và `mock-db`)*: tạo component dùng chung `ng g c shared/components/avatar --no-standalone --module=shared` (`@Input` `src`, `name`, `size`; **không có ảnh thì hiện chữ cái đầu** như hiện nay) rồi dùng ở: header (avatar tài khoản), `JobCard` (người đăng), thông tin người bán/người đăng ở chi tiết bài và chi tiết việc, Messenger (danh sách + khung chat), Đơn hàng (người bán/người đăng). Thêm `avatar?: string` vào `models/user.ts` và `models/post.ts` (đồng bộ F1).
  *Xong khi:* các chỗ trên hiện ảnh tròn thay cho chữ cái; ảnh lỗi/thiếu thì tự về chữ cái, không vỡ layout; có test cho phần fallback; `ng build` qua.
- [x] **5.7 [FE] Ô ảnh trong Đơn hàng** *(xong 18/10: `OrderThumb` — đơn đã đặt dùng ảnh món, việc đã nhận/ảnh lỗi dùng ô kem + icon + tên nhóm; hàng đơn theo `.orow` của mockup; chi tiết có thẻ người bán/người đăng kèm avatar và link `/shop/:id`)* *(bước 1b)*: danh sách đơn có ô ảnh bên trái mỗi hàng đúng như `orders.html` — **Đơn đã đặt** dùng ảnh món (`snapshot.image` / ảnh bài), **Việc đã nhận** dùng ô màu kem + icon danh mục việc (không có ảnh thật); trang chi tiết có thẻ người bán/người đăng kèm avatar (5.6). Bổ sung `image` vào `Order` ở FE nếu thiếu.
  *Xong khi:* mỗi hàng đơn có ô ảnh; ảnh lỗi thì hiện ô kem + icon; ảnh chụp danh sách Đơn hàng khớp mockup ở màn hình máy tính.
- [ ] **5.8 [FE] Bộ ảnh ở chi tiết bài** *(bước 2 — làm sau 5.7)*: cần **mỗi bài 2–3 ảnh** → BE bổ sung ở seed (ghi thêm vào 2.19 khi làm) hoặc FE thêm vào mock; làm lưới ảnh chính + ảnh nhỏ, **xem ảnh lớn** (nút ← →, Esc) như `detail.html`.
  *Xong khi:* bài có nhiều ảnh mở được bộ xem lớn, bàn phím điều khiển được; bài chỉ 1 ảnh vẫn hiển thị đúng.
- [ ] **5.9 [FE] Hình cho trang chủ và trạng thái rỗng** *(bước 3 — làm sau 5.8)*: thêm bài quảng bá vào dữ liệu mẫu để khối "Nổi bật" đủ 4 thẻ; dùng ảnh kiến (`point.png`, `idle.png`, `peek.png`) cho các trạng thái rỗng (chưa có đơn, chưa có kết quả tìm kiếm, chưa có tin nhắn…); hero có mây và chuyển động nhẹ nếu có ảnh được phép dùng.
  *Xong khi:* không còn khối nào chỉ có dòng chữ "Chưa có…" trơ trọi; trang chủ có đủ 4 thẻ ở mọi khối.

## Phase 6 — Hoàn thiện và merge

- [ ] **6.1 [BE+FE] Rà bảo mật** theo bảng KT 9.3: bcrypt; cookie `httpOnly/secure/sameSite`; `SESSION_SECRET` ở `.env`; `regenerate` khi login, `destroy` khi logout; guard hỏi server; validate whitelist + `ObjectId.isValid`; kiểm quyền sở hữu mọi route theo `:id`; CORS giới hạn origin; upload an toàn; không lộ `err.message`; không lộ địa chỉ chính xác khi chưa được phép; không `[innerHTML]` với dữ liệu người dùng.
  *Xong khi:* mọi dòng trong bảng KT 9.3 đạt hoặc ghi rõ lý do hoãn.
- [ ] **6.2 [PL] Rà trùng lặp** endpoint/model với phần thành viên khác.
  *Xong khi:* không hai route cùng method+path; không hai model cùng collection.
- [ ] **6.3 [BE+FE] Cập nhật tài liệu:** `api-buyer-job.md` khớp code thật; `README.md` + `client/README.md` + `server/README.md` có hướng dẫn chạy (thứ tự: **MongoDB → server → client**).
  *Xong khi:* người mới clone chạy được cả BE + FE theo README.
- [ ] **6.4 Chạy lại toàn bộ luồng trên bản sạch** (DB trống + seed).
  *Xong khi:* không lỗi console, không lỗi log server.
- [ ] **6.5 Merge vào `dev`, rồi `dev` → `main`** qua Pull Request; trước merge: chạy server + kiểm Swagger, `ng build` + `ng test` qua, xem lại diff không lọt file thừa (`.env`, `node_modules`, `dist`).
  *Xong khi:* `main` chạy được sau merge (cả `server` và `client`).
- [ ] **6.6 [PL] Đối chiếu yêu cầu môn học** (bảng dưới) trước ngày nộp / vấn đáp; ai chưa đạt thì thêm việc vào Phase tương ứng.

## Phase 7 — Nâng cấp cuối: AI/ML, theo dõi đơn, Vườn AntGo, lấp lỗ hổng môn học *(chốt 29/10)*

> Bối cảnh: đã có trên `dev` (commit 9a310be…77669b6): chatbot (Gemini → Groq → bộ cơ bản), tìm kiếm thông minh, gợi ý giá, skeleton, Quay món, **bản đồ theo dõi giao hàng (mô phỏng, FE)**, **Vườn AntGo + game Hái xu (Three.js, Xu lưu localStorage)**. Chi tiết thuật toán: `docs/thuat-toan-goi-y.md`.
> Quy tắc chung: mỗi bước nhỏ, **xong thì tick `[x]` + build/test qua + commit lên `dev`** (không đụng `main`); BE chỉ sửa `server/`, FE chỉ sửa `client/`; đổi hợp đồng API thì ghi `decisions.md` nhãn `CẦN CHỐT`. Mỗi thay đổi giao diện: chụp ảnh đối chiếu mockup, **đổi từng thứ một**.

### 7A — Backend **[BE]** (terminal `server`)
- [x] **7.1 Sổ Xu & game ở server (chống gian lận).** Model `XuEntry` (hoặc mở rộng ví hiện có) + `GET /api/me/xu` (số dư, lịch sử, voucher), `POST /api/me/xu/game` `{ game: 'hai-xu', score }`: server tự kiểm **tối đa 3 lượt/ngày/game**, **trần 30 Xu/ngày từ game**, giới hạn điểm hợp lý (≤ 80/lượt), trả `{ granted, capLeft, playsLeft }`. Đổi voucher: `POST /api/me/xu/redeem`. Test bằng `mongodb-memory-server`.
  *Xong khi:* gọi quá 3 lượt/ngày hoặc vượt trần → 429/`GAME_LIMIT`; `npm test` qua.
- [x] **7.2 Theo dõi giao hàng thống nhất giữa thiết bị:** `GET /api/orders/:id/tracking` (chỉ chủ đơn/người bán/admin) trả `{ shop:{lat,lng}, home:{lat,lng}, courier:{lat,lng,phase,etaMin,distanceKm} }`. Vị trí **mô phỏng tính từ mốc thời gian** trong `history` của đơn (không cần lưu từng điểm): toạ độ cửa hàng/nhà lấy theo bảng Block A–D (đặt hằng số, nêu rõ là mô phỏng). Đơn tự lấy/dịch vụ → 404 `NO_TRACKING`.
  *Xong khi:* hai tab cùng thấy xe ở cùng một chỗ; test cho 4 giai đoạn.
- [x] **7.3 Làm giàu dữ liệu seed** (để gợi ý, tìm thông minh, gợi ý giá có chất): ≥ 30 bài (đủ 4 nhóm, giá thực tế), ≥ 12 việc, đơn ở **mọi trạng thái** (kể cả vài đơn `delivering` có giao tận nơi), vài đánh giá. Giữ ObjectId khớp `client/public/datasets/` nếu có thể.
  *Xong khi:* `npm run seed` chạy lại sạch; câu hỏi chatbot "ăn gì dưới 50k" luôn ra ≥ 3 món.
- [x] **7.4 Rà bảo mật (6.1):** `helmet`, `saveUninitialized: false`, rate limit đăng nhập/đăng ký, không lộ `err.message` ở production, kiểm `ObjectId` mọi route `:id`, kiểm quyền sở hữu đơn/đề nghị/hội thoại. Ghi bảng KT 9.3 đạt/hoãn vào `server/README.md`.
- [x] **7.5 Tài liệu:** `api-buyer-job.md` thêm `/assistant/chat`, `/pricing/suggest`, `/me/xu*`, `/orders/:id/tracking`; Swagger đủ tag; `server/README.md` (biến `.env` mới: `LLM_*`, `GEMINI_*`, `ASSISTANT_MODE`).
- [x] **7.6 (tùy chọn, nếu còn thời gian) Máy học:** thêm đánh giá offline cho gợi ý (Precision@k trên seed) vào `docs/thuat-toan-goi-y.md` để có số liệu khi vấn đáp.

### 7B — Frontend **[FE]** (terminal `client`)
- [x] **7.7 Bản đồ theo dõi cho MỌI đơn có giao** (không chỉ đang giao): hiện từ trạng thái *Đã xác nhận* trở đi cho đơn đồ ăn/đồ dùng "Giao tận nơi"; *Hoàn tất* hiện thẻ "Đã giao" thu gọn. Thêm dòng **"Cách bạn X km"** (khoảng cách còn lại, cập nhật theo xe) bên cạnh "Dự kiến N phút". Toạ độ cửa hàng/nhà **khác nhau theo Block của người bán và địa chỉ nhận** (bảng Block A–D) thay vì một tuyến cố định. Khi BE xong 7.2 thì gọi `/orders/:id/tracking` (mock giữ nguyên).
  *Xong khi:* mở 3 đơn khác nhau thấy 3 tuyến khác nhau; có "Cách bạn X km"; ảnh chụp desktop + 390px.
- [x] **7.8 Làm đẹp & hoàn thiện Vườn AntGo:** (a) rà giao diện hub + Hái xu theo phong cách trang chủ (bớt "mùi game", khớp màu/chữ/bo góc, icon Phosphor), vật phẩm Hái xu rõ hơn trên nền sáng, hiệu ứng bắt xu; (b) **Tưới cây** (cây xoài 4 giai đoạn, ≤ 3 lần tưới/ngày, thu hoạch nhận Xu); (c) **Nuôi thú cưng** (đói/vui, điểm danh liên tiếp); (d) mọi thưởng đi qua `XuService.earnGame` (trần 30 Xu/ngày chung); (e) kiểm mobile 390px, `prefers-reduced-motion`; (f) khi BE xong 7.1 thì gọi API thay localStorage.
  *Xong khi:* 3 game chơi được trọn vòng, trần ngày hoạt động, ảnh chụp từng game.
- [x] **7.9 Lấp lỗ hổng yêu cầu môn học:** (a) thêm **ít nhất một form template-driven + two-way binding `[(ngModel)]`** có `ngForm` + validation (gợi ý: ô góp ý/Hỗ trợ hoặc chỉnh hồ sơ); (b) **giỏ hàng theo session** nối UI (`CartService`) nếu còn phù hợp với đặt 2 bước, hoặc ghi lý do hoãn vào `decisions.md`; (c) **`/admin`** (3.10–3.11: danh sách người dùng, ẩn/hiện bài, xử lý báo cáo) có `adminGuard`; (d) sửa test `api-mappers.spec.ts` đang đỏ (mapper thông báo dùng ", " thay vì " — "); (e) rà `[innerHTML]` với dữ liệu người dùng.
- [x] **7.10 Gắn API thật khi BE báo xong:** Xu/game (7.1), tracking (7.2); tắt mock tương ứng, thử `?mock=0`.
- [x] **7.11 Rà giao diện tổng thể** các trang mới (chatbot, skeleton, tracking, Vườn AntGo) trên 1440px và 390px; không để chữ tràn, ảnh vỡ, khoảng trắng thừa.

- [x] **7.15 Tìm bằng giọng nói / hình ảnh: tự tìm ngay, không cần bấm nút Tìm.** (a) **Giọng nói:** khi nhận dạng giọng nói *kết thúc* (sự kiện `onend`/có kết quả cuối `isFinal`), tự điền chữ vào ô và chạy tìm luôn (chuyển sang `/search?q=…`); nếu không nghe được gì thì báo "Mình chưa nghe rõ, bạn thử lại nhé" và không tìm. (b) **Hình ảnh:** vừa chọn xong hoặc thả ảnh vào là tự tìm theo ảnh, không chờ bấm; hiện trạng thái "Đang tìm theo ảnh…" (skeleton) rồi ra kết quả. (c) Áp dụng cho **cả hai ô tìm** (ô lớn ở trang chủ và ô gọn trên header). (d) Có nút ✕ để hủy/xóa ảnh hoặc chữ; chống gọi trùng (bỏ qua nếu đang tìm cùng nội dung); thân thiện bàn phím (Enter vẫn tìm thủ công). (e) Tìm bằng ảnh hiện chỉ mô phỏng — ghi rõ trong giao diện hoặc để BE bổ sung nhận dạng ảnh (có thể dùng mô hình thị giác qua `LLM_*` ở `server/`, ghi vào `decisions.md` nếu làm).
  *Xong khi:* nói xong một câu hoặc chọn một ảnh thì trang kết quả hiện ra ngay mà không bấm thêm nút nào; ảnh chụp/quay thao tác ở 1440px và 390px.

- [x] **7.16 Lối vào Vườn AntGo dễ thấy (kiếm thêm Xu).** Hiện chỉ có một nút nhỏ ở hàng "Phổ biến" trang chủ. Thêm: (a) trong **ngăn kéo Xu** (nút "N Xu" ở header) mục "Cách nhận Xu" có dòng **"Chơi game kiếm Xu"** + thanh tiến độ "x/30 Xu hôm nay" bấm mở `/vuon`; (b) trang `/xu` có thẻ/nút tương tự; (c) trang chủ có **một dải/banner gọn** (kiểu dải "Kiếm thêm gần nhà", không lòe loẹt, dùng kiến + icon Phosphor, không emoji) nói "Hái xu nhận giảm giá"; (d) thêm "Vườn AntGo" vào menu hồ sơ/footer cột Khám phá. Giữ nguyên quy tắc một màu nhấn cam, không rối trang chủ.
  *Xong khi:* từ trang chủ và từ ngăn kéo Xu đều vào được Vườn AntGo trong 1 cú bấm; ảnh chụp từng chỗ.

### 7C — Planning/nhóm **[PL]** (phiên này)
- [ ] **7.12** Chốt trần Xu game 30/ngày + 3 lượt (đã đề xuất, ghi `decisions.md` mục F10).
- [ ] **7.13** Đối chiếu 6.6 (bảng yêu cầu môn học) sau khi 7A/7B xong; chuẩn bị kịch bản demo (xem dưới).
- [ ] **7.14** Kịch bản demo vấn đáp (5 phút): đăng nhập → tìm "coom gaa" (tìm thông minh) → Gợi ý cho bạn → đặt đơn giao tận nơi → xem bản đồ + "Cách bạn X km" → chatbot "đơn của tôi / chọn giúp tôi món" → Hái xu nhận Xu → đổi voucher → đăng bài (gợi ý giá) → admin ẩn bài.

---

## Điểm đồng bộ BE ↔ FE (mỗi terminal biết lúc nào phải xem terminal kia)

| Khi... | BE | FE |
|---|---|---|
| Chốt D1 (session) | Làm 2.0 | Làm 3.3 theo `withCredentials`, **không** lưu token |
| BE xong endpoint X | Đổi trạng thái X thành **Xong** trong `api-buyer-job.md` | Thấy **Xong** thì bật API thật cho service tương ứng (4.2), tắt mock |
| BE muốn đổi hợp đồng | Ghi `decisions.md` nhãn `CẦN CHỐT`, **không tự đổi** | Làm tiếp bằng mock cũ, không đoán |
| FE thiếu field / enum | — | Ghi `decisions.md` `CẦN CHỐT`, làm phần khác |
| Cần seed khớp mock | 2.10 dùng cùng ObjectId với `client/public/datasets/*.json` | Không đổi id trong mock khi BE đã seed |

## Đối chiếu yêu cầu môn học (từ KT mục 1)

| # | Yêu cầu thầy | Nằm ở bước | Trạng thái |
|---|---|---|---|
| 1 | Kiến trúc Angular: Component/Module/Service/DI | khung client, 3.1, 3.4 | Một phần |
| 2 | Binding, directive, `@if/@for/@switch`, `@Input/@Output` | 3.6, 5.x, `PostCard/JobCard` | Một phần |
| 3 | Service + HttpClient + `catchError`/`retry` | 3.1, 3.4 | Một phần |
| 4 | Routing: `:id`, **slug**, query params, 404, nested, lazy, Guard | 3.5 (khung đã có), 2.3 slug | Một phần |
| 5 | Form: Reactive, validation, custom + cross-field | 3.7 | Một phần (login, register, đề nghị, đăng bài) |
| 6 | REST CRUD đủ GET/POST/PUT/DELETE, CORS, morgan, nodemon, upload ảnh | 0.1–0.3, 2.x, 2.13 | Chưa |
| 7 | MongoDB CRUD, `ObjectId`, tìm kiếm tương đối, slug trên dữ liệu Mongo | 0.2, 2.1–2.10 | Chưa |
| 8 | Cookie & Session: đăng nhập, ghi nhớ, giỏ hàng tạm, đăng xuất | 2.0, 2.12, 3.3 | Chưa |
| 8b | Phân quyền `admin` / `user` (guard + `requireRole`, 401/403) | 2.0, 2.15–2.18, 3.10–3.11 | Chưa |
| 9 | Bảo mật: cookie flags, session an toàn, guard, validate server, mã hóa mật khẩu | 6.1 | Chưa |
| 10 | Máy học (CO3) | 2.14, 3.8 | Chưa — chờ D3 |
