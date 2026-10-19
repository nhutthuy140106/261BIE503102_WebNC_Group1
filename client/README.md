# client — Angular (AntGo)

Giao diện AntGo dựng theo môn học: **Angular, NgModule** (`--no-standalone`), routing, `HttpClient`, Reactive Forms. Bản mẫu giao diện để đối chiếu nằm ở `design/mockups/`.

## Chạy

```bash
cd client
npm install
npm start          # http://localhost:4200
npm test -- --no-watch
npm run build
```

**Nguồn dữ liệu** do `src/app/core/config/api.config.ts` quyết định: `USE_MOCK = false` (mặc định) gọi API Express qua `proxy.conf.json` (`/api` → `http://localhost:3000`, cần bật `server/` + MongoDB); `USE_MOCK = true` đọc `public/datasets/*.json` và lưu thao tác trong trình duyệt. Có thể bật riêng từng service bằng `MOCK_OVERRIDES`. Dữ liệu API được đổi sang model của FE ở `core/utils/api-mappers.ts`. Hướng dẫn đầy đủ (thứ tự bật, tài khoản mẫu, lỗi thường gặp): xem `README.md` ở thư mục gốc.

## Cấu trúc `src/app/`

| Thư mục | Nội dung |
|---|---|
| `core/models` | Interface dữ liệu: `Post`, `Order`, `User` (id là ObjectId 24 hex) |
| `core/services` | `PostService`, `OrderService`, `AuthService`, `CartService`, `SavedService` — gọi API có `retry(3)` + `catchError` |
| `core/guards` | `authGuard` (CanActivate, hỏi server qua `checkSession`), `pendingChangesGuard` (CanDeactivate cho form đang nhập dở) |
| `core/utils/slug-helper.ts` | `createSlug` / `resolveId` — URL dạng `ten-bai-<ObjectId>`; đã sửa chữ "đ" |
| `core/layout`, `core/not-found` | Header, footer, trang 404 (route `**`, đặt cuối) |
| `shared/` | `SharedModule` (Common, Forms, Router) + thẻ `PostCard`, `JobCard` (`@Input`/`@Output`) |
| `features/*` | Mỗi nhóm một module **tải lười**: `home`, `search` (lọc bằng query params), `posts` (`/posts/:slug`, `/posts/job/:slug`), `orders`, `messenger`, `notifications`, `profile`, `auth` (Reactive Form + cross-field validator), `seller` (route lồng nhau, không gian Bán & Đăng việc) |

## Route

| Đường dẫn | Ghi chú |
|---|---|
| `/` | Trang chủ |
| `/search?q=&kind=&min=&max=` | Tìm kiếm / lọc |
| `/posts/:slug`, `/posts/job/:slug` | Chi tiết bài (slug có ObjectId) |
| `/auth/login`, `/auth/register` | Đăng nhập, đăng ký |
| `/orders`, `/messenger`, `/notifications`, `/profile`, `/seller/**` | **Cần đăng nhập** (`authGuard`) |
| `**` | 404 |

## Còn thiếu (làm tiếp)

- Dựng giao diện chi tiết theo mockup (hiện là khung chức năng đơn giản).
- Gian hàng `/shop/:id`, ngăn kéo Đã lưu/AntXu, sổ địa chỉ, hộp xác nhận đặt hàng 2 bước.
- Nối backend thật (xem `docs/tham-khao/kien-thuc-mon-hoc-angular-express-mongodb.md`, mục 9 về bảo mật).
