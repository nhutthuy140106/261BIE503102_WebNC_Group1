# Hướng dẫn cho bạn nhóm: chạy dự án và sửa card cho đồng bộ

Việc giao: **test và sửa các card (bài đăng) cho đồng bộ với form đăng bài mới.** Làm trên máy của bạn, không cần chung database với Khải.

## 1. Lấy code và chạy lần đầu

```bash
git pull origin dev
git checkout -b feature/dong-bo-card      # làm trên nhánh riêng, đừng push thẳng dev
```

**Server** (thư mục `server/`):
1. Cần MongoDB cài trên máy và đang chạy (cổng 27017).
2. Chép `server/.env.example` thành `server/.env`. Giữ `MONGODB_URI=mongodb://127.0.0.1:27017/DoAnWeb` và `SEED_PASSWORD=Antgo@2026`. Các khóa Gemini/Groq/Google có thể để trống.
3. Chạy:
   ```bash
   cd server
   npm install
   npm run seed     # nạp 23 user, 50 bài, 19 việc. Chạy lại sẽ xóa và nạp lại
   npm run dev
   ```

**Client** (thư mục `client/`):
```bash
cd client
npm install
npm start          # mở http://localhost:4200  (đúng cổng 4200)
```

- Mặc định client dùng **dữ liệu mẫu** (mock), chưa gọi server. Thêm `?mock=0` vào địa chỉ để gọi server thật, `?mock=1` để quay lại mẫu.
- Đăng nhập: số điện thoại của tài khoản mẫu + mật khẩu `Antgo@2026`. Có thể bỏ qua nút Google.

## 2. Sửa card ở đâu

Dữ liệu một bài nằm ở **3 nơi**, sửa nội dung giống nhau ở cả ba:

| File | Dùng cho |
|---|---|
| `client/public/datasets/posts.json` | khu Mua (card, chi tiết bài) |
| `client/public/datasets/seller-space.json` | khu Bán (nối với bài khu Mua qua `buyerPostId`) |
| `server/src/seeds/data.js` | seed vào MongoDB (chỉ giữ trường cơ bản) |

Ảnh bài nằm ở `client/public/uploads/posts/`.

## 3. Hai việc bắt buộc mỗi lần sửa dữ liệu mẫu

1. **Tăng `DATA_VERSION`** trong `client/src/app/core/services/mock-db.ts` (dòng 8, hiện là `'2026-11-10-e'`, đổi thành `-f`…).
2. **Tăng `VERSION`** trong `client/src/app/core/services/seller-space.ts` (hiện là `'2026-11-10-c'`) **và** trường `version` trong `seller-space.json` cho khớp.

Không tăng thì localStorage cũ trong trình duyệt che mất dữ liệu mới. Nếu vẫn thấy dữ liệu cũ: mở cửa sổ ẩn danh, hoặc xóa các khóa `antgo_mock_*` trong localStorage.

## 4. Bẫy hiển thị khi card trông lạ

Xem `client/src/app/core/utils/template-for.ts`:
- Bài có **tên trùng tên mẫu** bị coi là bài mẫu gốc, các trường `items/highlights/place…` bị bỏ qua.
- Bài còn trường `template` cũ cũng bị mẫu đè.
- Muốn bài chạy theo dữ liệu thật: **đổi tên khác tên mẫu, bỏ `template`.**
- Mô tả có xuống dòng (•) đang hiện thành một đoạn liền, đây là lỗi đã biết.

## 5. Quy ước đã chốt

- Card bạn đăng là **chuẩn mẫu**.
- Mỗi bài có **bộ trường riêng** do người bán tự thêm (menu, nhóm tùy chọn, câu hỏi, dòng thông tin…). Không điền hàng loạt giống nhau.
- Đã làm xong: 11 bài của Bếp Cô Lan và 3 bài giặt sấy. **Còn khoảng 45 bài**, làm theo từng nhóm: đồ ăn/uống, rồi đồ dùng, rồi dịch vụ, rồi vài bài nhiều/không tùy chọn để thử giới hạn.
- **Thay số tài khoản và mã QR thật bằng bản mẫu** trước khi đưa vào repo. Không commit `docs/antgo-mock-export.json` (đã nằm trong gitignore).

## 6. Cách kiểm tra

1. Mở client, vào từng bài: card ở trang chủ, trang chi tiết, bước đặt hàng, khu Bán.
2. Bấm thử đặt đơn và xem trong Đơn hàng.
3. Bài nào lệch giữa khu Mua và khu Bán thì sửa lại cho khớp.

## 7. Đẩy code lên

Mỗi lần xong một nhóm:
```bash
git add <các file đã sửa>
git commit -m "feat(data): đồng bộ card nhóm đồ ăn với form mới"
git push origin feature/dong-bo-card
```
Báo Khải để gộp vào `dev`. Trước khi bắt đầu mỗi buổi, chạy `git pull origin dev`.

## 8. Chưa làm, cần bàn trước khi động vào

- Mở rộng model `Post` ở server: `stock` ở server là **số**, hợp đồng mới là object `{mode, left}`.
- Nối khu Bán vào server thật (hiện bài khu Bán lưu trong localStorage).
- Chung database (MongoDB Atlas): chưa cần, mỗi người một DB local.

Danh sách việc dang dở chi tiết nằm trong `CLAUDE.md`, mục 0d.
