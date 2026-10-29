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

Giao diện **mặc định dùng dữ liệu mẫu** (xem Cách 2). Để nối với API thật, mở **http://localhost:4200/?mock=0** một lần (trình duyệt nhớ lựa chọn); mở `?mock=1` để quay lại dữ liệu mẫu. Sau đó đăng nhập bằng **số điện thoại + mật khẩu** (mật khẩu = giá trị `SEED_PASSWORD` bạn đặt trong `server/.env`):

| Số điện thoại | Vai trò |
|---|---|
| `0900000001` | Ngọc Thủy — người mua (có sẵn đơn, đề nghị nhận việc, tin nhắn, thông báo) |
| `0900000002` | Bếp Cô Lan — người bán |
| `0900000004` | Chị Hoa — người đăng việc |
| `0900000005` | Quốc Anh |
| `0900000099` | admin |

Danh sách đầy đủ tài khoản mẫu: `server/README.md`. Đăng ký tài khoản mới cũng dùng số điện thoại (10 số, bắt đầu bằng 0).

### Chatbot tư vấn (trợ lý AntGo)

Nút con kiến ở góc phải dưới mở khung chat tư vấn món ăn, đồ dùng, dịch vụ, việc làm trong khu; trong khung có thêm nút "Chưa biết ăn gì? Quay món" (trang `/quay-mon`). Chatbot cần chạy Cách 1 với `?mock=0` và phải đăng nhập. Chế độ chọn bằng `ASSISTANT_MODE` trong `server/.env`:

| Chế độ | Cách hoạt động | Chi phí |
|---|---|---|
| `auto` (mặc định) | **Lai:** câu quen thuộc (chào hỏi, đơn của tôi, chọn giúp, tìm món khớp rõ) bộ luật trả ngay; câu lạ/gõ sai/mơ hồ mới gọi AI. Thứ tự AI:  **Gemini** (`GEMINI_API_KEY`) → **nhà cung cấp kiểu OpenAI như Groq** (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, ví dụ `openai/gpt-oss-120b`) → **bộ trả lời cơ bản**; bước nào thiếu khóa hoặc lỗi thì chuyển sang bước sau | Gói miễn phí của Google / Groq |
| `llm` | Chỉ dùng nhà cung cấp kiểu OpenAI, lỗi thì báo lỗi | Gói miễn phí của Groq |
| `gemini` | Bắt buộc dùng Gemini; thiếu khóa hoặc lỗi thì báo lỗi | Gói miễn phí của Google |
| `local` | Luôn dùng **bộ cơ bản**: hiểu câu hỏi bằng quy tắc (loại bài, khoảng giá "dưới 50k", bữa ăn, từ khóa), tìm và xếp hạng trong bài đăng thật | Miễn phí, không cần khóa |

Cả hai bộ đều chỉ tư vấn từ bài đăng thật trong cơ sở dữ liệu (Gemini gọi công cụ tìm bài, không tự bịa món).

Bật Gemini: vào https://aistudio.google.com → "Get API key", rồi thêm vào `server/.env` dòng `GEMINI_API_KEY=<khóa>` (đổi model bằng `GEMINI_MODEL`, mặc định `gemini-3.8-flash`; các bản 2.5 Google đã ngừng cho tài khoản mới, và một số model mới có thể đòi bật thanh toán trên dự án Google) và khởi động lại server. **Không commit khóa lên GitHub** (`.env` đã được `.gitignore` chặn). Server giới hạn 12 lượt/phút mỗi IP, tin tối đa 500 ký tự, nhớ 12 tin gần nhất; khóa chỉ gửi ở header, không nằm trong URL.

### Cách 2 — Chỉ chạy giao diện (dữ liệu mẫu, không cần server/MongoDB) — mặc định

```bash
cd client && npm install && npm start     # http://localhost:4200
```

Dữ liệu đọc từ `client/public/datasets/*.json`; mọi thao tác (đặt đơn, đề nghị, tin nhắn…) chỉ lưu trong trình duyệt (`localStorage` khóa `antgo_mock_*`). Đăng nhập bằng số điện thoại bất kỳ + mật khẩu từ 6 ký tự. Muốn quay về dữ liệu gốc: xóa các khóa `antgo_mock_*` trong DevTools → Application → Local Storage. Chatbot không trả lời thật ở chế độ này.

> Khu **Bán & Đăng việc** (`/seller`) hiện luôn dùng dữ liệu mẫu trong trình duyệt (chưa có API phía Bán), kể cả ở Cách 1.

### Cách 3 — Bật từng phần API thật

Trong `client/src/app/core/config/api.config.ts`, bật riêng từng service bằng `MOCK_OVERRIDES = { address: false, post: false }` (ghi đè chế độ mẫu/thật chung). Tên service: `auth, post, order, offer, address, saved, question, review, chat, notification, report, upload, recommend, xu, assistant, seller`.

### Kiểm thử và đóng gói

```bash
cd client && npm test -- --no-watch     # test giao diện/logic (Vitest)
cd client && npm run build              # bản build production
cd server && npm test                   # test API (dùng MongoDB trong bộ nhớ, không cần Mongo thật)
```

### Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Đăng nhập báo **"Số điện thoại hoặc mật khẩu không đúng"** (HTTP 401) | Đã mở `?mock=0` chưa? Phải nhập **số điện thoại** (không phải tên), mật khẩu là `SEED_PASSWORD` trong `server/.env`. Nếu đổi `SEED_PASSWORD` sau khi đã seed thì chạy lại `npm run seed`. |
| Trang trắng / "Không kết nối được máy chủ" | Server chưa chạy hoặc MongoDB chưa bật: kiểm tra `http://localhost:3000/api/health` trả `{"ok":true}`. |
| Terminal ghi `ECONNREFUSED 127.0.0.1:3000` (proxy) | Chưa bật `server` — chạy `npm start` trong `server/` rồi tải lại trang. |
| `Port 4200 is already in use` | Đã có một `ng serve` khác đang chạy: tắt nó, hoặc `npm start -- --port 4300` (nhớ đổi `CLIENT_ORIGIN` trong `server/.env` nếu gọi API trực tiếp). |
| `Mongo` báo không kết nối được | Bật MongoDB, kiểm tra `MONGODB_URI` trong `server/.env`. |
| Dữ liệu cũ/lạ khi dùng chế độ mock | Xóa khóa `antgo_mock_*` trong Local Storage (xem Cách 2). |
| Đăng nhập xong vẫn bị đưa về trang đăng nhập | Phải mở giao diện qua `http://localhost:4200` (cùng nguồn với proxy) để cookie phiên hoạt động; không mở trực tiếp cổng khác. |
