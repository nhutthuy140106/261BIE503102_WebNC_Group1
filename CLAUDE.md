# AntGo Web2 — Ghi chú làm việc

> Cập nhật: 16/10/2026 (cuối phiên 16/10 — rà UX không gian Mua, đặt hàng kiểu ShopeeFood, nhận việc kiểu Airtasker, gian hàng). Đọc file này trước khi làm tiếp.
> Tài liệu nghiệp vụ: `docs/project-context.md` (kiến trúc 2 không gian, đã cũ một phần) và `docs/user-flows.md` (user flow Trang chủ, **ưu tiên tài liệu này** khi mâu thuẫn). Tham khảo phong cách: `docs/tham-khao/phong-cach-brex.md` (Brex), `docs/tham-khao/phong-cach-dribbble.md` (Dribbble).

> **Cấu trúc repo mới (đồ án Angular + Express + MongoDB):** `client/` (Angular), `server/` (Express + MongoDB), `docs/`, `design/mockups/` (HTML thuần — bản mẫu giao diện, mọi `mockups/…` trong file này nay nằm ở `design/mockups/…`), `design/assets-goc/` (ảnh/video gốc). Đồ án thật dựng trong `client/` và `server/` theo mockup.

## 0. Chuyển sang Angular (18/10)

- `client/` đã dựng bằng Angular CLI (NgModule, `--no-standalone`): module tải lười cho từng nhóm trang, `authGuard`/`pendingChangesGuard`, `slug-helper` (đã sửa chữ "đ"), service có `retry`+`catchError`, form Reactive. Dữ liệu mẫu ở `client/public/datasets/` (`USE_MOCK = true` trong `core/config/api.config.ts`). Chi tiết: `client/README.md`.
- Giao diện hiện chỉ là **khung chức năng đơn giản**; việc tiếp theo là chuyển từng màn hình từ `design/mockups/` sang component (mockup vẫn là chuẩn thiết kế).
- `server/` **chưa làm — chờ hướng dẫn của thầy** (Express + MongoDB).
- Git: nhánh mặc định `dev`, `main` ổn định, tính năng ở `feature/*` — xem `docs/git-workflow.md`. Tri thức môn học: `docs/tham-khao/kien-thuc-mon-hoc-angular-express-mongodb.md`.

## 0b. Tiến độ FE không gian Mua theo mockup (22/10, nhánh dev)

- **Xong (theo `design/mockups/` nhánh main):** landing, đăng nhập/đăng ký, trang chủ, tìm kiếm, **chi tiết bài** (mô hình 7 khối: `core/models/post-template.ts`, `core/config/post-templates.ts`, `review-samples.ts`; ghép bài+mẫu ở `core/utils/template-for.ts`; trạng thái đơn đang chọn ở `core/utils/order-draft.ts`; đặt 2 bước + hộp Xác nhận + voucher AntXu + xem ảnh lớn + tất cả đánh giá), **chi tiết việc làm** (hỏi đáp công khai, thẻ người đăng, đề nghị + hộp xác nhận), chi tiết đơn (thanh bước đơn đã đặt, nội dung đã đặt `Order.detail`, cộng Xu khi xong việc/đánh giá), gian hàng (tab Đánh giá, theo dõi cần đăng nhập), Messenger (`?to=<tên>` mở/tạo cuộc trò chuyện), trang Tôi (hoạt động, khu vực & AntXu, lịch sử Xu, đăng xuất).
- **Chưa kiểm chứng trong trình duyệt:** chỉ chạy `ngc --noEmit` (biên dịch sạch), chưa chụp ảnh so với mockup; hoạt ảnh chưa kiểm.
- **Còn thiếu / lệch mockup:** hộp chọn địa chỉ chỉ chọn (thêm/sửa ở trang Tôi); mô tả + đánh giá mẫu của bài mock lấy theo mẫu loại bài nên có thể lệch tên; chưa có trang Hỗ trợ riêng (chỉ có Báo cáo vấn đề theo đơn); đề nghị kèm giá, báo phụ thu phía bán, trả lời hỏi đáp phía người đăng chờ phía Bán; Xu +10 khi đơn đã đặt hoàn thành cần phía bán đổi trạng thái.
- Mock bật bằng `?mock=1`; server thật thiếu: sổ Xu, đánh giá theo người bán, hội thoại theo id người nhận.

## 1. Cách làm việc với người dùng (bắt buộc)

- **Trao đổi trước, làm sau.** Đề xuất ngắn → chờ "ok" → mới làm. Không tự cài công cụ khi chưa hỏi.
- **Đánh giá như một người dùng thật, không hùa theo.** Chỉ ra vấn đề + lý do + một đề xuất, rồi hỏi "đồng ý không".
- **Đổi từng thứ một.** Từng đổi 6 thứ một lúc → người dùng thấy xấu hơn và phải khôi phục. Mỗi thay đổi lớn: lưu bản sao trước, sửa, chụp ảnh kiểm tra, báo lại.
- **Sửa trên một file duy nhất cho mỗi màn hình**, không tạo `home-v6`, `home-v7`… Biến thể đặt trong cùng file (ví dụ `?theme=`).
- **Không làm kiểu "AI":** tránh font bo tròn, chữ chuyển màu, hình vẽ nguệch ngoạc, emoji làm ảnh, quá nhiều màu nhấn, khuôn hero "nút viên + tiêu đề tô 1 chữ + 3 dấu ✓ + ảnh trong khung".
- **Dữ liệu mẫu được phép** (đồ án demo): seed `server/` và mock ở `client/` có thể dùng tên, đơn, tin nhắn mô phỏng để minh họa luồng. (Quy tắc cũ "không số liệu giả" đã bỏ theo yêu cầu của Khải, 18/10.)
- Luôn chụp ảnh kiểm tra bằng Edge headless trước khi báo xong; nói rõ phần nào chưa kiểm chứng được (chuyển động thật).
- Trả lời bằng tiếng Việt, dễ hiểu, không quá kỹ thuật.
- **Người dùng khó hình dung qua chữ** → luôn cho xem ảnh chụp trang thật; khi ý tưởng khó giải thích, "làm thử cho xem" rồi hỏi.
- Đầu mỗi bước, **xem thư mục dự án có file mới người dùng vừa thêm không** (ảnh, tài liệu) trước khi đề xuất.
- Dùng **ảnh thật** (Unsplash, đã kiểm tra ID), không dùng emoji làm ảnh minh họa.
- Ảnh gốc của người dùng **không ghi đè** — bản đã xử lý để ở `design/mockups/assets/clean/`.
- **Cuối mỗi phiên:** cập nhật file này (trạng thái, quyết định + lý do, việc tiếp theo) và lưu một mốc git.
- Dự án có thể được làm luân phiên bởi Claude Code và Codex: `AGENTS.md` (Codex đọc) trỏ về file này — **mọi ghi chú chỉ viết ở `CLAUDE.md`**.

## 2. Trạng thái từng phần

| Phần | File | Trạng thái |
|---|---|---|
| Trang giới thiệu (landing) | `design/mockups/landing.html` | **Xong** — người dùng đã duyệt |
| Trang chủ không gian Mua (Khám phá) | `design/mockups/home-v5.html` | **Gần xong (16/10)** — thẻ việc mới (người đăng, mô tả, tiền công + giờ, "Đang mở · n đề nghị"); dải xanh đen **Kiếm thêm gần nhà**; Khám phá lọc **Tất cả · Đồ ăn · Đồ dùng · Dịch vụ · Việc làm**, không lặp bài; **không** hiện đơn của người dùng trên trang chủ |
| Ngăn kéo Đã lưu + AntXu dùng chung | `design/mockups/shared/drawers.js` | **Xong** — nhúng vào mọi trang, chỉ mở khi bấm nút |
| Chi tiết bài (đồ ăn/đồ dùng/dịch vụ) | `design/mockups/detail.html` | **Đã làm lại khung đặt (16/10), chờ người dùng bấm thử** — nhãn loại bài dưới tiêu đề; **đặt 2 bước kiểu ShopeeFood** (khung phải chọn món dạng hàng → hộp "Xác nhận đơn hàng"); sổ địa chỉ kiểu Shopee; tên người bán mở gian hàng. Đánh giá mẫu riêng từng bài + ảnh đúng chủ đề (17/10) |
| Chi tiết việc làm + Đề nghị nhận việc | `design/mockups/job.html` | **Cập nhật 16/10** — trạng thái "Đang mở · n đề nghị", **Hỏi đáp công khai** (chặn SĐT), thẻ Người đăng việc mới (Nhắn tin + 3 chỉ số + Xem gian hàng). Chưa có: đề nghị kèm giá |
| Đơn hàng — danh sách + chi tiết **Việc đã nhận** | `design/mockups/orders.html` | **Cập nhật 16/10** — nút Tất cả · Đơn đã đặt · Việc đã nhận · Lịch sử; khối "Cần bạn xử lý"; trạng thái theo tên bước; chi tiết: bảng thông tin dạng hàng, dòng phụ = người + uy tín, bỏ khối Lịch sử, nút hành động thống nhất. Chờ người dùng bấm thử |
| Đơn hàng — chi tiết **Đơn đã đặt** | `design/mockups/orders.html` | **Bản thử** — mã AG-O…, ngày giờ dưới từng bước, đơn mới tạo từ hộp xác nhận (có địa chỉ, dụng cụ, thanh toán). **Chưa chốt** quy tắc hủy/trả/hoàn, chưa có bước "đồng ý phụ thu" |
| Kết quả tìm kiếm / "Xem tất cả" | `design/mockups/search.html` | **Bản mẫu, đã sửa UX 16/10** — dùng ô tìm trên header, tab Đồ ăn/Đồ dùng/Dịch vụ/Việc làm, danh mục + Xu dạng viên bấm, báo rõ khi trong khu không có bài, thẻ việc mới. Chưa có gợi ý/lịch sử tìm |
| Messenger | `design/mockups/messenger.html` | **Bản mẫu, đã sửa 16/10** — 3 cuộc trò chuyện mẫu (bổ sung cả khi trình duyệt có dữ liệu cũ), tin hai phía, ảnh đại diện, thẻ đơn/bài có tên thật. Cần máy chủ để gửi thật |
| Thông báo | `design/mockups/notifications.html` | **Bản mẫu** — chấm chuông đếm từ chính danh sách thông báo; cần máy chủ để nhận sự kiện thật |
| Tôi / Đã lưu | `design/mockups/profile.html` | **Bản mẫu, cập nhật 16/10** — Bài đã lưu (cùng danh sách với tim header), **Địa chỉ của tôi** (sổ địa chỉ dùng chung), Hoạt động, Khu vực & AntXu |
| Chọn khu vực và điều hướng chung | `design/mockups/shared/common.js` | **Bản mẫu đã dựng** — Block A–D lưu cục bộ, ưu tiên bài cùng khu trong tìm kiếm |
| **Gian hàng** (trang công khai của người bán / người đăng việc) | `design/mockups/shop.html?name=…` | **Bản mẫu (16/10)** — đầu trang (ảnh, tên, loại, khu, thời gian trả lời, Theo dõi + Nhắn tin), 3 ô ★ điểm · bài đang đăng · đơn/việc hoàn thành, giới thiệu, tab Đang bán / Việc đang cần người / Đánh giá. Dữ liệu mẫu (17/10) cho mọi người bán/người đăng đang xuất hiện: Bếp Cô Lan, Quán Nhà Mây, Chị Hoa, Quốc Anh, Thu Hà, Chị Ngân, Anh Tuấn, Chị Mai, Minh Khoa, Phương, Tiệm Sạch Thơm, Giặt sấy Mỹ Linh, Quán Phở Bà Tư, Anh Tùng, Cô Ba, Minh, Anh Quân; tên khác hiện trang trống. Mở từ ảnh/tên người bán ở `detail.html` (+ "Xem tất cả" bài khác), người đăng ở `job.html`, thẻ người cuối khung `orders.html`. Theo dõi lưu `antgo_follow`. |
| Hỗ trợ vấn đề với đơn | `design/mockups/support.html` | **Bản mẫu bản nháp** — lưu nội dung trong trình duyệt, chưa gửi tới đội hỗ trợ |
| Không gian **Bán & Đăng việc** | `docs/handoff.md` | Chưa dựng; **bàn giao cho bạn của người dùng**. Không gian Mua do người dùng kiểm tra ngày mai. |
| Icon đồng xu AntXu | `design/mockups/assets/clean/antxu.png` | Xong (bản ít bóng) — dùng ở header, ngăn kéo Xu, nhãn "Dùng được Xu", footer |
| Logo AntGo | `design/mockups/logo-options.html` | **Hoãn** — 4 phương án bị chê, để sau |

Các file `design/mockups/` khác (`welcome`, `style-*`, `home-styles`, `home-clean`, `home-v3`, `home-v4`, `airbnb-*`, `swiggy-*`, `wireframes`, `font-compare`) là **bản thử cũ, không dùng nữa**.

### 2.1 Trang giới thiệu — `design/mockups/landing.html`
- Mở màn kiểu trajectory.ai (~2,7 giây): nền kem có lưới kẻ, nhãn góc "Một khu / Một nhà", chữ "AntGo" khổng lồ, cửa sổ trời mở rộng toàn màn hình.
- Kiến cưỡi máy bay giấy bay vào (dáng chỉ tay/giơ tay → dừng hẳn → nén–lóe sáng–bật lên đổi sang dáng vẫy tay), vệt bụi vàng kiểu Trajectory dưới đuôi, mây 3 lớp xa–giữa–gần có parallax theo chuột.
- Bố cục chữ so le: nhãn "Ứng dụng kết nối hàng xóm trong khu", tiêu đề **"Một khu, / một nhà."** (Bricolage Grotesque), mô tả + nút "Bắt đầu khám phá" / "Tôi muốn đăng bài" ở góc dưới phải. Bong bóng lời thoại bên trái đầu kiến, câu ngắn.
- Ảnh nền trời và mây lấy từ trajectory.ai — **chỉ dùng nội bộ, không thương mại** (người dùng xác nhận).

### 2.2 Trang chủ — `design/mockups/home-v5.html` (từ trên xuống)
1. **Header** một hàng, không xuống dòng: logo · Trang chủ · Đơn hàng · Messenger (số tin) · công tắc **Mua | Bán** · khu vực "Block B" · chuông · ảnh đại diện. Màn hẹp (<1240px) menu chỉ còn icon. Khi cuộn qua ô tìm kiếm lớn, **ô tìm kiếm gọn trượt lên giữa header**.
2. **Khối mở đầu** *(bản cũ — đã thay bằng mục 2.2b)*: khung trời tràn ngang bo góc, chữ **"AntGo" khổng lồ uốn vòng cung** (font Anton, SVG textPath), 2 ngôi sao lấp lánh, **kiến cưỡi máy bay bay xuyên qua chữ** (bay vào → đổi dáng → hạt vàng bung → chào theo giờ trong ngày; bấm vào kiến để chào lại; nghiêng theo chuột), mây 3 lớp. Dưới: câu "Đặt món, thuê dịch vụ, nhận việc — ngay trong khu.", 2 nút **"Tìm quanh khu"** / **"Kiếm thêm gần nhà"**, 3 cam kết không có số (Người thật trong khu · Nhắn trước khi đặt · Báo cáo vi phạm dễ dàng).
3. **Ô tìm kiếm lớn chung** cho hàng hóa/dịch vụ/việc làm + nút **giọng nói** (Web Speech API, `vi-VN`, chạy thật trên Chrome/Edge) + nút **hình ảnh** (chọn hoặc kéo thả ảnh → chip "Tìm theo ảnh"; **chỉ mô phỏng**, cần máy chủ nhận dạng ảnh). Hàng "Phổ biến:" bấm vào là điền vào ô tìm kiếm.
4. **Nổi bật trong khu:** 4 bài quảng bá, nhãn "QUẢNG BÁ", mô tả "Bài được người bán quảng bá".
5. **Gần bạn:** 4 bài món đồ/dịch vụ.
6. **Việc mới quanh bạn:** 4 thẻ việc.
7. **Khám phá quanh khu:** lưới lướt, bộ lọc Tất cả/Hàng hóa/Dịch vụ/Việc làm + **Sắp xếp** (Gần nhất, Mới nhất, Giá ↑/↓; Việc làm: Mới nhất, Gần nhất, Tiền công cao nhất), cuộn tự tải 8 bài × 3 lần rồi nút "Xem thêm".
8. **Footer** nền xanh đen: thương hiệu · Khám phá · Bán & Đăng việc (có "Quảng bá bằng AntXu") · Hỗ trợ (An toàn giao dịch, Báo cáo vi phạm); kiến dáng ló đầu trên mép.

Hệ thống chung: **chỉ 2 kiểu thẻ** (món đồ/dịch vụ có ảnh; việc làm có mảng màu be + tiền công in to + người đăng), **mọi lưới 4 cột**, **không lặp bài giữa các khối**. Icon: **Phosphor Icons** (`@phosphor-icons/core@2.1.1`, nhúng thành `<symbol>`). Font giao diện: **Mona Sans**. Theme mặc định trong file hiện là **Trắng ấm**; `?theme=cream` để xem Kem.

### 2.2b Cập nhật tối 14/10 (trang chủ)
- **Khối mở đầu dựng bằng code từ thành phần trang giới thiệu** (trời + hạt nhiễu, chỉ 2 đám mây, chữ "AntGo" nền phẳng Bricolage uốn nhẹ, kiến cưỡi máy bay góc trên phải + vệt bụi vàng). Ảnh B1 (`assets/hero-bg.png`) vẫn giữ, bật lại bằng class `photo` trên `.shot` — người dùng thấy ảnh AI "nhiều mây, quá AI".
- Chữ khối mở đầu: *"Mua bán, đặt dịch vụ, nhận việc vặt với AntGo."* · nút **Tìm quanh khu** (cuộn tới tìm kiếm) / **Tìm việc gần nhà** (cuộn tới Khám phá + lọc Việc làm) · **Nhanh chóng · Tiện lợi · Gần gũi**.
- **Bảng màu mới** lấy từ ảnh + con kiến: chữ xanh đen `#22304A`, mảng phụ kem ngả hồng `#FBF4F1`, viền `#F0E2DC`, nhấn cam con kiến `#D85A1C`. `?theme=old` xem bảng màu cũ.
- **Tìm bằng giọng nói** (chạy thật Chrome/Edge) và **hình ảnh** (mô phỏng) trong cả 2 ô tìm kiếm.
- **Header:** Mua|Bán · Block B · **🪙 120 Xu** · **♡ Đã lưu (số đếm)** · chuông · ảnh đại diện. Bấm ♡ trên thẻ → tim bay lên header; ♡ header và "120 Xu" mở **ngăn kéo bên phải** (Đã lưu có lọc + trạng thái hết khả dụng; Xu có đổi voucher, voucher của bạn, cách nhận Xu).
- **Không thêm nút Mua trên thẻ** — bấm thẻ mở chi tiết (F05); mua cần chọn số lượng/ghi chú/địa chỉ, tránh đặt nhầm.
- Bộ ảnh linh vật nhiều dáng (cầm biển, loa, laptop…) người dùng gửi — **để sau**, cần cắt từng dáng + làm sạch quầng vàng.

### 2.2c Trang chi tiết bài — `design/mockups/detail.html` (15/10)
- Dùng chung header/icon/màu với trang chủ; ngăn kéo Đã lưu + AntXu tách ra **`design/mockups/shared/drawers.js`** (trang mới chỉ cần nhúng file này). Đã lưu lưu trong `localStorage["antgo_saved"]`, dùng chung mọi trang.
- Bộ ảnh + **xem ảnh lớn** (← →, Esc); **Xem tất cả đánh giá** (biểu đồ sao, lọc Có ảnh/5★/4★/≤3★, sắp xếp, tìm, ảnh người mua, phản hồi người bán; điểm & số đánh giá tính từ dữ liệu).
- **Mô hình KHỐI (người dùng duyệt 15/10):** mọi bài = ghép 7 khối, người bán bật/tắt khi đăng bài → bao quát mọi loại hàng/dịch vụ:
  1 Giá (cố định / theo đơn vị tự đặt / "từ" / **báo giá sau** + phí kiểm tra) · 2 Số lượng · 3 Thời gian (khung 30' / ngày + thời lượng + lặp lại hằng tuần) · 4 Địa điểm (chọn giao/tự lấy · tại nhà khách · tại chỗ người bán · A→B) · 5 Tùy chọn cộng giá · 6 **Câu hỏi riêng** (chữ/chọn 1/chọn nhiều/ảnh, bắt buộc hay không) · 7 **Tình trạng bán** (mở theo lịch / giới hạn số lượng / bán một lần).
  Mẫu gợi ý bật sẵn khối theo loại; lưới an toàn: "Nhắn hỏi trước" + "Gửi yêu cầu báo giá". 6 bài mẫu: `?p=food|goods|svc|fix|clean|trip`; `&soldout` xem hết hàng/đã bán.
- **Bài đăng ≠ đơn:** bài đăng một lần, mở lâu dài (như bảng hiệu); mỗi đơn gắn ngày giờ cụ thể. Việc làm thì một lần, có hạn chót.
- 3 ô chú thích cố định theo loại (Đồ ăn: Giờ nhận đặt · Cách nhận · Thời gian chuẩn bị; Hàng hóa: Tình trạng · Cách nhận · Ngày đăng; Dịch vụ: theo kiểu) — lấy từ thông tin người bán điền, ô trống thì ẩn.
- Phân biệt: **Dịch vụ** = người làm đăng sẵn để được đặt; **Việc làm** = người cần đăng yêu cầu để người khác đề nghị nhận.
- Còn thiếu: đánh giá mẫu ở `detail.html` dùng chung một bộ (văn phong đồ ăn) cho mọi bài.

### 2.2d Chi tiết việc làm — `design/mockups/job.html` (15/10)
- khối tiêu đề có tiền công to, 4 ô (thời gian làm, địa điểm, số người cần, trả công), việc cần làm, yêu cầu, địa điểm (địa chỉ chính xác chỉ hiện khi được chọn), người đăng; khung **Đề nghị nhận việc** (chọn khung giờ làm được + giới thiệu ngắn bắt buộc) → xác nhận → "Đã gửi đề nghị". Ghi rõ **gửi đề nghị ≠ đã nhận việc** (F10). Trạng thái: `?state=offered` (đang chờ, rút đề nghị) · `?state=closed` (đã có người nhận). Thẻ việc trên trang chủ và trong ngăn kéo Đã lưu mở trang này.

### 2.2e Đơn hàng — `design/mockups/orders.html` (15/10, phiên này)
Một file cho cả danh sách và chi tiết (`?id=…`), dựng từ khung header/icon/footer của `job.html` (script `make_orders.py` trong thư mục tạm).
- **Danh sách** (theo PROJECT_CONTEXT 5.1 đã chốt): mặc định hiện **tất cả**; 2 nút bật/tắt **Đơn đã đặt / Đơn đã nhận** kèm số đếm — bấm lại nút đang bật → về tất cả, bấm nút kia → chuyển thẳng (`?f=placed|rcv`). **Không có bộ lọc trạng thái.** Chia 2 nhóm **Đang diễn ra / Đã kết thúc** (chỉ để xếp, không phải bộ lọc). Mỗi thẻ là một hàng ngang: ô ảnh (việc làm = ô kem + icon danh mục), nhãn **Đã nhận / Đã đặt**, tên, người đăng + thời gian, số tiền, và **chấm trạng thái** (vàng = chờ, xanh = đang chạy, xám = xong) **hoặc viên cam "Cần bạn: …"** khi người dùng phải làm gì đó.
- **Chi tiết Đơn đã nhận** — thanh 5 bước: **Đã gửi đề nghị → Được chọn → Đang làm → Đã báo xong → Hoàn thành** (bước đã qua có ngày giờ); nhánh phụ **Không được chọn · Đã rút đề nghị · Đã hủy** (bước bị cắt hiện ✕). Bố cục: khối tiêu đề kem (danh mục, nhãn Đã nhận, mã đơn, tiền công to) · thanh bước · cột trái (Thông tin việc 4 ô, Bạn đã báo hoàn thành, Bạn đánh giá, Đề nghị của bạn, Lịch sử) · **bảng hành động dính bên phải** chỉ có nút hợp lệ với bước hiện tại:

  | Bước | Hành động |
  |---|---|
  | Đã gửi đề nghị | Sửa lời giới thiệu · Rút đề nghị (có xác nhận) |
  | Được chọn | **Bắt đầu làm** · Xin hủy (bắt chọn lý do) · ô địa chỉ chính xác viền xanh |
  | Đang làm | **Báo hoàn thành** (ghi chú bắt buộc, ảnh tùy chọn ≤ 4) · Xin hủy |
  | Đã báo xong | "Tự hoàn thành sau 24 giờ" |
  | Hoàn thành | **Đã nhận [tiền công]** / "Chưa nhận được tiền công?" → **Đánh giá** người đăng (sao bắt buộc, nhận xét tùy chọn) |
  | Không được chọn / Đã rút / Đã hủy | Tìm việc tương tự / Xem lại bài |

  Cuối bảng: thẻ người đăng (nút Nhắn) + "Báo cáo vấn đề với đơn này".
- 6 việc mẫu `?id=j1…j6`, mỗi việc một trạng thái; dòng xám "Bản mẫu" cuối trang có link từng bước + nút **mô phỏng phía người đăng** (chọn bạn / chọn người khác / xác nhận hoàn thành) + **Đặt lại dữ liệu mẫu**. Thao tác bấm thử lưu ở `localStorage["antgo_orders"]` nên danh sách và chi tiết luôn khớp.
- Tên người giữa câu tự viết thường danh xưng ("Chờ **chị** Hoa chọn người").
- **Đã nối ở phiên bàn giao:** Nhắn tin mở `messenger.html` đúng người/đơn; Báo cáo vấn đề mở `support.html?order=...` để lưu bản nháp. Chưa gửi tin/báo cáo tới máy chủ.
- **Cập nhật 15/10 — Đơn đã đặt (bản thử, chưa duyệt):** 3 thẻ mẫu mở chi tiết riêng trong cùng `orders.html`; theo dõi các bước chờ xác nhận → đã xác nhận → đang chuẩn bị/làm → giao/nhận → hoàn thành; hiện nội dung đặt, chi phí/voucher, lịch sử và hành động hợp trạng thái. Nút ở `detail.html` lưu yêu cầu mẫu vào `localStorage["antgo_orders"]` rồi mở đúng đơn vừa gửi. Hủy/trả hàng chỉ là **gửi yêu cầu**, không tự hủy/hoàn tiền; trả hàng chỉ hiện nếu đơn là hàng hóa và có cờ đủ điều kiện. **Chưa chốt** chính sách hủy/trả/hoàn và bộ trạng thái chính thức. Cần người dùng xem giao diện trước khi tách phần dùng chung/bàn giao.
- **Phản hồi 15/10:** người dùng thấy bản thử gộp hai ô địa điểm thành một ô trải ngang xấu hơn; đã khôi phục nguyên bố cục 4 ô trước đó. Vấn đề hai địa chỉ có vẻ lặp vẫn còn, nhưng người dùng muốn giữ thiết kế cũ và sẽ tự sửa sau; không tự đề xuất lại cách gộp này. **16/10 người dùng tự yêu cầu gộp** → làm dạng **3 ô ngang** (Thời gian làm · Địa điểm · Trả công), ô Địa điểm 2 dòng: khu + địa chỉ chính xác (hoặc "hiện khi bạn được chọn"). → người dùng thấy 3 ô "căn tùm lum" → đổi thành **bảng thông tin dạng hàng** (`.info`: nhãn + icon cột trái 170px, nội dung cột phải; hàng Địa điểm có dòng phụ địa chỉ; hàng cuối "Việc cần làm" = mô tả). Dòng phụ dưới tiêu đề chi tiết đơn đổi thành **ảnh + tên người đăng/người bán + ★ điểm + số việc đã đăng / số đánh giá** (không lặp thời gian, địa điểm). Bỏ khối **"Lịch sử"** ở cả 2 loại chi tiết đơn (trùng thanh tiến trình); ngày giờ hiện ngay dưới từng bước trên thanh (đơn đã đặt cũng có). Dữ liệu `hist` vẫn giữ. **Trạng thái thống nhất** (người dùng yêu cầu 16/10): danh sách đơn và chấm trạng thái trong chi tiết dùng đúng tên bước trên thanh tiến trình (Đã gửi đề nghị · Được chọn · Đang làm · Đã báo xong · Hoàn thành; Chờ xác nhận · Đã xác nhận · Đang chuẩn bị…), không cá nhân hóa ("Chờ chị Hoa…"), bỏ viên "Cần bạn: …"; đơn cần xử lý có chấm cam + nằm trong khối "Cần bạn xử lý". Câu hướng dẫn cụ thể chỉ còn ở khung hành động trong chi tiết.
- Đã nối: menu **Đơn hàng** trên `home-v5`, `detail`, `job` → `orders.html`; nút "Xem trong Đơn hàng" sau khi gửi đề nghị ở `job.html` → `orders.html?id=j1`.

### 2.3 Tài nguyên — `design/mockups/assets/`
- `clean/` = ảnh đã làm sạch viền/tách nền dùng trên web: `ride_wave.png` (vẫy tay), `ride_point2.png` (chỉ tay, đang dùng ở trang chủ), `ride_start.png` (giơ hai tay, đang dùng ở landing), `ride_point.png`, `ride_grip.png`, `idle/wave/peek/point/run_*.png`, `antxu.png`.
- Ảnh gốc của người dùng giữ nguyên ở `assets/` (không ghi đè).
- Hai dáng kiến cưỡi máy bay được căn trùng máy bay bằng **ma trận affine từ 3 điểm mốc** (đầu cánh trái, mũi, đuôi). Khi thêm dáng mới phải đo lại (script `Clean.cs` → hàm `Plane`).
- Ảnh món/dịch vụ: Unsplash (ID đã kiểm tra), chỉ để minh họa.

### 2.2f Hoàn tất bản mẫu không gian Mua và bàn giao (15/10)

- Người dùng chọn **hoàn tất Mua + bàn giao**, giữ không gian Bán & Đăng việc cho bạn của họ. Đã tạo `docs/handoff.md` với hợp đồng dữ liệu hai phía, trạng thái và điều cần chốt.
- Tạo `design/mockups/shared/base.css`, `icons.js`, `common.js`, `catalog.js` cho các trang mới; **chưa refactor CSS/header của trang cũ** để giữ thiết kế đã được chấp nhận. `common.js` nối nav, tìm kiếm và khu vực trong trang cũ; bỏ số tin chưa đọc/chấm thông báo giả.
- Tạo `search.html`, `messenger.html`, `notifications.html`, `profile.html`, `support.html`. Dữ liệu hiện là bản mẫu lưu trong trình duyệt. Thông báo từ đơn mới tạo đọc `antgo_orders`; Messenger không đổi trạng thái đơn; Hỗ trợ chỉ lưu bản nháp, không tuyên bố đã gửi.
- User flow ở `docs/user-flows.md` có ghi chú cập nhật đầu file; các mục cũ vẫn là mục tiêu/chỗ chưa chốt, không coi là mô tả chính xác 100% giao diện hiện tại.
- Người dùng nói **ngày mai họ sẽ test**, nên phiên này chỉ rà tĩnh mã/liên kết; chưa xác nhận giao diện và thao tác trong trình duyệt. Công cụ mở `file://` của môi trường từ chối, không thử vượt giới hạn đó bằng browser khác.

### 2.2g Rà UX các trang mới (16/10, Claude Code)
Codex dựng các trang mới nhưng chưa xem được giao diện. Phiên này chụp từng trang, liệt kê 6 lỗi UX, người dùng đồng ý sửa lần lượt (mỗi điểm một mốc git):
1. **Header/footer thống nhất:** `shared/common.js` giờ dựng **đúng header trang chủ** (ô tìm kiếm + mic/camera, Mua|Bán, Block, 120 Xu, tim Đã lưu, chuông, ảnh) + **footer xanh đen** cho mọi trang có `<div id="siteHeader">`; CSS gói trong `.appbar/.appfoot` ở **`shared/chrome.css`**; tự nạp `drawers.js`. Header rút gọn `.sitebar` cũ trong `base.css` không còn dùng.
2. **Tìm kiếm:** bỏ ô tìm thứ hai (dùng ô trên header); trong khu không có bài → ô kem "Chưa có bài phù hợp trong Block B" rồi "Ở khu gần đó"; danh mục + "Dùng được Xu" thành viên bấm; giá "Từ – Đến" một hàng.
3. **Messenger:** 3 cuộc trò chuyện mẫu (Bếp Cô Lan/đơn o1 có 1 tin chưa đọc, Quốc Anh/j2, Chị Hoa/j1) chỉ tạo khi chưa có `antgo_chats`; tin hai phía (của mình phải nền xanh đen, của họ trái nền trắng); ảnh đại diện; thẻ đơn ghi tên thật + "Nhắn tin không tự đổi trạng thái đơn".
4. **Mã đơn thật** (`AntGo.orderRef(id)` trong common.js): j1–j6 = AG-J…, o1–o3 = AG-O3012/3009/2987; trang Hỗ trợ hiện "AG-J1998 · Cho mèo ăn…" thay vì "j3".
5. **Chấm chuông** hiện lại, đếm từ đúng danh sách thông báo (`antgo_notification_read`); đọc hết thì chấm mất (`AntGo.refreshBell()`).
6. **Đã lưu dùng chung:** common.js ghi 3 bài mẫu vào `antgo_saved` ngay lần đầu → tim header, ngăn kéo, trang Tôi cùng một danh sách. Sửa giá dính chữ ở trang Tôi.
- Đơn hàng: thêm nút **Tất cả** (người dùng yêu cầu) cạnh Đơn đã đặt / Đơn đã nhận.
- Người dùng thấy giao diện "chưa bắt mắt, tính năng chưa nổi bật" → đánh giá + 4 đề xuất A–D, đã làm A, B, D (C — khối "Cần bạn xử lý" đầu trang Đơn hàng — chưa làm):
  - **A. Thẻ việc làm mới** (trang chủ, job.html, search.html): ô be có người đăng + thời gian đăng, mô tả ngắn (`desc`), tiền công to + nhãn thời gian làm (`due`, icon đồng hồ cam). Dữ liệu `desc/due/who/av` thêm vào JOBS, JOBX (khối Khám phá) và `shared/catalog.js`.
  - **B. Dải "Của bạn hôm nay" trên trang chủ — ĐÃ BỎ** (người dùng: thuộc về Đơn hàng). Thay bằng khối **"Cần bạn xử lý"** nền cam nhạt ở đầu `orders.html` (đơn có viên "Cần bạn: …" tách khỏi "Đang diễn ra"). Trang chủ không hiện đơn của người dùng.
  - **D. Dải "Kiếm thêm gần nhà"** (class `.kband`, trước "Việc mới quanh bạn"): nền xanh đen, kiến dáng chỉ tay, tiêu đề "Rảnh tay? Giúp hàng xóm, nhận tiền công ngay trong khu.", 3 bước (chọn việc → gửi đề nghị chờ chọn → làm xong nhận tiền trực tiếp), nút Xem việc gần nhà / Đăng việc cần người (toast). Lưu ý: `home-v5.html` có sẵn class `.earn` cũ — không dùng lại tên này.

### 2.2h Loại bài & khung đặt (16/10, tiếp)
- **Tùy chọn cộng giá** (món mặn, phần cơm, nước xả…) chuyển từ cột trái **vào khung đặt**, ngay dưới giá; lựa chọn giữ trong `st.opt`.
- **Nhãn loại bài dưới tiêu đề** `detail.html` (Dịch vụ / Đồ ăn & thức uống / Đồ dùng + 1 câu "ai làm gì", trường `explain` để ghi đè) và `job.html` ("Việc làm · …" + "X đang cần người — bạn gửi đề nghị…"). Lý do: người dùng nhầm bài dịch vụ Lấy đồ hộ với việc làm.
- Dịch vụ `trip`: "Chạy việc" → **"Giao nhận hộ"**, nút **"Đặt lấy hộ"**; Kích thước ghi ngưỡng 10kg + dòng "chọn nhầm thì người làm báo phụ thu để bạn đồng ý" (câu hỏi lựa chọn hỗ trợ `hint`).
- **4 nhóm phía Mua: Đồ ăn · Đồ dùng · Dịch vụ · Việc làm** (người dùng chốt, thay "Hàng hóa"): bộ lọc Khám phá trang chủ (`kindOf` tách "goods" theo danh mục), tab `search.html` (`type=food`), footer mọi trang; thêm 4 bài Đồ dùng có ảnh thật (tai nghe, sofa, xe đạp, ghế) ở trang chủ + `catalog.js`. Ngăn kéo/trang Tôi: bộ lọc "Món & đồ dùng" (dữ liệu đã lưu chưa tách). Khám phá **không lặp bài** khi hết dữ liệu. `docs/handoff.md` có bảng 3 mẫu đăng bài.
- **Đơn hàng:** "Đơn đã nhận" đổi thành **"Việc đã nhận"** (nút, nhãn thẻ, chip chi tiết, đường dẫn, Messenger, trang Tôi) cho khỏi nhầm; nhãn thẻ "Đơn đã đặt" / "Việc đã nhận". Thêm nút **Lịch sử** (`?f=hist`, có vạch ngăn) gom đơn đã hoàn thành/đã hủy/không được chọn; các tab Tất cả/Đơn đã đặt/Việc đã nhận chỉ còn "Cần bạn xử lý" + "Đang diễn ra", số đếm chỉ tính đơn đang chạy, cuối danh sách có ô "Lịch sử đơn · n đơn" dẫn sang.
- **Địa chỉ nhận kiểu Shopee** (`detail.html`): khi người bán phải tới chỗ người mua (Giao tận cửa, Thợ đến nhà, Lấy & trả tại, Địa chỉ dọn, Giao tới) hiện thẻ **Địa chỉ nhận hàng** (viền sọc phong bì, tên · SĐT, địa chỉ, nhãn Mặc định / Đặt hộ, nút Thay đổi). Thay đổi → hộp **Địa chỉ của tôi** (radio, Sửa, + Thêm địa chỉ mới: họ tên, SĐT 10 số, Block A–D, căn/tầng, ghi chú, "đây là địa chỉ của" Nhà riêng/Người thân/Khác, đặt mặc định). **Đặt cho người khác = chọn/thêm địa chỉ người đó** (không có ô tích riêng). Tự đến lấy → dòng "địa chỉ lấy hàng gửi sau khi người bán xác nhận". Lưu ở `localStorage["antgo_addresses"]` (mẫu: Ngọc Thủy Block B mặc định + Mẹ — Cô Lan Anh Block A). Đơn ghi hàng "Giao tới … (đặt hộ)". Sổ địa chỉ tách thành **`shared/addresses.js`** (`AntAddr.all/line/text/pick/edit/remove/setDefault`, tự chèn CSS + hộp thoại) — dùng ở khung đặt và **trang Tôi → mục "Địa chỉ của tôi"** (danh sách, Sửa, Xóa (trừ mặc định/của mình), Thiết lập mặc định, + Thêm địa chỉ mới). Chưa có: SMS báo người nhận. **Khung đặt làm gọn lại** (người dùng chê "chắp vá", ô địa chỉ sọc phong bì "kỳ cục"): nhãn chữ thường đậm thay chữ in hoa xám; mọi nút lựa chọn cùng một kiểu (cao 40, bo 10, phụ phí nằm cùng dòng); Số lượng một hàng (nhãn trái, bộ +/− gọn phải); địa chỉ là **dòng nền kem** ngay dưới Cách nhận (tên · SĐT, địa chỉ, "Thay đổi" cam), bỏ viền sọc và nhãn Mặc định; đường kẻ chia 3 phần: chọn món · nhận hàng · ghi chú & tổng (CSS `#order …` cuối khối style).
- **Khung đặt 2 bước kiểu ShopeeFood** (người dùng gửi ảnh ShopeeFood + 2 bài hướng dẫn Shopee/ShopeeFood, chê khung cũ "loạn mắt"): **Bước 1 – khung phải chỉ chọn món**: tùy chọn & câu hỏi chọn 1/chọn nhiều thành **hàng danh sách** (tên trái, phụ phí + nút tròn/ô vuông cam phải, nhãn "Chọn 1/Chọn nhiều"), số lượng, nút **"Tiếp tục · giá"**. **Bước 2 – hộp "Xác nhận đơn hàng"** (nền xám, các khối trắng như Shopee): Địa chỉ nhận hàng (> mở sổ địa chỉ) · món + tùy chọn đã chọn · **gạt "Giao tận cửa"** (+phí, tắt = tự đến lấy) · Nhận lúc / Ngày & giờ (> mở lịch, dịch vụ chưa chọn giờ thì tự mở + chặn đặt) · **gạt "Lấy dụng cụ ăn uống"** (đồ ăn) · Ghi chú (ô một dòng) · Voucher AntGo (Xu) · **Phương thức thanh toán Tiền mặt / Chuyển khoản** · Chi tiết thanh toán · chân hộp: Tổng cộng cam + nút **"Đặt đơn"** (dịch vụ: tên hành động, vd "Đặt lịch"). Đặt xong hiện màn "Đã gửi đơn!" trong hộp. Tính tiền theo trạng thái (`optAdd/grand/sumRows`), không đọc giao diện. Hộp xác nhận cũ (`submit`) đã bỏ.
- **Học Airtasker cho nhận việc** (người dùng: "thấy cái nào tối ưu thì làm"; airtasker.com chặn 403, tham khảo qua trợ giúp Airtasker): (1) **trạng thái việc** "● Đang mở · n đề nghị" / "Đã có người nhận" trên thẻ việc (trang chủ, Khám phá, tìm kiếm, Việc khác) và đầu `job.html` — trường `offers` trong dữ liệu mẫu; (2) **Hỏi đáp công khai** trên `job.html` (`#qa`): câu hỏi + trả lời của người đăng hiện cho mọi người, **chặn số điện thoại** (≥9 chữ số), câu mới "Chờ … trả lời" lưu `antgo_qa_j1`, việc đã có người nhận thì đóng; nút "Nhắn hỏi thêm" → **"Hỏi công khai"**; ở Đơn hàng khi mới "Đã gửi đề nghị" nút Nhắn → **"Hỏi đáp"** (nguyên tắc như Airtasker: **chưa được chọn thì chỉ hỏi công khai, nhắn riêng mở khi được chọn**) → **người dùng đổi ý 16/10: vẫn cho Nhắn tin riêng** ("hỏi công khai rồi nếu ngại thì ib riêng"): nút ở thẻ người đăng là **Nhắn tin** (nền xanh đen), Đơn hàng trả lại nút Nhắn; hỏi đáp công khai vẫn chặn số điện thoại. Thẻ **Người đăng việc** làm lại thành một khung: ảnh + tên + 2 dòng thông tin + nút Nhắn tin, dải kem 4 ô (★ đánh giá · việc đã đăng · việc hoàn thành · trả công đúng hẹn). **Chưa làm** (3) đề nghị kèm giá/mặc cả tiền công — ghi trong HANDOFF để bàn với phía Bán. Hộp Xác nhận đơn hàng đổi sang nền trắng + đường kẻ (người dùng thấy nền be lệch với các trang).
- **17/10:** đánh giá mẫu ở `detail.html` tách theo bài (`REVS_BY[key]`: đồ ăn, đồ dùng, giặt sấy, sửa máy, dọn nhà, giao nhận — 5–10 câu, có phản hồi người bán, ảnh đúng chủ đề); nhãn người đánh giá theo loại (Đã đặt món / Đã mua / Đã dùng dịch vụ); điểm & số đánh giá tự tính theo bộ. **Đã lưu tách nhóm** (17/10): loại `food` mới cho đồ ăn & uống (thẻ trang chủ, chi tiết bài, tìm kiếm ghi `k:"food"`; `common.js` tự đổi dữ liệu cũ "goods" của món ăn sang "food"); ngăn kéo và trang Tôi lọc **Tất cả · Đồ ăn & uống · Đồ dùng · Dịch vụ · Việc làm**. Sửa lỗi trang Tôi trùng id `savedList` với ngăn kéo (đổi thành `pfSaved`) làm ngăn kéo trống. Thêm **bài mẫu đồ uống** `?p=drink` (Trà sữa trân châu đường đen — Quán Nhà Mây, Shop 5): chọn Size / Độ ngọt / Đá (chọn 1) + Thêm topping (chọn nhiều, có giá), gạt **"Lấy ống hút"** ở bước xác nhận, đánh giá riêng; nút lọc "Đồ ăn" → **"Đồ ăn & uống"** (trang chủ, tìm kiếm); thẻ cà phê/trà sữa mở bài đồ uống; HANDOFF có nhóm chọn sẵn cho đồ uống. Bài Nồi chiên thay ảnh đồ ăn bằng ảnh bếp/đồ chiên; "Bài khác của …" chỉ lấy bài cùng người bán (ẩn nếu không có), "Tương tự trong khu" đúng loại, thẻ mở đúng bài. Thay ảnh lạc đề ở bài Lấy đồ hộ (xe máy giao hàng, thùng hàng, kệ rau, xe đẩy siêu thị, kho bưu kiện), Giặt sấy, Sửa máy, Dọn nhà (ID Unsplash đã kiểm tra bằng ảnh ghép).

## 3. Quyết định quan trọng & lý do

| Quyết định | Lý do |
|---|---|
| Thiết kế cho **web máy tính** (header trên cùng thay bottom nav) | Người dùng xác nhận "thiết kế web chứ không phải mobile". Responsive cho mobile chưa bàn. |
| **HTML/CSS/JS thuần**, không framework | Mở file là chạy, hợp vòng "dựng → bấm thử → góp ý → sửa". |
| Linh vật **kiến cam cưỡi máy bay giấy** là điểm nhấn thương hiệu | Đồng bộ trang giới thiệu và trang chủ, tạo "wow" mà không cần trang trí khác. |
| **Wow tập trung vào 2–3 khoảnh khắc** (kiến sống, hạt bung, chữ cong), phần còn lại yên tĩnh | Chỗ nào cũng nổi thì rối và ra "mùi AI". |
| **Cam đất chỉ cho nút hành động chính + giá bài quảng bá**; giá thường, link, tab dùng màu chữ | Tô cam khắp nơi làm mất điểm nhấn và giống mẫu AI. |
| Bỏ 3 tab Hàng hóa/Dịch vụ/Việc làm trên ô tìm kiếm | Bấm không đổi nội dung (lỗi UX), trùng bộ lọc ở "Khám phá"; tìm kiếm chung theo user flow F02. |
| Chia nội dung theo **ngữ cảnh** (Nổi bật / Gần bạn / Việc mới / Khám phá) | Người dùng chọn; lướt tự nhiên hơn chia theo loại. |
| **AntXu dùng cho cả hai phía, nhưng đặt đúng chỗ** (tối 14/10, thay quyết định "chỉ người bán" trước đó): người mua thấy số dư trên header, **đổi voucher trong ngăn kéo Xu**, **áp voucher ở bước đặt hàng**; trên thẻ chỉ có nhãn nhỏ "Dùng được Xu"; người bán dùng Xu để quảng bá | Người mua cần Xu để áp voucher (khớp user flow F11). Lần trước ô ưu đãi Xu trên mọi thẻ + ô mời quảng bá làm trang rối, nên chỉ giữ ở header/ngăn kéo/bước đặt hàng. |
| Giữ nhãn **"QUẢNG BÁ"** trên bài trả phí | Minh bạch, theo user flow F04. |
| Bỏ thẻ "Bếp Cô Lan vừa nhận 3 đơn" (lịch sử) | Quy tắc cấm số liệu giả đã bỏ 18/10; dữ liệu mẫu được dùng để demo. |
| Khối mở đầu đổi sang **chữ AntGo uốn cong trên nền trời** (cảm hứng Airtasker) | Khuôn hero 2 cột cũ bị thấy "mùi AI". Nền trời (không phải nền cam) vì kiến cam chìm trên nền cam và để nối liền với landing. |
| Đổi dáng kiến: **dừng hẳn rồi mới đổi**, hạt bung trước nửa nhịp, hiệu ứng nảy ở lớp riêng | Người dùng nhiều lần phản hồi "khựng"; mờ chồng 2 ảnh lộ "2 con kiến". |
| Icon dùng **bộ có sẵn (Phosphor)**, không tự vẽ | Icon tự vẽ không đều nét; người dùng muốn dùng bộ sẵn. |
| Đồng xu AntXu dùng ảnh 3D của người dùng (bản ít bóng) | Cùng phong cách con kiến; bản đầu "bóng quá". |
| Không sắp xếp ở toàn trang, chỉ ở khối "Khám phá quanh khu" | Người dùng muốn có sort; đặt ở khối lướt dài nhất cho đúng chỗ. |
| **Đề nghị nhận việc đang chờ vẫn hiện trong Đơn hàng** (nhóm Đơn đã nhận, trạng thái "Chờ … chọn người") — chốt 15/10 | Nếu không, gửi xong người dùng không có chỗ theo dõi/rút lại. Vẫn ghi rõ "gửi đề nghị chưa phải là đã nhận việc" (F10). |
| **Trả công trực tiếp** giữa hai bên (tiền mặt/chuyển khoản), AntGo không giữ tiền; người nhận việc bấm "Đã nhận tiền công" — chốt 15/10 | Đơn giản cho bản mẫu, không cần cổng thanh toán; có lối "Chưa nhận được tiền công?" → nhắn trước, sau 3 ngày báo hỗ trợ. |
| Các bước việc đã nhận: **Đã gửi đề nghị → Được chọn → Đang làm → Đã báo xong → Hoàn thành** + nhánh Không được chọn / Đã rút / Đã hủy — chốt 15/10 | Người đăng chọn người (tránh nhiều người cùng nhận, F10); "Bắt đầu làm" để chủ việc biết đã tới; "Báo hoàn thành" kèm ảnh để dễ kiểm tra; **tự hoàn thành sau 24 giờ** nếu chủ việc im lặng, để người làm không bị treo. |
| **Địa chỉ chính xác chỉ hiện từ bước "Được chọn"** | An toàn cho người đăng việc; trước đó chỉ hiện khu/block. |
| Xin hủy phải **chọn lý do**; hủy sát giờ "hiện trong hồ sơ" | Người đăng cần biết lý do để tìm người khác; ràng buộc nhẹ chống hủy tùy tiện. |
| Danh sách đơn **không lọc theo trạng thái** *(16/10: chia Cần bạn xử lý / Đang diễn ra, đã kết thúc sang tab Lịch sử, bỏ viên "Cần bạn")* | Theo quyết định đã chốt (PROJECT_CONTEXT 5.1); viên cam giúp thấy ngay đơn cần xử lý mà không cần bộ lọc. Cam vẫn chỉ dùng cho việc cần làm. |
| **Thứ tự làm & chia việc với bạn của người dùng** (15/10): làm Đơn hàng trước (chốt trạng thái đơn) → tách phần dùng chung + viết `docs/handoff.md` → **rồi mới giao** không gian Bán & Đăng việc; người dùng làm tiếp Tìm kiếm / Messenger / Thông báo / Tôi song song | Đơn hàng là chỗ nối hai không gian (phía bán là "Giao dịch") — giao trước khi chốt trạng thái thì hai bên tự đặt hai bộ trạng thái khác nhau; chờ xong hết thì bạn kia ngồi không. |
| **Mọi trang dùng chung header + footer trang chủ** (`shared/chrome.css` + `common.js`) — 16/10 | Header rút gọn Codex làm khiến người dùng tưởng sang app khác. |
| **4 nhóm phía Mua: Đồ ăn · Đồ dùng · Dịch vụ · Việc làm** (thay "Hàng hóa"); 3 mẫu đăng bài Đồ ăn / Đồ dùng / Dịch vụ — người dùng đề xuất 16/10 | Đồ ăn và đồ dùng mua khác hẳn nhau (thực đơn theo ngày vs bán một lần); đồ ăn là thứ mua nhiều nhất nên cần tab riêng. |
| **Ghi rõ loại bài dưới tiêu đề** + không dùng chữ "việc" cho dịch vụ ("Chạy việc" → "Giao nhận hộ") | Người dùng nhầm bài dịch vụ Lấy đồ hộ với Việc làm. |
| **Đặt hàng 2 bước kiểu ShopeeFood**: khung phải chỉ chọn món (hàng + nút tròn), hộp "Xác nhận đơn hàng" chứa địa chỉ, cách nhận (gạt), giờ, dụng cụ ăn uống, ghi chú, voucher, **Tiền mặt / Chuyển khoản**, tổng | Khung một cột chứa mọi thứ bị chê "chắp vá, loạn mắt" 3 lần; người dùng gửi ảnh + bài hướng dẫn ShopeeFood làm mẫu. Hộp dùng nền trắng + đường kẻ như các trang (nền be bị chê lệch). |
| **Địa chỉ kiểu Shopee**: sổ địa chỉ (chọn / thêm / sửa / mặc định); **đặt cho người khác = chọn địa chỉ người đó**, không có ô tích riêng | Người dùng muốn "giống Shopee"; một cơ chế cho cả đặt hộ lẫn nhiều địa chỉ của mình. |
| **Trang chủ không hiện đơn của người dùng** (bỏ dải "Của bạn hôm nay"); việc cần xử lý gom ở khối **"Cần bạn xử lý"** đầu trang Đơn hàng | Người dùng: thuộc về Đơn hàng; trang chủ để khám phá. |
| **"Đơn đã nhận" → "Việc đã nhận"**; thêm tab **Lịch sử** cho đơn đã kết thúc | Tránh nhầm với đơn mua; danh sách đang chạy gọn hơn. |
| **Trạng thái dùng bộ tên cố định = tên bước trên thanh tiến trình**, không cá nhân hóa ("Chờ chị Hoa…"), bỏ viên "Cần bạn: …" | Người dùng muốn thống nhất; câu hướng dẫn cụ thể để trong khung hành động ở chi tiết. |
| **Không lặp thông tin**: bỏ khối Lịch sử (trùng thanh tiến trình, ngày giờ đặt dưới từng bước); dòng phụ dưới tiêu đề = người + uy tín, không nhắc lại thời gian/địa điểm; thông tin việc thành **bảng dạng hàng** | Người dùng chê lặp và "căn tùm lum". |
| **Hình thức thanh toán chỉ "Tiền mặt" / "Chuyển khoản"** | Người dùng chốt; thời điểm trả nhắc trong khung hành động. |
| **Nhận việc kiểu Airtasker**: trạng thái "Đang mở · n đề nghị", **Hỏi đáp công khai** (chặn SĐT) **và vẫn cho Nhắn tin riêng** | Hỏi công khai giảm hỏi lặp và an toàn; người dùng muốn "ai ngại thì ib riêng" nên bỏ quy tắc "chỉ nhắn khi được chọn". |
| **Chưa làm đề nghị kèm giá / mặc cả tiền công** | Đổi số tiền ở Đơn hàng và cần phía người đăng (phần bạn của người dùng) thấy giá — ghi trong HANDOFF để bàn. |
| **Gian hàng công khai** (`shop.html`) mở từ ảnh/tên người bán, người đăng việc | Người dùng muốn "nhấp vào ra gian hàng của người ta" như Shopee. Bỏ ô "trả công đúng hẹn" vì đã có đánh giá. |
| **Nút hành động thống nhất**: 1 nút chính cam + nút viền phụ (Rút đề nghị, Xin hủy, Chưa nhận tiền công, Yêu cầu hủy…); link chữ chỉ còn "Báo cáo vấn đề" | Dòng chữ gạch chân lẫn nút nhìn "tùm lum". |

## 4. Việc cần làm ở phiên sau (cập nhật cuối phiên 16/10)

1. **Người dùng bấm thử luồng đặt hàng mới** (`detail.html?p=food|goods|svc|fix|clean|trip` → Tiếp tục → Xác nhận đơn hàng → Đặt đơn → Đơn hàng) và luồng nhận việc (`job.html` → hỏi đáp / nhắn tin / đề nghị → `orders.html?id=j1…j6`). Sửa **từng điểm một** theo góp ý; nhớ thử bằng cửa sổ ẩn danh vì dữ liệu cũ trong trình duyệt có thể che thay đổi.
4. **Đơn đã đặt:** chốt quy tắc hủy/trả/hoàn; thêm bước **"Đồng ý phụ thu"** (dịch vụ Giao nhận hộ khi đồ to hơn đã chọn); hiển thị đầy đủ địa chỉ/đặt hộ/thanh toán từ đơn mới.
5. **Bàn với phía Bán (docs/handoff.md):** đề nghị kèm giá; nơi người đăng **trả lời Hỏi đáp**; nút **báo phụ thu**; 3 mẫu đăng bài; trạng thái việc Đang mở / Đã có người nhận; gian hàng là trang công khai của người bán.
6. Cập nhật `docs/user-flows.md` cho khớp giao diện hiện tại (4 nhóm, đặt hàng 2 bước, sổ địa chỉ, hỏi đáp, gian hàng, Việc đã nhận + Lịch sử).
7. **Để sau:** SMS báo người nhận khi đặt hộ, gợi ý/lịch sử tìm kiếm, theme/font thống nhất với landing, chuyển động nhỏ trên thẻ, logo, ảnh linh vật nhiều dáng, nối máy chủ thật.

### Kế hoạch cũ trước khi dựng các màn còn lại (chỉ để đối chiếu)

1. Tiếp tục nhận góp ý danh sách + chi tiết Đơn đã nhận trong `orders.html` và chỉnh từng điểm; giữ bố cục 4 ô "Thông tin việc" hiện tại trừ khi người dùng yêu cầu khác.
2. **Nhờ người dùng xem bản thử chi tiết Đơn đã đặt** (`orders.html?id=o1|o2|o3`) và góp ý từng điểm. Chỉ sau đó mới chốt quy trình, điều kiện hủy/trả hàng và bộ trạng thái để bàn giao.
3. **Chuẩn bị bàn giao không gian Bán & Đăng việc cho bạn của người dùng** (người dùng đã đồng ý cách làm, chưa thực hiện):
   - Tách phần dùng chung vào `design/mockups/shared/`: `base.css` (màu, font, nút, ô nhập, thẻ), `header.js` (header + công tắc Mua|Bán), `icons.js` (symbol Phosphor), giữ `drawers.js`. Quy ước: file trong `shared/` chỉ sửa khi hai người thống nhất. (Thay cho việc cũ "gom code vào `app/`".)
   - Viết `docs/handoff.md`: màn hình phía Bán (Tổng quan, Bài đăng + form đăng **sinh ra đúng 7 khối** mà `detail.html` đọc, Giao dịch = mặt còn lại của Đơn hàng, chọn người cho việc làm, Quảng bá bằng Xu); **cấu trúc dữ liệu** bài đăng / đơn / đề nghị; **bộ trạng thái đơn chung**; khóa localStorage (`antgo_saved`, `antgo_orders`); tham số link (`?p=`, `?state=`, `?id=`, `?f=`); luật thiết kế mục 1; lưu ý bản quyền ảnh.
   - Chép các luật làm việc từ bộ nhớ riêng của Claude vào `CLAUDE.md` (bộ nhớ không đi theo sang máy bạn kia).
   - Đề xuất tạo **git + GitHub** (thư mục hiện **chưa có git**) — hỏi người dùng trước.
   - **Còn chờ người dùng chốt:** Messenger, Thông báo, trang Tôi do ai làm.
4. **Trang Kết quả tìm kiếm / "Xem tất cả"** (`search.html`, bố cục đã đề xuất): tiêu đề "Kết quả cho … · N bài trong Block B" + đổi khu vực; tab Tất cả/Hàng hóa/Dịch vụ/Việc làm có số đếm; cột lọc trái đổi theo tab (chung: khoảng cách, giá, đang nhận đặt, dùng được Xu; hàng hóa: danh mục, tình trạng, cách nhận; dịch vụ: kiểu giá, làm tại nhà; việc làm: thời gian, tiền công tối thiểu); viên bộ lọc đang chọn + Xóa tất cả; sắp xếp theo loại; lưới 3 cột, 2 kiểu thẻ; hết bài trong khu → "Ở khu gần đó" có nhãn vị trí; không có kết quả → kiến ló đầu + 3 gợi ý + nút "Đăng việc cần người"; nối ô tìm kiếm, "Phổ biến", "Xem tất cả", "Tìm việc gần nhà".
5. **Cập nhật `docs/user-flows.md`** cho khớp giao diện: chia khối mới, bỏ 3 tab, AntXu (đổi voucher ở ngăn kéo, áp ở bước đặt hàng), Đã lưu (ngăn kéo), mô hình 7 khối, các bước việc đã nhận + trả công trực tiếp.
6. Messenger, Thông báo (mở đúng đơn liên quan), Tôi (hồ sơ, trang Đã lưu đầy đủ), chọn khu vực.
7. Việc nhỏ còn treo: đánh giá mẫu theo từng loại bài ở `detail.html`; chốt theme Kem/Trắng ấm và thống nhất font với landing; chuyển động nhỏ trên thẻ (nhích lên, ảnh phóng, tim bật).
8. **Để sau:** logo AntGo, bộ ảnh linh vật nhiều dáng (cắt + làm sạch quầng vàng), tìm kiếm bằng ảnh thật (cần máy chủ), dải "Đơn đang diễn ra" dưới header, icon danh mục 3D.

## 5. Ghi chú kỹ thuật

- **Git** (tạo 15/10, chỉ ở máy, chưa có GitHub): trước mỗi thay đổi lớn hoặc khi đổi trợ lý → `git add -A && git commit -m "…"`. Muốn bỏ thay đổi chưa lưu của một file: `git restore <file>`; xem lại bản cũ: `git log --oneline`.
- **Công cụ phụ ở `tools/`** (xem `tools/README.md`): `shot.sh` chụp kiểm tra, `image/*.cs` xử lý ảnh linh vật, `icons/` icon Phosphor đã tải, `build-history/` các script đã dùng để dựng trang (chỉ tham khảo, không chạy lại).

- Chụp kiểm tra: Edge headless `--virtual-time-budget=…` (đường dẫn có dấu tiếng Việt → chụp vào thư mục tạm rồi copy). Edge headless không chạy được chuyển động thật — trạng thái giữa chừng phải ép bằng script tạm (`_*.html`, nhớ xóa).
- ffmpeg dùng qua `imageio-ffmpeg` trong venv ở thư mục tạm (không cài vào hệ thống).
- Làm sạch ảnh linh vật: script C# `Clean.cs` (giữ khối đặc lớn nhất, bỏ quầng/hạt rời, cắt sát, thu nhỏ) và `Key2.cs` (tách nền trời xanh). Đã chép vào `tools/image/`.
- Icon Phosphor mới: tải bản fill từ `cdn.jsdelivr.net/npm/@phosphor-icons/core@2.1.1/assets/fill/<tên>-fill.svg`, lấy phần `<path>` nhúng thành `<symbol viewBox="0 0 256 256">`.
- Trang mới dựng bằng script Python (`python -I`) cắt khung header/icon/footer từ trang có sẵn rồi ghép nội dung riêng; sửa nhỏ bằng thay chuỗi có `assert` (chuỗi không khớp thì dừng). Luôn sao lưu file vào thư mục tạm trước khi sửa.
- Kiểm tra thao tác bấm: tạo bản tạm `_t.html` chèn script gọi hàm (ví dụ `act('j5','paid')`) rồi chụp hoặc `--dump-dom`; xóa file tạm sau đó. Trong lệnh `sed`, viết JS bằng nháy đơn (dấu `\"` làm hỏng lệnh).
- Tránh đặt tên class chung chung như `.tag` — CSS gốc đã dùng cho thứ khác (đã gặp lỗi nhãn bị lạc ra góc màn hình).
