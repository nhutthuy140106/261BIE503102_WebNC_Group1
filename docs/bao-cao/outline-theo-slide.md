# Đối chiếu slide môn học ↔ báo cáo AntGo

> Bổ sung cho `outline-bao-cao.md`. Cột "AntGo" dựa trên quét mã nguồn `client/` và `server/` ngày 17/10/2026. Chỗ **[CHƯA CÓ]** là kỹ thuật slide dạy nhưng AntGo chưa dùng, không được viết như đã làm.
> Slide môn: 8 chương + giới thiệu. Đồ án nhóm chiếm 50% điểm, đánh giá theo CLO1 (kiến trúc Angular), CLO2 (full-stack REST + MongoDB), CLO3 (máy học, AntGo chưa có).

## Cách dùng slide trong báo cáo

- **Mục 2 (Cơ sở lý thuyết):** mỗi chương slide = một mục công nghệ, chỉ viết kỹ thuật AntGo thật sự dùng.
- **Mục 3–4 (Phương pháp, Kết quả):** mỗi kỹ thuật dẫn tới một chức năng cụ thể của AntGo làm bằng chứng.
- Không chép nguyên slide. Trích dẫn giáo trình `Angular Development with TypeScript` (Fain & Moiseev, 2018) và tài liệu chính thức Angular/Express/MongoDB.

## Bảng đối chiếu theo chương

| Chương slide | Kỹ thuật slide dạy | AntGo đã dùng (nơi tìm bằng chứng) | Ghi chú |
|---|---|---|---|
| **I. Giới thiệu Angular** | Angular là gì, lịch sử, kiến trúc thành phần, cài đặt, cấu trúc dự án, tạo Component | Dự án `client/` dạng NgModule (`app-module.ts`, `app-routing-module.ts`); component dùng chung `item-card`, `job-card`, `drawers`, `address-picker` | → mục 2.3 + sơ đồ kiến trúc 3.3 |
| **II. Kỹ thuật lõi** | Binding property/class/style/event/two-way, ngIf, ngSwitch, ngFor, Component Interaction | `ngModel` (11 file), `@if/@for/@switch` (control flow mới), `@Input`/`@Output` giữa thẻ và trang cha, `queryParams` | Nói rõ dùng cú pháp mới `@if/@for` thay `*ngIf/*ngFor` |
| **III. Services** | Chia sẻ dữ liệu giữa view, tạo/gọi Service, Service với HTTP, xử lý lỗi | `services/`: `current-user`, `saved` (cập nhật ngay, lỗi thì trả lại), `address`, `xu`, `drawer`, `inbox`, `shop`, `ApiService` | Ví dụ đẹp: **optimistic update + rollback** của `saved` |
| **IV. Routing** | SPA, `:id`, redirect, query params + filter, wildcard `**`, nested, lazy loading, guards | Có: `/bai/:id`, `/viec/:id`, `/gian-hang/:id`, `/don-hang/dat/:id`, `/tim-kiem?q=&type=`, `/don-hang?f=`, wildcard `**`. **[CHƯA CÓ]**: lazy loading, guards, slug SEO | Bảng route 14 đường dẫn đã có ở `CLAUDE.md` mục 2.3d |
| **V. FORM** | Template-driven, Reactive Forms, validation, custom/cross-field validation, post form | Chỉ **Template-driven** (`ngModel`): địa chỉ, đề nghị nhận việc, hỏi đáp (chặn SĐT), báo cáo hỗ trợ, đánh giá. **[CHƯA CÓ]**: Reactive Forms | Nếu muốn khớp slide hơn: chuyển form địa chỉ sang Reactive + custom validator SĐT 10 số **[ĐỀ XUẤT, chưa làm]** |
| **VI. RESTful API** | MVC, REST, gọi API ngoài, Express, nodemon, morgan, CRUD GET/POST/PUT/DELETE | Express 5, `server/routes/` (posts, jobs, offers, orders, users, messages), CRUD đơn/đề nghị/địa chỉ (`PATCH/DELETE addresses`), `cors`. **[CHƯA CÓ]**: nodemon, morgan | Bảng API (phương thức, đường dẫn, mô tả) nên làm cho mục 4.2 |
| **VII. MongoDB** | NoSQL, cài đặt, kết nối Node, CRUD MongoDB | Mongoose 9, 11 model trong `server/models/` (User, Post, Job, Offer, Order, Address, Review, Question, Conversation, Notification, Report), `seed.js` | Số model là **11**, outline cũ ghi 6 → cập nhật. Vẽ ERD từ đây |
| **VIII. Cookie & Session** | Tạo/đọc Cookie, Session | **[CHƯA CÓ]** — chưa đăng nhập, dùng tài khoản demo `GET /api/users/me`; `localStorage` chỉ lưu `antgo_xu`, `antgo_follow` | Ghi vào Hạn chế (mục 5) + Hướng phát triển (đăng nhập, session/JWT) |
| CLO3 Máy học | Không có chương riêng (chỉ nhắc ở mục tiêu môn) | **[CHƯA CÓ]** — tìm bằng ảnh chỉ mô phỏng | Phải nói thẳng trong Hạn chế, tránh hứa |

## Gợi ý khung báo cáo bám slide

**Chương 2 – Cơ sở lý thuyết** (mỗi mục 1/2–1 trang, kèm 1 hình/đoạn mã ngắn của AntGo)
1. Kiến trúc client–server, SPA, REST (slide IV, VI)
2. Angular: component, module, binding, directive, control flow (slide I, II)
3. Service và HTTP client (slide III)
4. Routing và tham số (slide IV)
5. Form và validation (slide V)
6. Express + MVC (slide VI)
7. MongoDB + Mongoose (slide VII)
8. Xác thực: cookie/session — nêu lý thuyết, ghi "AntGo chưa áp dụng" (slide VIII)

**Chương 3–4 – bằng chứng bám slide**
- Sơ đồ 3 lớp Angular → REST → MongoDB (slide I, VI, VII)
- Bảng route (slide IV) · bảng service (slide III) · bảng API (slide VI) · ERD 11 model (slide VII)
- Luồng đặt đơn: form hộp "Xác nhận đơn hàng" → `POST /api/orders` → server tự tính tiền (`priceOrder`) — minh họa V + VI + VII trong một luồng
- Luồng nhận việc: hỏi đáp công khai → đề nghị → máy trạng thái 5 bước

## Việc nên làm để báo cáo mạnh hơn (hỏi nhóm trước khi làm)

1. Thêm `morgan` + `nodemon` vào server — rất rẻ, khớp slide VI.
2. Một form Reactive có custom validator (SĐT) — phủ nốt slide V.
3. Một guard đơn giản (vd. chặn vào `/don-hang` khi chưa chọn tài khoản) + `loadChildren` cho vài trang — phủ slide IV. Chỉ làm nếu nhóm thấy cần, không làm chỉ để cho đủ.
4. Đăng nhập bằng session/cookie — phủ slide VIII, nhưng là việc lớn.
