# AntGo — Nền tảng giao nhận nội khu

Đồ án môn Web (261BIE503102) — Nhóm 1. Ứng dụng kết nối hàng xóm trong khu: đặt món, thuê dịch vụ, nhận việc vặt.

## Công nghệ

Angular (client) · Express (server) · MongoDB (database)

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `client/` | Giao diện Angular (đồ án chính) |
| `server/` | API Express + MongoDB (đồ án chính) |
| `docs/` | Tài liệu: `pccv/` (bảng phân công), `thiet-ke/` (Use Case, BPMN, DFD, ERD), `bao-cao/`, `tham-khao/`, cùng `user-flows.md`, `handoff.md` |
| `design/mockups/` | Bản mẫu giao diện HTML thuần — chỉ để tham khảo thiết kế, mở file `.html` là xem được |
| `tools/` | `shot.sh` chụp ảnh kiểm tra giao diện |

## Quy tắc làm việc nhóm

- Nhánh mặc định là `dev`; `main` chỉ chứa bản ổn định. Mỗi người làm trên nhánh `feature/ten-tinh-nang`, xong gộp vào `dev` bằng Pull Request. Chi tiết: `docs/git-workflow.md`.
- Ghi chú làm việc chi tiết: xem `CLAUDE.md`.

## Chạy dự án

Cần cài sẵn: **Node.js (bản LTS mới nhất)** và **MongoDB** (local `mongodb://127.0.0.1:27017`, hoặc Atlas).

### Cách 1 — Chạy đầy đủ (giao diện + API + MongoDB) — dùng để xem dữ liệu thật

Mở 3 cửa sổ terminal, chạy **theo thứ tự**:

```bash
# 1) MongoDB: bật dịch vụ MongoDB (Windows: services.msc → MongoDB Server → Start; hoặc chạy `mongod`)

# 2) API  → http://localhost:3000  (tài liệu Swagger: http://localhost:3000/api-docs)
cd server
npm install
cp .env.example .env        # lần đầu: sửa .env, đặt SESSION_SECRET và SEED_PASSWORD (mật khẩu cho tài khoản mẫu)
npm run seed                # nạp dữ liệu mẫu (chạy lại được để đưa dữ liệu về như ban đầu)
npm start                   # hoặc `npm run dev` (tự khởi động lại khi sửa code)

# 3) Giao diện → http://localhost:4200
cd client
npm install
npm start                   # ng serve; /api được chuyển sang http://localhost:3000 qua proxy.conf.json
```

Mở **http://localhost:4200** rồi đăng nhập bằng **số điện thoại + mật khẩu** (mật khẩu = giá trị `SEED_PASSWORD` bạn đặt trong `server/.env`):

| Số điện thoại | Vai trò |
|---|---|
| `0900000001` | Ngọc Thủy — người mua (có sẵn đơn, đề nghị nhận việc, tin nhắn, thông báo) |
| `0900000002` | Bếp Cô Lan — người bán |
| `0900000004` | Chị Hoa — người đăng việc |
| `0900000005` | Quốc Anh |
| `0900000099` | admin |

Danh sách đầy đủ tài khoản mẫu: `server/README.md`. Đăng ký tài khoản mới cũng dùng số điện thoại (10 số, bắt đầu bằng 0).

### Cách 2 — Chỉ chạy giao diện (dữ liệu mẫu, không cần server/MongoDB)

Mở `client/src/app/core/config/api.config.ts`, đổi `export const USE_MOCK = false;` thành `true`, rồi:

```bash
cd client && npm install && npm start     # http://localhost:4200
```

Dữ liệu đọc từ `client/public/datasets/*.json`; mọi thao tác (đặt đơn, đề nghị, tin nhắn…) chỉ lưu trong trình duyệt (`localStorage` khóa `antgo_mock_*`). Đăng nhập bằng số điện thoại bất kỳ + mật khẩu từ 6 ký tự. Muốn quay về dữ liệu gốc: xóa các khóa `antgo_mock_*` trong DevTools → Application → Local Storage.

> Khu **Bán & Đăng việc** (`/seller`) hiện luôn dùng dữ liệu mẫu trong trình duyệt (chưa có API phía Bán), kể cả ở Cách 1.

### Cách 3 — Bật từng phần API thật

Trong `api.config.ts`, giữ `USE_MOCK = true` rồi bật riêng từng service: `MOCK_OVERRIDES = { address: false, post: false }`. Tên service: `auth, post, order, offer, address, saved, question, review, chat, notification, report, upload, recommend, seller`.

### Kiểm thử và đóng gói

```bash
cd client && npm test -- --no-watch     # test giao diện/logic (Vitest)
cd client && npm run build              # bản build production
cd server && npm test                   # test API (dùng MongoDB trong bộ nhớ, không cần Mongo thật)
```

### Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Đăng nhập báo **"Số điện thoại hoặc mật khẩu không đúng"** (HTTP 401) | Phải nhập **số điện thoại** (không phải tên), mật khẩu là `SEED_PASSWORD` trong `server/.env`. Nếu đổi `SEED_PASSWORD` sau khi đã seed thì chạy lại `npm run seed`. |
| Trang trắng / "Không kết nối được máy chủ" | Server chưa chạy hoặc MongoDB chưa bật: kiểm tra `http://localhost:3000/api/health` trả `{"ok":true}`. |
| Terminal ghi `ECONNREFUSED 127.0.0.1:3000` (proxy) | Chưa bật `server` — chạy `npm start` trong `server/` rồi tải lại trang. |
| `Port 4200 is already in use` | Đã có một `ng serve` khác đang chạy: tắt nó, hoặc `npm start -- --port 4300` (nhớ đổi `CLIENT_ORIGIN` trong `server/.env` nếu gọi API trực tiếp). |
| `Mongo` báo không kết nối được | Bật MongoDB, kiểm tra `MONGODB_URI` trong `server/.env`. |
| Dữ liệu cũ/lạ khi dùng chế độ mock | Xóa khóa `antgo_mock_*` trong Local Storage (xem Cách 2). |
| Đăng nhập xong vẫn bị đưa về trang đăng nhập | Phải mở giao diện qua `http://localhost:4200` (cùng nguồn với proxy) để cookie phiên hoạt động; không mở trực tiếp cổng khác. |
