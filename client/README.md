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

Hiện **chưa có backend**: `src/app/core/config/api.config.ts` đặt `USE_MOCK = true`, dữ liệu đọc từ `public/datasets/*.json`. Khi API Express + MongoDB xong: đổi `USE_MOCK = false` (API chạy ở `http://localhost:3000`, `proxy.conf.json` chuyển `/api` sang đó, tránh CORS).

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
