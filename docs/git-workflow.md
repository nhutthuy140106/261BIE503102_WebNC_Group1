# Quy trình Git của nhóm

Repo: https://github.com/nhutthuy140106/261BIE503102_WebNC_Group1

## Nhánh

| Nhánh | Vai trò |
|---|---|
| `main` | Bản ổn định, chạy được, dùng để nộp/demo. Chỉ nhận merge từ `dev` (hoặc `hotfix/*`) qua Pull Request |
| `dev` | **Nhánh mặc định** — nơi tích hợp. Mọi tính năng gộp vào đây |
| `feature/<tên-tính-năng>` | Mỗi tính năng một nhánh, tách từ `dev`, ví dụ `feature/client-order-list` |
| `fix/<mô-tả>` | Sửa lỗi nhỏ, tách từ `dev` |
| `hotfix/<mô-tả>` | Sửa lỗi gấp trên `main`, xong gộp về cả `main` và `dev` |
| `release/<phiên-bản>` | (Tuỳ chọn) chốt bản trước khi nộp |

Đặt tên nhánh: chữ thường, không dấu, nối bằng `-`.

## Quy tắc

1. Không push trực tiếp vào `main` và `dev`; tạo nhánh, mở Pull Request vào `dev`, nhờ ít nhất 1 bạn xem.
2. Một PR = một việc nhỏ, mô tả rõ làm gì và cách kiểm tra.
3. Trước khi mở PR: `cd client && npm run build && npm test -- --no-watch` phải qua.
4. Thông điệp commit theo dạng `loại: nội dung` — `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
5. Không commit bí mật (`.env`, mật khẩu, chuỗi kết nối Atlas) — dùng `.env.example`.

## Lệnh thường dùng

```bash
git switch dev && git pull
git switch -c feature/ten-tinh-nang
# ...làm việc...
git add <file> && git commit -m "feat: mô tả"
git push -u origin feature/ten-tinh-nang   # rồi mở Pull Request vào dev
```
