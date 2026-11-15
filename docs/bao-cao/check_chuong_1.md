# Đối chiếu Chương 1 với mã nguồn AntGo

> **Đối tượng kiểm tra:** `docs/bao-cao/Chuong-1-Gioi-thieu-v4.docx` (chỉ đọc, không sửa).
> **Mã nguồn:** nhánh `dev` (commit `d35d1d5`), kiểm tra ngày 05/11/2026. Đường dẫn tính từ thư mục gốc dự án.
> **Cách kiểm tra:** đọc mã và test; chạy `npm test` ở `server/`, `npm run eval:recommend` ở `server/`, `ng test --watch=false` ở `client/`.
> **Quy ước:** *Đúng* = tìm thấy bằng chứng khớp câu trong bài. *Sai* = bằng chứng khác với câu trong bài. *Chưa xác minh* = không tìm thấy trong code (không đoán). Câu có nhiều ý được tách thành nhiều dòng. Chỉ kiểm các câu nhắc đến sản phẩm; câu về thị trường và bối cảnh không nằm trong phạm vi.

## 0. Tóm tắt

**Kết quả chạy thật hôm nay**

| Lệnh | Kết quả |
|---|---|
| `npm test` (server, 13 tệp) | **79 ca, đạt 79, trượt 0** |
| `ng test --watch=false` (client, 18 tệp) | **77 ca, đạt 77, trượt 0** (CLAUDE.md từng ghi `ng test` lỗi build, nay đã chạy được) |
| `npm run eval:recommend` | 36 bài. **P@1 69,4%, P@3 73,1%, P@5 77,2%**, ngẫu nhiên 21,3% |

**Câu trong bài đang SAI so với code (nên sửa)**

1. Mục 1.2: "mỗi bài đều ghi rõ loại **ngay dưới tiêu đề**". Nhãn loại nằm ở đường dẫn phía **trên** tiêu đề.
2. Mục 1.3.1: việc làm cần "tiền công và **hạn chót**". Model không có trường hạn chót.
3. Mục 1.3.2: "người mua chỉ **hủy** hoặc nhắn tin được". Người mua chỉ **gửi yêu cầu hủy**.
4. Mục 1.4.3: tìm kiếm, gợi ý bài và gợi ý giá "dùng TF–IDF, cosine và kNN". Tìm kiếm không dùng cosine hay kNN.
5. Mục 1.5.2: "chỉ làm **một khu** chia thành các block A đến D". Client có 4 khu mẫu.
6. Mục 1.5.4: gợi ý "**chỉ** dựa trên chữ trong tên và mô tả bài". Điểm còn dùng loại, giá và khu.

**Đáng chú ý khác:** tài liệu `docs/thuat-toan-goi-y.md` ghi P@1/3/5 = 100% / 96,9% / 91,9% trên 32 bài. Chạy lại hôm nay ra 69,4% / 73,1% / 77,2% trên 36 bài. Tài liệu đó đã cũ, không dùng số cũ cho chương 4.

## 1. Bảng đối chiếu

| Mục | Câu/ý trong bài | Đúng / Sai / Chưa xác minh | Bằng chứng (file, dòng) | Gợi ý sửa nếu sai |
|---|---|---|---|---|
| 1.1.2 | "Một người có thể đứng ở cả hai phía… hệ thống không cần bắt họ lập hai tài khoản" | Đúng | `server/src/modules/shared/user.model.js:12` (vai trò chỉ `enduser`, `admin`, không có vai trò người bán). Lưu ý: client chặn vào khu Bán nếu chưa xác minh, `client/src/app/core/guards/seller-verified-guard.ts:7-17` | |
| 1.1.3 | "AntGo có nhiều trang, nhiều loại dữ liệu, nhiều trạng thái đơn, có đăng nhập và có phần gợi ý" | Đúng | `client/src/app/app-routing-module.ts:13-62` (17 module tải lười), `server/src/modules/buyer/order/order.model.js:4` (8 trạng thái), `server/src/modules/auth/auth.routes.js:124-129`, `server/src/modules/buyer/recommend/recommend.routes.js:37,40` | |
| 1.1.3 | "Angular, Express và MongoDB" | Đúng | `client/package.json` (Angular 22), `server/package.json` (`express ^5.3.0`, `mongoose ^9.11.2`) | |
| 1.2 | "ứng dụng web cho cư dân trong cùng một khu" | Đúng | `server/src/modules/shared/post.model.js:24` (`area` bắt buộc), `server/src/modules/buyer/catalog/catalog.service.js:28` (lọc theo khu) | |
| 1.2 | Khẩu hiệu "Một khu, một nhà" | Đúng | `client/src/app/features/landing/landing/landing.html:52` (dòng bắt đầu "Một khu,"; phần sau dòng này tôi chưa đọc hết), `design/mockups/landing.html:6` (tiêu đề "AntGo — Một khu, một nhà") | |
| 1.2 | "linh vật là con kiến" | Đúng | `client/src/app/features/landing/landing/landing.html:52` (`assets/clean/ant-tile.png`), `client/public/assets/garden/ant-joy.png` | |
| 1.2 | "Mỗi người dùng một tài khoản và chuyển giữa hai không gian bằng công tắc Mua \| Bán trên thanh menu" | Đúng | `client/src/app/core/layout/header/header.ts:32` (công tắc theo không gian đang ở, `/seller` là Bán) | Có thể thêm: vào khu Bán cần xác minh người bán (`seller-verified-guard.ts:7-17`) |
| 1.2 | Bảng 1.1: có bốn loại bài | Đúng | Client: `client/src/app/core/models/post.ts:4-11` (`food`, `goods`, `service`, `job`). Server: `post.model.js:16` (3 loại bài) và `job.model.js` (việc làm là model riêng) | |
| 1.2 | Bảng 1.1, đồ ăn: "Chọn món và tùy chọn" | Đúng | `post.model.js:8-14` (`optionGroup`) | |
| 1.2 | Bảng 1.1, đồ ăn: "nhận hoặc giao tận nơi" | Đúng | `post.model.js:30` (`fulfillmentModes`: `delivery`, `pickup`), `order.model.js:20` | |
| 1.2 | Bảng 1.1, đồ dùng: "Đặt đơn, thường bán một lần" | Đúng | `post.model.js:34` (`oneTime`, mặc định `false`), `server/src/seeds/data.js:85-88` (bài đồ dùng mẫu) | |
| 1.2 | Bảng 1.1, dịch vụ: "Chọn ngày giờ trong khung người làm cho phép" | Chưa xác minh | Server chỉ có `post.model.js:32` (`needSchedule`) và `order.model.js:22` (`scheduledAt`). Chưa thấy trường "khung giờ người làm cho phép" ở server | Có thể đổi thành "Chọn ngày giờ hẹn" |
| 1.2 | Bảng 1.1, việc làm: "Người nhận gửi đề nghị" | Đúng | `server/src/modules/buyer/offer/offer.routes.js:120` | |
| 1.2 | Bảng 1.1, việc làm: "người đăng chọn người" | Chưa xác minh | Phía người đăng chưa có API thật. Chỉ có route mô phỏng `server/src/modules/dev/dev.routes.js:113` (`choose`), route `/api/dev` không gắn khi chạy production (`server/src/app.js:51`) | Giữ nếu mô tả quy trình thiết kế, nhưng 1.5.4 đã nêu giới hạn |
| 1.2 | "mỗi bài đều ghi rõ loại **ngay dưới tiêu đề**" | **Sai** | `client/src/app/features/posts/post-detail/post-detail.html:8` (nhãn loại nằm ở đường dẫn phía **trên**), dưới tiêu đề (dòng 14-20) là điểm đánh giá, số đã bán, khu. Trang việc làm `job-detail.html:12-16` dưới tiêu đề là khu, ngày đăng, hạn; chưa thấy nhãn "Việc làm" | "mỗi bài đều ghi rõ loại ở đường dẫn phía trên tiêu đề" |
| 1.2 | "Dịch vụ do người làm đăng sẵn… việc làm do người cần việc đăng" | Đúng | `post.model.js:16,23` (dịch vụ có `seller`), `job.model.js` (`poster`), `offer.routes.js:120` | |
| 1.2.1 | "một cư dân ở block B có thể đặt phần cơm trưa của một bếp nhà làm" | Đúng | `server/test/seed.test.js:96` (bài "Cơm nhà làm…" đặt được), `server/src/modules/buyer/order/order.routes.js:112` | |
| 1.2.1 | "buổi tối gửi đề nghị nhận việc trông mèo cho một nhà ở block A" | Đúng | Việc "Cho mèo ăn 3 ngày khi đi vắng" có trong dữ liệu thử, `server/test/fixture.js:71`; gửi đề nghị: `offer.routes.js:120`. Việc đó thuộc block nào thì tôi chưa kiểm | |
| 1.2.1 | "theo dõi cả hai trong mục Đơn hàng" | Chưa xác minh | Có route `orders` (`app-routing-module.ts:23`). CLAUDE.md §2 ghi mục này gồm cả "Việc đã nhận", nhưng tôi chưa đọc code `client/src/app/features/orders/` | |
| 1.2.2 | "Bán và Đăng việc… đăng bài, xử lý đơn và chọn người nhận việc" | Đúng | Phía client: `client/src/app/core/services/seller.ts:76,91,166,170,189,193` | |
| 1.2.2 | "hiện chạy bằng dữ liệu mẫu vì server chưa có API cho phía Bán" | Đúng | `client/src/app/core/config/api.config.ts:40-43` (`seller: true` luôn dùng mẫu), `client/src/app/core/services/seller-space.ts:126-127`, server không có route `/seller` (`server/src/app.js:48-51`, `server/src/modules/buyer/index.js:2-18`) | |
| 1.2.3 | "dùng chung đăng nhập, hồ sơ, sổ địa chỉ, thông báo, Messenger, AntXu và gian hàng công khai" | Đúng | Client: `app-routing-module.ts:13-62` (`profile`, `notifications`, `messenger`, `xu`, `shop`). Server: `buyer/index.js:2-18` (địa chỉ, thông báo, hội thoại, xu) | |
| 1.2.3 | "Messenger là tính năng nhắn tin" | Đúng | `server/src/modules/buyer/chat/chat.routes.js` (`/api/conversations`) | |
| 1.2.3 | "AntXu là điểm thưởng dùng để đổi voucher" | Đúng | `server/src/modules/buyer/xu/xu.service.js:73-81` (`redeem`), `xu.model.js:8` (nguồn Xu: `welcome`, `game`, `order`, `review`, `job`), `server/test/xu.test.js:56` | |
| 1.2.3 | "đăng nhập bằng số điện thoại" | Đúng | `auth.routes.js:125`, `client/src/app/features/auth/login/login.html:19-22` | |
| 1.2.3 | "hoặc tài khoản Google" (có mã) | Đúng | `auth.routes.js:126-127`, `auth.service.js:30,41,54-58`, `login.html:1-13` | |
| 1.2.3 | Đăng nhập Google chạy được trọn vẹn | Chưa xác minh | Không có test cho Google (`grep google server/test` chỉ ra `assistant.test.js`, nói về Gemini). CLAUDE.md ghi chưa bấm thử đến cùng | Bấm thử trước khi nộp |
| 1.2.3 | "trang Quay món để chọn món khi chưa biết ăn gì" | Đúng | `app-routing-module.ts:18` (`quay-mon`), `client/src/app/features/spin/spin/spin.ts:46-56,279`, `server/test/assistant.test.js:261` (trợ lý chuyển sang Quay món) | |
| 1.2.3 | "khu vườn để nhận AntXu" | Đúng | Hái xu qua server: `client/src/app/core/services/xu.ts:108-113`, `xu.service.js:6,59-69` (3 lượt/ngày, tối đa 30 Xu), `xu.test.js:42`. Tưới cây và thú cưng chỉ cộng ở client: `garden/pet-game/pet-game.ts:114`, `garden/tree-game/tree-game.ts:55,68`, `core/services/garden.ts:93` (lưu `localStorage`, "không có máy chủ") | Nếu nói "giới hạn lượt chơi ở server" thì chỉ đúng cho Hái xu |
| 1.2.3 | "trợ lý trả lời câu hỏi về món, dịch vụ và đơn hàng" | Đúng | `server/src/modules/buyer/assistant/assistant.tools.js` (`search_catalog`, `my_orders`, `pick_dish`), `assistant.test.js:58,197` | |
| 1.3.1 | "đồ ăn cần giờ nhận đặt" | Chưa xác minh | Có ở client: `client/src/app/core/utils/template-for.ts:41-45` ("Giờ nhận đặt"). Model `Post` ở server không có trường khung nhận đặt (`post.model.js:14-62`) | |
| 1.3.1 | "dịch vụ cần khung giờ" | Đúng | `post.model.js:32` (`needSchedule`), `order.model.js:22` (`scheduledAt`) | |
| 1.3.1 | "việc làm cần tiền công" | Đúng | `server/src/modules/shared/job.model.js:9` (`pay`) | |
| 1.3.1 | "việc làm cần … **hạn chót**" | **Sai** | `job.model.js:11-12` chỉ có `workTime` (chuỗi hiển thị) và `windows` (khung giờ). Không có trường hạn chót. Giao diện ghi nhãn "Hạn:" nhưng hiển thị ngày giờ làm (`job-detail.html:16`, pipe `jobWhen`) | "việc làm cần tiền công và thời gian làm" |
| 1.3.1 | "Tìm kiếm khớp chính xác khi đó trả về danh sách trống" | Đúng | `catalog.service.js:29` (tìm bằng regex trên chữ đã bỏ dấu), `:42` (chỉ khi `total === 0` mới chạy tìm thông minh) | |
| 1.3.2 | "đơn hàng… đi qua nhiều trạng thái" | Đúng | `order.model.js:4` (8 trạng thái), `offer.model.js:4-5` (4 trạng thái đang chạy, 4 trạng thái kết thúc) | |
| 1.3.2 | "ở cùng một trạng thái hai bên được làm những việc khác nhau" | Đúng | `order.service.js:208` (chỉ người đặt thao tác), `:194` (người bán, admin xem được) | |
| 1.3.2 | "khi đơn đang chờ xác nhận thì người mua chỉ **hủy** hoặc nhắn tin được" | **Sai** | `order.service.js:214-219` (người mua chỉ *gửi yêu cầu hủy*, "không tự hủy, không tự hoàn tiền"), `order.routes.js:66`. Nhắn tin: `chat.routes.js` | "người mua chỉ gửi được yêu cầu hủy hoặc nhắn tin" |
| 1.3.2 | "người bán mới là người xác nhận" | Chưa xác minh | Server không có API cho người bán xác nhận. Chỉ có route mô phỏng `dev.routes.js:74-86` (không chạy production, `app.js:51`). Phía Bán là dữ liệu mẫu: `client/src/app/core/services/seller.ts:170` | Giữ như quy tắc thiết kế; 1.5.4 đã nêu giới hạn |
| 1.3.2 | "Một bài đăng lại có thể sinh ra nhiều đơn hoặc nhiều đề nghị" | Đúng | `order.service.js:123` (tồn kho giảm theo từng đơn), `offer.model.js:23` (mỗi việc nhiều đề nghị, mỗi người chỉ một đề nghị đang hoạt động) | |
| 1.4.1 | "đơn hàng và công việc được theo dõi trên một hệ thống" | Đúng | `order.routes.js:112-126`, `offer.routes.js:120-134`, `server/test/tracking.test.js:38` | |
| 1.4.2 | Tìm bài: "lọc theo loại, khu và giá" | Đúng | `catalog.service.js:27-35` (`type`, `area`, `minPrice`, `maxPrice`) | |
| 1.4.2 | Tìm bài: "vẫn tìm ra bài khi gõ không dấu" | Đúng | `catalog.service.js:11-12` (bỏ dấu trước khi so khớp), `server/test/extra.test.js:70` ("slug + tìm không dấu") | |
| 1.4.2 | Tìm bài: "hoặc sai nhẹ" | Đúng | `server/src/utils/smart-search.js:35,87` (Levenshtein tối đa 2, từ từ 4 ký tự), `smart-search.test.js:19`, `assistant.test.js:213` | |
| 1.4.2 | "gõ 'lau nha' vẫn thấy bài 'Dọn nhà'" | Đúng | `smart-search.js:14` (nhóm đồng nghĩa "don nha / lau nha"), `smart-search.test.js:25` (kiểm "lau nhà" ra "don nha…"). Chưa có test API riêng cho đúng cặp này | |
| 1.4.2 | Đặt hàng: "chọn món, xác nhận đơn và theo dõi đơn đến khi hoàn thành" | Đúng | `order.routes.js:112-126`, `server/test/flow.test.js:91`, `tracking.test.js:38`. Các bước sau "chờ xác nhận" ở server chỉ chạy bằng route mô phỏng `dev.routes.js:74` | |
| 1.4.2 | Nhận việc: "hỏi đáp công khai" | Đúng | `server/src/modules/buyer/question/question.routes.js:44-50` (chặn số điện thoại dòng 12, 17), `flow.test.js:128` | |
| 1.4.2 | Nhận việc: "gửi đề nghị… làm việc đến khi nhận được công" | Đúng | `offer.routes.js:120,131-133` (`start`, `report-done`, `confirm-paid`), `flow.test.js:128,174` | |
| 1.4.2 | Đăng bài và xử lý giao dịch: "nhận gợi ý giá" | Đúng | `server/src/modules/buyer/pricing/pricing.service.js:6-7,40-46`, `server/test/pricing.test.js:31` | |
| 1.4.2 | Đăng bài và xử lý giao dịch: "đăng bài, xử lý đơn, chọn người nhận việc" | Chưa xác minh | Chỉ có ở client dùng dữ liệu mẫu (`seller.ts`); server không có API (`app.js:48-51`) | Phù hợp với giới hạn ở 1.5.4 |
| 1.4.2 | Quản trị: "khóa tài khoản, ẩn bài vi phạm và xử lý báo cáo" | Đúng | `server/src/modules/admin/admin.routes.js:102,144,192`, `server/test/extra.test.js:158` | |
| 1.4.3 | "Giao diện là ứng dụng Angular tổ chức theo module, component, service và routing" | Đúng | `app-routing-module.ts:13-62` (module tải lười), `client/src/app/core/services/`, `client/src/app/shared/components/` | |
| 1.4.3 | "API REST viết bằng Express 5… MongoDB qua Mongoose" | Đúng | `server/package.json` (`express ^5.3.0`, `mongoose ^9.11.2`), các tệp `*.model.js` | |
| 1.4.3 | "Tìm kiếm, gợi ý bài và gợi ý giá dùng các thuật toán… TF–IDF, cosine và kNN" | **Sai** (gộp sai) | Gợi ý bài: TF–IDF và cosine, `recommend.service.js:18-36,53`. Gợi ý giá: kNN với K = 7 và cosine, `pricing.service.js:6-7`. Tìm kiếm: Levenshtein, đồng nghĩa, trọng số IDF, **không** dùng cosine hay kNN, `smart-search.js:1-2,35,87` | "Gợi ý bài dùng TF–IDF và cosine, gợi ý giá dùng kNN, tìm kiếm dùng khoảng cách Levenshtein và từ đồng nghĩa" |
| 1.4.3 | "Trợ lý… câu quen thuộc do bộ luật trả lời còn câu lạ nhờ mô hình ngôn ngữ" | Đúng | `assistant.service.js:127-137`, `assistant.test.js:220,236` | |
| 1.4.3 | Cơ chế dự phòng của trợ lý (chương 1 chỉ nhắc ở 1.5.4 là "phụ thuộc khóa và dịch vụ bên ngoài") | Đúng (có ghi chú) | `assistant.service.js:142-157` (chế độ `auto`: Gemini, rồi LLM kiểu OpenAI, rồi bộ luật), `assistant.test.js:86,104,164` | Ở 1.5.4 nên ghi "khi thiếu khóa hoặc dịch vụ lỗi, trợ lý quay về bộ luật" để không bị hiểu là phụ thuộc cứng |
| 1.4.3 | "đăng nhập dùng *session cookie*" | Đúng | `server/src/app.js:24-31` (`express-session`, `connect-mongo`, `httpOnly`, `sameSite: 'lax'`, `secure` khi production), `auth.service.js:65-69` (đổi Session ID sau đăng nhập), `extra.test.js:39` | |
| 1.4.3 | "mật khẩu được băm trước khi lưu" | Đúng | `auth.service.js:12` (`bcrypt.hash`, 10 vòng). Test chỉ kiểm không trả mật khẩu ra ngoài (`extra.test.js:49`), chưa có test kiểm giá trị lưu là hash | |
| 1.4.3 | "API chỉ trả dữ liệu riêng tư như đơn hàng hay địa chỉ chính xác cho người có quyền xem" | Đúng | Đơn hàng: `order.service.js:194`, `tracking.test.js:64` (người ngoài nhận 403). Địa chỉ chính xác của việc: `catalog.service.js:75,78,86` (luôn loại `exactAddress`), `offer.service.js:35`, `offer.model.js:6` (`REVEAL_ADDRESS`) | |
| 1.4.4 | Bảng 1.2, mục tiêu "Tìm bài theo loại, tìm gần đúng, gợi ý giá" | Đúng | Xem các dòng 1.4.2 ở trên | |
| 1.4.4 | Bảng 1.2, mục tiêu "Luồng đặt hàng và nhận việc có ràng buộc trạng thái" | Đúng | `order.service.js:15` (`CANCELABLE`), `:237`, `offer.model.js:23`, `flow.test.js:128` ("máy trạng thái") | |
| 1.4.4 | Bảng 1.2, mục tiêu "Session, băm mật khẩu, phân quyền xem dữ liệu, quản trị" | Đúng | Xem các dòng 1.4.3 và 1.4.2 | |
| 1.5.1 | "Khách chưa đăng nhập: xem bài và tìm kiếm" | Đúng | `server/src/modules/buyer/catalog/catalog.routes.js:79-81` (`optionalAuth`), `app-routing-module.ts:13-21` (các trang công khai) | |
| 1.5.1 | "Người dùng đã đăng nhập: đặt hàng, nhận việc và nhắn tin" | Đúng | `order.routes.js:111` (`router.use(auth)`), `offer.routes.js:120`, `app-routing-module.ts:23-31` (`orders`, `messenger` có `authGuard`) | |
| 1.5.1 | "Người bán hoặc người đăng việc: đăng bài và xử lý giao dịch" | Đúng (phía client, dữ liệu mẫu) | `seller.ts:76-193` | |
| 1.5.1 | "Quản trị viên: quản lý người dùng và bài đăng" | Đúng | `admin.routes.js:100-104,143-145` | |
| 1.5.1 | "Ở server tài khoản chỉ có hai vai trò là người dùng thường và quản trị viên" | Đúng | `user.model.js:12` | |
| 1.5.1 | "bán hàng hay đăng việc… không phải một loại tài khoản riêng" | Đúng (ở server) | `user.model.js:12`. Client có bước xác minh người bán: `seller-verified-guard.ts:7-17`, `seller-verification.ts:11,30,37` (dữ liệu mẫu), server không có trường xác minh | Có thể thêm: người bán cần qua bước xác minh trước khi vào khu Bán |
| 1.5.2 | Giao dịch: đặt hàng, đề nghị nhận việc, đánh giá, hỏi đáp | Đúng | `order.routes.js`, `offer.routes.js`, `server/src/modules/buyer/review/review.routes.js:78`, `question.routes.js:44-50` | |
| 1.5.2 | Liên lạc: Messenger và thông báo | Đúng | `chat.routes.js`, `server/src/modules/buyer/notification/notification.routes.js:49-64` | |
| 1.5.2 | Điểm thưởng: AntXu và voucher | Đúng | `xu.routes.js:62-65`, `xu.service.js:73-81` | |
| 1.5.2 | Kiểm soát: báo cáo vi phạm và trang quản trị | Đúng | `server/src/modules/buyer/report/report.routes.js:80`, `admin.routes.js:190-194` | |
| 1.5.2 | "đồ án chỉ làm **một khu** chia thành các block A đến D" | **Sai** (nhẹ) | Client có 4 khu mẫu: `client/src/app/core/config/areas.ts:22-27` (KTX Khu A, KTX Khu B, Bcons gồm Block A–D, Vinhomes Grand Park), mặc định Bcons (`core/services/area.ts:41`). Server chỉ coi `area` là chuỗi ≤ 20 ký tự (`auth.validation.js:9`); dữ liệu seed dùng `A`, `B`, `C`, `D` và "Shop n" (`server/src/seeds/data.js`) | "Đồ án lấy khu Bcons với các block A đến D làm khu chính. Danh sách chọn khu ở client có thêm ba khu mẫu" |
| 1.5.3 | "ứng dụng web thiết kế ưu tiên màn hình máy tính" | Chưa xác minh | CLAUDE.md §3 ghi "thiết kế cho web máy tính", nhưng có 49 tệp chứa `@media` (có điều chỉnh cho màn hình nhỏ) | Giữ nếu nhóm xác nhận; hoặc bỏ cụm "ưu tiên" |
| 1.5.3 | "dữ liệu seed… tài khoản, bài đăng, việc làm, đơn, đề nghị, tin nhắn và đánh giá ở nhiều trạng thái" | Đúng | `server/src/seeds/` (tạo User, Post, Job, Order, Offer, Conversation, Review, thêm Question, Notification, Report, Address), `server/test/seed.test.js:43`, `seeds/seed-demo.js:50` | |
| 1.5.3 | "dữ liệu mẫu, tức các tệp JSON ở client dùng khi chưa có server" | Đúng | `client/src/app/core/config/api.config.ts:1-9`, `client/src/main.ts:10-19` (tự nhận diện server) | |
| 1.5.3 | "Ảnh minh họa lấy từ nguồn ảnh miễn phí" | Chưa xác minh | CLAUDE.md ghi dùng ảnh Unsplash; không có thông tin nguồn ảnh trong code | |
| 1.5.4 | "Phần Bán… còn đọc dữ liệu mẫu" | Đúng | `api.config.ts:40-43`, `seller-space.ts:126-127` | |
| 1.5.4 | "một số luồng giữa hai phía chưa dùng chung API" | Đúng | Người bán xác nhận đơn và chọn người nhận việc chỉ có route mô phỏng: `dev.routes.js:74,113,137,149` | |
| 1.5.4 | "AntGo không có cổng thanh toán và không giữ tiền" | Đúng | `order.model.js:26` (chỉ `cash`, `transfer`); tìm `momo`, `vnpay`, `zalopay`, `stripe`, `payos`, `paypal` trong `server/src` không thấy | |
| 1.5.4 | "quy tắc hoàn tiền và xử lý tranh chấp chưa đầy đủ" | Đúng | `order.model.js:31-32` (`cancelRequest`, `returnRequest` chỉ có trạng thái `pending/accepted/rejected`), không có logic hoàn tiền trong `server/src` | |
| 1.5.4 | "Hệ thống chưa được thử nghiệm với người dùng thật" | Chưa xác minh | Không có bằng chứng trong code. Nhóm tự xác nhận | |
| 1.5.4 | "Phần gợi ý **chỉ** dựa trên chữ trong tên và mô tả bài" | **Sai** | `recommend.service.js:8` (`W = { text: 0.6, type: 0.15, price: 0.15, area: 0.1 }`): chữ chiếm 60% điểm, còn lại là cùng loại, giá gần nhau, cùng khu. Chữ gồm tên, mô tả và danh mục (`post.model.js:64`) | "Phần gợi ý dựa chủ yếu trên chữ trong tên, mô tả và danh mục, cộng thêm loại bài, giá và khu" |
| 1.5.4 | "trọng số do nhóm chọn tay" | Đúng | `recommend.service.js:8` (hằng số cố định), `docs/thuat-toan-goi-y.md` §4 | |
| 1.5.4 | "kho dữ liệu chỉ có vài chục bài" | Đúng | Chạy `eval:recommend` ngày 05/11: 36 bài mở trong dữ liệu seed | |
| 1.5.4 | "trợ lý phụ thuộc vào khóa và dịch vụ bên ngoài" | Đúng (có ghi chú) | `server/.env.example:9-17` (`GEMINI_API_KEY`, `LLM_API_KEY`); có dự phòng về bộ luật (xem dòng cơ chế dự phòng ở trên) | |
| 1.6 | "viết luồng người dùng cho từng chức năng chính" | Đúng | `docs/user-flows.md` | |
| 1.6 | "địa chỉ chính xác của một việc chỉ hiện cho người được chọn" | Đúng | `offer.model.js:6` (`REVEAL_ADDRESS = chosen, working, reported, done`), `offer.service.js:35`, `flow.test.js:86,145,159`, `seed.test.js:85-86` | |
| 1.6 | "thiết kế giao diện trên Figma" | Chưa xác minh | Không có tệp hay liên kết Figma trong repo (tìm `figma.com` trong `docs/`, `CLAUDE.md`, `README.md` không thấy). `docs/decisions.md:13` chỉ ghi "Chờ Figma" | Nhóm tự xác nhận và có thể thêm liên kết Figma vào phụ lục |
| 1.6 | "kèm một số bản mẫu HTML" | Đúng | `design/mockups/` | |
| 1.6 | "Giao diện… dựng bằng Angular với dữ liệu mẫu để hoàn thiện luồng trước khi có server" | Đúng | `api.config.ts:1-9`, `client/public/datasets/` | |
| 1.6 | "Server… được xây dựng theo tài liệu mô tả API" | Đúng | `docs/api-buyer-job.md`, `server/src/config/swagger.js` | |
| 1.6 | "từng service ở client chuyển từ dữ liệu mẫu sang gọi API thật khi endpoint… hoạt động ổn định" | Đúng | `api.config.ts:40-46` (`useMock(name)` theo từng service, `MOCK_OVERRIDES` chỉ còn `seller: true`) | |
| 1.6 | "Giao diện Angular được đối chiếu với bản thiết kế Figma" | Chưa xác minh | Như dòng Figma ở trên | |
| 1.6 | "API được kiểm tra bằng bộ test chạy trên MongoDB trong bộ nhớ" | Đúng | 10 tệp trong `server/test/` dùng `mongodb-memory-server`; chạy hôm nay 79/79 đạt | |
| 1.6 | "đối chiếu với tài liệu mô tả API" | Chưa xác minh | Có Swagger và `docs/api-buyer-job.md`, nhưng không có test tự động đối chiếu response với tài liệu | Có thể bỏ cụm này hoặc nói rõ là nhóm đối chiếu thủ công |
| 1.6 | "phía client dùng Vitest" | Đúng | `client/package.json` (`vitest ^4.0.8`); `ng test --watch=false`: 18 tệp, 77 ca đạt | |
| 1.6 | "Thuật toán gợi ý được so với phương án chọn ngẫu nhiên bằng *Precision@k* trên dữ liệu seed" | Đúng | `server/scripts/eval-recommend.js`, `npm run eval:recommend` | |
| 1.6 | "nhánh dev… nhánh main… mỗi tính năng làm trên một nhánh riêng rồi gộp bằng pull request" | Đúng | `git branch -a` (`dev`, `main`, `origin/feature/*`), `git log --merges` (Pull request #1 `f9ab4cb`, #2 `ed42236`), `docs/git-workflow.md` | |
| 1.6 | "Nhóm có dùng công cụ AI hỗ trợ lập trình theo đúng phạm vi đề cương môn học cho phép" | Đúng | Có dùng: `CLAUDE.md` ở gốc repo. Đề cương cho phép: `docs/bao-cao/00-Giới thiệu môn học.pptx`, slide 8 (Cursor IDE, GitHub Copilot, ChatGPT/Claude) | |

## 2. Bốn tiêu chí ở Bảng 1.2: đã có test chứng minh chưa

| Tiêu chí (Bảng 1.2) | Test tự động chứng minh? | Bằng chứng / ghi chú |
|---|---|---|
| **1a.** Vẫn ra kết quả khi gõ không dấu hoặc sai 1–2 ký tự | **Có** | `server/test/extra.test.js:70` (không dấu, qua API). `server/test/smart-search.test.js:19` (gõ sai: "cơm gàa", "tra suaa", "giạt sấy"). `server/test/assistant.test.js:213` (gõ sai "coom gaa" qua API công khai, có cờ `smart`). Ngưỡng 2 ký tự và chỉ áp cho từ từ 4 ký tự: `smart-search.js:35,87` |
| **1b.** *Precision@3* của gợi ý bài cao hơn mức ngẫu nhiên | **Chưa phải test tự động**, nhưng **đã có số đo** | `server/scripts/eval-recommend.js` (chạy bằng `npm run eval:recommend`, không có lệnh khẳng định đạt hay trượt). Kết quả ngày 05/11/2026 trên 36 bài: **P@3 = 73,1%** so với ngẫu nhiên **21,3%** (P@1 = 69,4%, P@5 = 77,2%). Lưu ý nhãn đúng là "cùng danh mục", mà danh mục nằm trong chữ của bài nên có rò nhãn (`docs/thuat-toan-goi-y.md`) |
| **2.** Các luồng phía Mua chạy bằng API thật | **Một phần**: server có, client chưa có | Server: các luồng Mua đều có test API chạy trên MongoDB trong bộ nhớ (`flow.test.js:91,128,174`, `xu-flow.test.js`, `tracking.test.js`), 79/79 đạt. Client: có cơ chế tự nhận diện server (`client/src/main.ts:10-19`) và chỉ `seller` bị ép dùng mẫu (`api.config.ts:40-43`), nhưng **không có test** nào chứng minh client gọi API thật. Bộ test client (77 ca) kiểm tra dữ liệu mẫu (`mock-services.spec.ts`) và tiện ích. Cần một lần chạy tay với `?mock=0` hoặc một test tích hợp |
| **3.** API không trả địa chỉ chính xác cho người chưa được chọn | **Có** | `server/test/flow.test.js:86` (danh sách việc không có `exactAddress`), `:145` (đề nghị chưa được chọn không thấy), `:159` (được chọn thì thấy); `server/test/seed.test.js:85-86`. Mã: `catalog.service.js:75,78,86`, `offer.service.js:35`, `offer.model.js:6` |

## 3. Các phát hiện ngoài Chương 1 (để nhóm biết)

- `docs/thuat-toan-goi-y.md` (P@k = 100% / 96,9% / 91,9%, 32 bài) đã cũ so với kết quả chạy hôm nay (69,4% / 73,1% / 77,2%, 36 bài).
- `docs/decisions.md` mục 1.1 còn ghi JWT. Code thực tế dùng session cookie (`server/src/app.js:24-31`).
- `docs/bao-cao/outline-theo-slide.md` (17/10) ghi chưa có guard, lazy loading, Reactive Forms, session, máy học. Tất cả đã có trong code hiện tại.
- Khu vườn: chỉ trò Hái xu do server giới hạn lượt; tưới cây và thú cưng cộng Xu ở client (`garden.ts:93`).
- Server chưa có API cho người bán xác nhận đơn, chọn người nhận việc, trả lời hỏi đáp. Ba thao tác này chỉ có ở route mô phỏng `/api/dev/*`, không chạy khi `NODE_ENV=production` (`server/src/app.js:51`).
