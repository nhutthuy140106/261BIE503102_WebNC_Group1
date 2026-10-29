# server

API Express + MongoDB (Mongoose) của AntGo — module **Người mua + Nhận việc**.
Tài liệu: `../docs/api-buyer-job.md` (hợp đồng API), `../docs/decisions.md` (quyết định + câu hỏi mở), `../docs/planning.md` (kế hoạch).

## Chạy

```bash
cd server
npm install
cp .env.example .env      # sửa MONGODB_URI; đặt SESSION_SECRET và SEED_PASSWORD
npm run seed              # nạp dữ liệu mẫu; chạy lại được, chỉ làm mới dữ liệu của tài khoản mẫu
npm run dev               # http://localhost:3000  — docs: /api-docs
npm test                  # test luồng chính; dùng MongoDB trong bộ nhớ, không cần cài Mongo
```

- **Dữ liệu mẫu** (`src/seeds/data.js` + `seed.js`): 18 tài khoản (1 admin, 1 bị khóa, 16 người dùng), 38 bài (16 đồ ăn/uống, 4 combo, 9 đồ dùng + 1 bị gỡ, 8 dịch vụ; 11 bài có Giờ vàng phủ mọi giờ trong ngày), 14 việc, và dữ liệu giao dịch để xem được ngay: đơn đủ trạng thái (waiting → declined, có 2 đơn `delivering` giao tận nơi tới Block khác nhau), 13 đề nghị nhận việc, 12 đánh giá (có phản hồi), hỏi đáp, tin nhắn (1 tin chưa đọc), thông báo, báo cáo + nhật ký admin. Tài khoản chính để thử: `0900000001` (Ngọc Thủy). Seed chỉ xóa và tạo lại dữ liệu của chính các tài khoản mẫu, không đụng người dùng thật.
- Cần MongoDB đang chạy (local hoặc Atlas). Không kết nối được thì server in lỗi rõ ràng và thoát.
- Tài khoản seed (mật khẩu = `SEED_PASSWORD` trong `.env`; `.env.example` đặt sẵn mật khẩu chung của nhóm `Antgo@2026` chỉ để demo/dev): `0900000001` Ngọc Thủy (người mua), `0900000002` Bếp Cô Lan, `0900000004` Chị Hoa, `0900000005` Quốc Anh, `0900000099` **admin**.
- Xác thực bằng **session cookie** (`connect.sid`, httpOnly, lưu phiên trong MongoDB bằng `connect-mongo`). FE gọi kèm `withCredentials`; CORS chỉ cho `CLIENT_ORIGIN`.
- `requests.http` là bộ request mẫu (VS Code "REST Client").

## Biến môi trường (`.env`, mẫu ở `.env.example`)

| Biến | Ý nghĩa |
|---|---|
| `PORT`, `MONGODB_URI`, `CLIENT_ORIGIN` | Cổng, chuỗi kết nối Mongo, origin FE được CORS cho phép |
| `SESSION_SECRET` | Bắt buộc khi `NODE_ENV=production` |
| `SEED_PASSWORD` | Mật khẩu tài khoản mẫu (≥ 6 ký tự) |
| `ASSISTANT_MODE` | `auto` (Gemini → LLM → bộ cơ bản) · `gemini` · `llm` · `local`. Chế độ ép buộc mà thiếu khóa → 503 `ASSISTANT_UNAVAILABLE` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Chatbot dùng Google Gemini (có gói miễn phí); để trống thì bỏ qua bước này |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Nhà cung cấp khác theo chuẩn OpenAI (Groq, OpenRouter…) |

Không commit `.env` hay khóa API.

## Bảo mật (đối chiếu KT 9.3)

| Hạng mục | Trạng thái |
|---|---|
| Mật khẩu băm `bcryptjs`; không bao giờ trả `password` | Đạt |
| Phiên cookie `httpOnly`, `sameSite=lax`, `secure` khi production; `saveUninitialized:false` | Đạt |
| `helmet` (CSP tắt vì là API JSON + Swagger) | Đạt |
| Rate limit: đăng nhập 10 lần/15 phút, đăng ký 20 lần/giờ mỗi IP (tắt khi test) | Đạt |
| Validate đầu vào bằng zod (whitelist field); `:id` kiểm ObjectId → 400 | Đạt |
| Quyền theo vai trò (`requireRole`) và theo chủ sở hữu (đơn, đề nghị, hội thoại, địa chỉ, đánh giá, tracking) → 403 | Đạt |
| Không lộ chi tiết lỗi nội bộ: 500 luôn trả "Lỗi máy chủ", chi tiết chỉ ghi log | Đạt |
| Chống NoSQL injection: ép kiểu bằng zod trước khi truy vấn | Đạt |
| Upload ảnh: server tự sinh tên, giới hạn loại/kích thước | Đạt |
| Game Xu: lượt/ngày, trần Xu, điểm tối đa do server kiểm | Đạt |
| CSRF token | Hoãn (dùng `sameSite=lax` + CORS đích danh origin) |
| Giới hạn tốc độ toàn API, khóa tài khoản sau nhiều lần sai | Hoãn |

## Cấu trúc

```
src/
  app.js, server.js
  config/        env, db, swagger
  middlewares/   auth (session: auth/optionalAuth/requireRole), validate (zod + kiểm tra ObjectId), errorHandler, notFound
  utils/         ApiError, asyncHandler, pagination
  modules/
    auth/        đăng ký, đăng nhập, đăng xuất, profile (session)
    admin/       quản lý người dùng, kiểm duyệt bài + báo cáo, thống kê (chỉ role admin)
    shared/      User, Post, Job, Counter, notify — model dùng chung, CHỈ sửa khi cả nhóm đồng ý
    buyer/       address, saved, catalog (posts/jobs/search), cart (nháp trong session), order, offer, question, review, chat, notification, report, upload, recommend
    dev/         route TẠM thay cho phía Bán/Đăng việc (đẩy đơn, chọn người, trả lời hỏi đáp) — xóa khi hai module kia xong
  seeds/seed.js
test/   flow, extra, seed, assistant, pricing, smart-search, xu, tracking; fixture.js là bộ dữ liệu nhỏ cố định chỉ dùng cho test
```

## Quy ước

- Thành công `{ data, meta? }`, lỗi `{ error: { code, message, details? } }`; mã lỗi ở `api-buyer-job.md` Mục 0.
- Gợi ý bài: `../docs/thuat-toan-goi-y.md`. Ảnh tải lên lưu ở `public/images/uploads/` (không đưa lên git).
- Tổng tiền đơn tính ở server; địa chỉ chính xác của việc chỉ có trong `/offers/:id` khi đề nghị ở `chosen` trở lên.
- Route `/api/dev/*` chỉ bật khi `NODE_ENV` khác `production`.
