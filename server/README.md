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

- **Dữ liệu mẫu** (`src/seeds/data.js` + `seed.js`): 18 tài khoản (1 admin, 1 bị khóa, 16 người dùng), 25 bài (11 đồ ăn/uống, 8 đồ dùng, 6 dịch vụ, 1 bị gỡ), 12 việc, và dữ liệu giao dịch để xem được ngay: 18 đơn đủ trạng thái, 13 đề nghị nhận việc, 12 đánh giá (có phản hồi), hỏi đáp, tin nhắn (1 tin chưa đọc), thông báo, báo cáo + nhật ký admin. Tài khoản chính để thử: `0900000001` (Ngọc Thủy). Seed chỉ xóa và tạo lại dữ liệu của chính các tài khoản mẫu, không đụng người dùng thật.
- Cần MongoDB đang chạy (local hoặc Atlas). Không kết nối được thì server in lỗi rõ ràng và thoát.
- Tài khoản seed (mật khẩu = `SEED_PASSWORD` trong `.env`, không viết cứng trong repo): `0900000001` Ngọc Thủy (người mua), `0900000002` Bếp Cô Lan, `0900000004` Chị Hoa, `0900000005` Quốc Anh, `0900000099` **admin**.
- Xác thực bằng **session cookie** (`connect.sid`, httpOnly, lưu phiên trong MongoDB bằng `connect-mongo`). FE gọi kèm `withCredentials`; CORS chỉ cho `CLIENT_ORIGIN`.
- `requests.http` là bộ request mẫu (VS Code "REST Client").

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
test/   flow, extra, seed (3 bộ test); fixture.js là bộ dữ liệu nhỏ cố định chỉ dùng cho test
```

## Quy ước

- Thành công `{ data, meta? }`, lỗi `{ error: { code, message, details? } }`; mã lỗi ở `api-buyer-job.md` Mục 0.
- Gợi ý bài: `../docs/thuat-toan-goi-y.md`. Ảnh tải lên lưu ở `public/images/uploads/` (không đưa lên git).
- Tổng tiền đơn tính ở server; địa chỉ chính xác của việc chỉ có trong `/offers/:id` khi đề nghị ở `chosen` trở lên.
- Route `/api/dev/*` chỉ bật khi `NODE_ENV` khác `production`.
