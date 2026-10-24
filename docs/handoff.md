# AntGo Web2 — Bàn giao không gian Bán & Đăng việc

> 15/10/2026. Người làm phần Bán đọc `AGENTS.md` → `CLAUDE.md` trước, rồi đọc tài liệu này. Phần Mua là bản mẫu HTML/CSS/JS thuần trong `design/mockups/`; người dùng sẽ tự kiểm tra vào ngày mai. Những quy tắc hủy, trả hàng và hoàn tiền vẫn chưa chốt, không coi hành vi mẫu là chính sách thật.

## Phạm vi và điểm bắt đầu

- Không gian **Mua** đã có: `home-v5.html`, `search.html`, `detail.html`, `job.html`, `orders.html`, `messenger.html`, `notifications.html`, `profile.html`, `support.html`.
- Phần **Bán & Đăng việc** chưa được dựng. Dự kiến làm Tổng quan, Bài đăng của tôi, form đăng hàng/dịch vụ, form đăng việc cần người, Giao dịch phía bán, chọn người làm, Quảng bá bằng Xu. Giữ mỗi màn trong **một file HTML**, không tạo v2/v3.
- Không tự đổi `design/mockups/shared/` khi hai phía đang làm song song. Hiện có `base.css` (nền trang mới), `icons.js` (Phosphor SVG), `common.js` (header/điều hướng/chọn khu vực), `catalog.js` (bài mẫu để tìm), `drawers.js` (Đã lưu/AntXu ở trang cũ). Các trang cũ vẫn có CSS/header riêng; `common.js` nối điều hướng mà không sửa bố cục đã được duyệt. Việc hợp nhất header/CSS cần làm sau khi hai phía cùng duyệt.

## Hợp đồng giữa hai không gian

| Khái niệm | Phía Mua | Phía Bán dự kiến |
|---|---|---|
| Khách đặt hàng/dịch vụ | `orders.html` → **Đơn đã đặt** | Giao dịch → **Đơn khách đặt** của cùng `id` |
| Người đề nghị nhận việc | `orders.html` → **Đơn đã nhận** | Giao dịch → **Yêu cầu của tôi** của cùng `id` |
| Hội thoại | Một `messenger.html` chung cho tài khoản; URL `?to=...&order=...` hoặc `?post=...` / `?job=...` | Mở cùng hội thoại, gắn ngữ cảnh bài/đơn, không tạo hộp thư thứ hai |
| Thông báo | `notifications.html`, link thẳng `orders.html?id=...` | Link thẳng tới đúng giao dịch phía Bán khi màn đó đã có |
| Hồ sơ | `profile.html` dùng chung | Không tạo hồ sơ riêng trùng lặp |

### Dữ liệu mẫu đang dùng

- `localStorage["antgo_orders"]`: object theo ID. `j1…j6` là patch trạng thái của việc mẫu; `o1…o3` là đơn đặt mẫu. Đơn mới do `detail.html` tạo có `_type:"placed"`, `id`, `code`, `kind`, `cat`, `post`, `title`, `who`, `img`, `total`, `when`, `state`, `details`, `hist`, cùng các trường tùy chọn `note`, `voucher`, `estimate`, `quote`, `returnEligible`. Đọc và ghi **cùng bản ghi**, không nhân đôi trạng thái giữa hai không gian.
- Việc nhận làm: `offered → chosen → working → reported → done`; nhánh `rejected`, `withdrawn`, `cancelled`. Người đăng việc là bên chọn người và xác nhận hoàn thành. Địa chỉ chính xác chỉ hiện khi `chosen`. Tự hoàn thành sau 24 giờ hiện mới là mô phỏng UI, chưa có bộ đếm/thời gian máy chủ.
- Đơn đã đặt: bản thử có `waiting → confirmed → preparing → delivering/ready → done`; nhánh `cancelled`, `declined`. Đây **chưa phải bộ trạng thái đã chốt**. Hủy/trả hàng hiện là yêu cầu, không tự hoàn tiền; chỉ hàng hóa có điều kiện mới được trả. Khi thiết kế phía Bán, giữ hành động tương ứng và đánh dấu quy tắc cần chốt.
- `localStorage["antgo_saved"]`: mảng `[key, value]` cho `Map`; giá trị có `k` (`goods|svc|jobs`), `id` ảnh, `t` tiêu đề, `p` giá, `u` đơn vị, `a` khu vực. `antgo_area` lưu Block A–D. `antgo_chats` lưu hội thoại mẫu cục bộ. `antgo_notification_read` lưu trạng thái đã đọc. `antgo_issue_draft_<id>` lưu bản nháp báo cáo, chưa gửi đi.
- Link: `detail.html?p=food|goods|svc|fix|clean|trip`, `job.html?state=offered|closed`, `orders.html?id=<id>`, `orders.html?f=placed|rcv`, `search.html?q=<từ khóa>&type=goods|service|jobs`.

### Mô hình bài đăng

Form đăng hàng/dịch vụ phải tạo dữ liệu mà trang `detail.html` đọc được theo **7 khối tùy bật/tắt**: (1) giá, (2) số lượng, (3) thời gian, (4) địa điểm, (5) tùy chọn cộng giá, (6) câu hỏi riêng, (7) tình trạng bán. Xem dữ liệu `P` và phần dựng form đặt trong `detail.html` trước khi định nghĩa schema lưu. Bài đăng có thể mở lâu dài; mỗi đơn là một lần đặt cụ thể. Việc làm là yêu cầu một lần, có hạn chót và luồng đề nghị/chọn người riêng. Không lấy tên loại bài để suy ra toàn bộ khối mà bài phải có.

**3 mẫu bài khi đăng (người dùng chốt 16/10)** — phía Mua đã lọc theo đúng 4 nhóm *Đồ ăn · Đồ dùng · Dịch vụ · Việc làm* (trang chủ, `search.html?type=food|goods|service|jobs`) và trang chi tiết hiện nhãn loại bài dưới tiêu đề. Form đăng bán cho chọn 1 trong 3 mẫu; mẫu chỉ **bật sẵn** khối, người bán vẫn bật/tắt thêm:

| Mẫu | Khối bật sẵn | Ví dụ trong `detail.html` |
|---|---|---|
| **Đồ ăn & thức uống** | Giá cố định/phần · Số lượng · Tùy chọn (món, khẩu phần) · Cách nhận (giao/tự lấy) · Thời gian (sớm nhất / hẹn giờ) · Tình trạng bán **theo lịch + giới hạn số phần/ngày** · ô "Giờ nhận đặt / Thời gian chuẩn bị" | `?p=food` |
| ↳ *khi là đồ uống* | Như trên + nhóm chọn sẵn **Size (M / L +phí) · Độ ngọt (Ngọt vừa 100% / Ít ngọt 70% / Nửa ngọt 50% / Không đường) · Đá (Đá vừa / Ít đá / Không đá) · Topping (chọn nhiều, mỗi món có giá)**; ở bước xác nhận có gạt "Lấy ống hút" thay cho "Lấy dụng cụ ăn uống" | `?p=drink` |
| **Đồ dùng** | Giá cố định · Tình trạng (mới/đã dùng) · Cách nhận · Tình trạng bán **bán một lần** · không có khung giờ | `?p=goods` |
| **Dịch vụ** | Giá cố định / theo đơn vị / "từ" / **báo giá sau** · Thời gian (khung 30' hoặc ngày + thời lượng) · Địa điểm (tại nhà khách / tại chỗ người bán / A→B) · Câu hỏi riêng | `?p=svc`, `fix`, `clean`, `trip` |

Lưu ý tên gọi: không dùng chữ "việc" cho dịch vụ (đã đổi "Chạy việc" → "Giao nhận hộ") để không lẫn với **Việc làm** (người đăng cần người, người khác gửi đề nghị). Dịch vụ "Giao nhận hộ" có câu hỏi Kích thước (dưới / từ 10kg, +10.000đ); phía Bán cần nút **báo phụ thu** khi đồ thực tế to hơn, người mua đồng ý trước khi lấy (phía Mua chưa có bước "Đồng ý phụ thu").

## Quy tắc giao diện và dữ liệu

- Trả lời, ghi chú bằng tiếng Việt. Trước thay đổi lớn, xem `CLAUDE.md` để giữ quyết định đã chốt. Không đổi thiết kế `orders.html` phần 4 ô địa điểm nếu người dùng chưa yêu cầu; người dùng đã chọn giữ bản cũ.
- AntGo là **web máy tính** với header trên cùng. Màu cam chỉ dành cho hành động chính/giá bài quảng bá, không tô cam mọi nơi. Bài trả phí có nhãn **QUẢNG BÁ**. Dùng bộ icon Phosphor sẵn có, không vẽ icon/emoji thay ảnh. Không dựng số đơn, đánh giá, số dư, lượt xem hoặc thời gian phản hồi giả.
- Ảnh món/dịch vụ từ Unsplash chỉ là minh họa. Ảnh linh vật gốc của người dùng trong `design/mockups/assets/` phải giữ nguyên; bản đã làm sạch ở `design/mockups/assets/clean/`.
- Cần máy chủ để đồng bộ hai tài khoản, gửi tin nhắn/thông báo/báo cáo thật, quản lý thanh toán và Xu. UI hiện chỉ lưu thao tác tại một trình duyệt.

## Việc cần chốt với người dùng sau khi họ bấm thử

1. Bộ trạng thái chính thức cho **Đơn đã đặt** và thao tác phía bán ở từng bước.
2. Điều kiện hủy, trả hàng, hoàn tiền và xử lý tranh chấp; áp dụng khác nhau cho hàng hóa/dịch vụ.
3. Quy tắc chọn một/nhiều người cho một việc và giới hạn số người.
4. Cách tính/đổi/dùng AntXu và dữ liệu tài khoản thật.

Tài liệu `docs/project-context.md` ghi kiến trúc nghiệp vụ rộng hơn nhưng có vài quyết định giao diện cũ (mobile/bottom nav). Khi khác nhau, theo `CLAUDE.md` và bản mẫu hiện tại.

## Bổ sung 16/10 — nhận việc kiểu Airtasker
- **Hỏi đáp công khai** trên trang việc (`job.html#qa`, dữ liệu mẫu + `localStorage["antgo_qa_j1"]`): phía Bán (người đăng việc) cần nơi **trả lời** câu hỏi; câu trả lời hiện cho mọi người. Không cho số điện thoại trong hỏi đáp. Người nhận việc **vẫn nhắn riêng được** bất cứ lúc nào (người dùng chốt 16/10); hỏi đáp công khai dành cho câu hỏi chung.
- **Trạng thái việc** hiển thị cho người mua: Đang mở · số đề nghị / Đã có người nhận. Phía Bán cập nhật số đề nghị và đóng việc khi đã chọn.
- **Chưa chốt:** cho người nhận việc **đề xuất tiền công khác** (Airtasker bắt buộc ghi giá khi đề nghị). Nếu làm, đề nghị cần thêm trường `price`, người đăng thấy giá khi chọn người, và tiền công trong Đơn hàng lấy theo giá được chấp nhận.


## Bổ sung 23/10 — Câu hỏi riêng của bài (hai phía dùng chung một kiểu dữ liệu)

Khung đặt hàng phía Mua (`client/src/app/features/posts/post-detail`) **không còn đọc câu hỏi cố định theo loại bài** mà vẽ đúng danh sách `Post.questions` do người bán soạn ở form đăng bài. Kiểu dữ liệu nằm ở `client/src/app/core/models/post.ts` (`PostQuestion`).

**4 loại câu hỏi (người bán chọn loại, không tự vẽ ô nhập):**

| `type` | Hiện cho người mua | Trường cần có |
|---|---|---|
| `text` | Nhãn + ô nhập chữ (1 dòng; `long: true` thì nhiều dòng) | `label`, `ph` (chữ gợi ý, ví dụ "1 thùng hàng Shopee tên Thu Hà"), `required` |
| `choice` | Chọn 1 trong danh sách | `label`, `opts` |
| `multi` | Chọn nhiều | `label`, `opts` |
| `photo` | Nút thêm ảnh | `label`, `required` |

- Lựa chọn viết `"Tên"` hoặc `"Tên|+5.000đ"` (có phụ phí, tự cộng vào tiền đơn). Mỗi câu có thể có `hint` (dòng giải thích nhỏ).
- Câu `pay: true` ("Cần trả tiền giùm?"): người mua chọn "Có" thì hiện ô nhập số tiền, ghi vào đơn.
- Câu `required: true` hiện dấu `*` đỏ sau nhãn và chặn bấm Tiếp tục nếu chưa điền.

**Form đăng bài cần có (phía Bán):** khối "Thông tin cần hỏi người mua": nút **Thêm câu hỏi** → chọn loại → đặt tên → (chọn 1/nhiều) thêm lựa chọn + phụ phí → bật/tắt bắt buộc → kéo để đổi thứ tự. Kèm **thư viện câu hỏi gợi ý bấm một lần**: `client/src/app/core/config/question-presets.ts` (`questionPresets(loạiBài)` và `GENERIC_QUESTIONS`). Không có câu nào thì người mua chỉ thấy ô "Ghi chú" ở bước xác nhận.

**Đơn vị giá/số lượng:** nên cho người bán **chọn từ danh sách cố định** (phần, ly, cái, combo, kg, giờ, lần, buổi…) thay vì gõ tự do. Phía Mua chuẩn hóa hiển thị ở `client/src/app/core/utils/unit.ts`; khi form có danh sách cố định thì bỏ bước chuẩn hóa đó.

## Bổ sung 23/10 — Quy tắc hiển thị đơn theo nhóm (đã chốt với người dùng)

**4 nhóm:** Đồ ăn & uống · Đồ dùng · Dịch vụ · Việc làm. (Đồ uống gộp vào Đồ ăn: cùng các bước, cùng cửa sổ báo vấn đề; ống hút / size / đường / đá chỉ là lựa chọn bên trong bài.)

**Bố cục trang đơn (mọi nhóm):** đầu trang (loại, mã đơn, tên, người bán, tổng) → thanh tiến trình → Nội dung đơn → Chi phí (Thành tiền · Phí vận chuyển · Voucher · Tổng) → bảng hành động bên phải (người bán + trạng thái, tiêu đề + một câu, nút, báo cáo). Nội dung đơn chỉ liệt kê điều người mua đã chọn; dòng trống thì ẩn. Phía Bán thấy cùng dữ liệu, khác nút hành động.

| | Đồ ăn & uống | Đồ dùng | Dịch vụ | Việc làm |
|---|---|---|---|---|
| Gọi là | Đơn đã đặt | Đơn đã đặt | Đơn đã đặt | Việc đã nhận |
| Các bước (`core/utils/placed-steps.ts`) | Đã gửi → Đã xác nhận → Đang thực hiện → Đang giao → Hoàn thành (giao hay tự lấy do hai bên tự thỏa thuận, không đổi tên bước) | **bỏ "Đang thực hiện"** (hàng có sẵn): Đã gửi → Đã xác nhận → Đang giao → Hoàn thành | Đã gửi → Đã xác nhận → Đang thực hiện → Hoàn thành (+ "Duyệt giá" nếu giá chưa chốt; không có bước giao/trả vì mỗi dịch vụ khác nhau) | Đã gửi đề nghị → Được chọn → Đang làm → Đã báo xong → Hoàn thành |
| Giá đổi được | Không (chưa có phụ thu) | Không | Có: ước tính (cân) · báo giá (sửa) · phụ thu; người mua phải duyệt | Không (chưa có mặc cả) |
| Hủy | Chưa xác nhận: hủy ngay. Sau đó: gửi yêu cầu, người bán đồng ý mới hủy | giống | giống; hủy dưới 2 giờ trước giờ hẹn ghi "hủy sát giờ" | Xin hủy kèm lý do |
| Báo vấn đề sau khi nhận | 2 giờ | 24 giờ (trả hàng khi khác mô tả) | 24 giờ (làm lại / giảm tiền) | Không |
| Tiền | Trả khi nhận (tiền mặt / chuyển khoản) | giống | giống | Trả công trực tiếp; người làm bấm "Đã nhận tiền công" |
| Xu | +10 khi xong (đơn ≥ 30.000đ) | giống | giống | +15 khi xong |

Việc còn mở: phụ thu cho đồ ăn; tách riêng việc làm khỏi trang đơn nếu cần.

## Thời gian làm của việc (cập nhật 24/10)
- Bài việc làm có thêm `job.start` (ISO, bắt buộc với việc có ngày cụ thể), `job.end` (ISO, nếu kéo dài nhiều ngày), `job.allDay` (chỉ có ngày, không giờ). Phía Bán: form đăng việc cần chọn **ngày + giờ** bằng ô chọn ngày/giờ thay cho ô gõ chữ tự do.
- Việc lặp theo tuần ("Tối T3 & T5") không có một ngày cụ thể → để trống `start`, ghi chữ ở `job.due`.
- Phía Mua hiển thị bằng `jobWhen()` / pipe `jobWhen` (`core/utils/status-label.ts`) theo một kiểu `dd/MM/yyyy · HH:mm`; đơn việc đã nhận lấy thời gian và địa điểm từ chính bài việc, địa chỉ chính xác (`exactAddress`) lấy từ đề nghị khi được chọn.

## Lưu ý cho phía Bán để thống nhất với phía Mua (24/10)
Mục tiêu: người bán đăng bài và xử lý đơn thế nào thì phía Mua cũng hiển thị đúng như vậy, **không ai tự đặt chữ riêng**.

1. **Bài đăng = các khối, đơn lấy lại từ các khối đó.** Form đăng bài chỉ sinh ra 7 khối (giá, số lượng, thời gian, địa điểm, tùy chọn, câu hỏi riêng, tình trạng bán). Nội dung đơn của người mua (`Order.detail`) được dựng từ đúng các khối này. Người bán **không** gõ tay mô tả đơn.
2. **Tên dòng cố định, người bán không đặt tên:** Thời gian · Hình thức nhận hàng · Địa chỉ · Dụng cụ · Thanh toán · Số lượng (hoặc "Khối lượng ước tính" khi bán theo kg). Người bán chỉ đặt: tên các **câu hỏi riêng**, tên **tùy chọn** và các lựa chọn, đơn vị tính, giá cộng thêm.
3. **Lựa chọn mặc định:** lựa chọn đầu tiên của một nhóm, không phụ phí, mà nhóm đó có lựa chọn nâng cấp trả thêm (vd. "Phần cơm: Vừa" / "Nhiều cơm|+5.000đ") thì không ghi vào đơn. Muốn rõ hơn, form nên cho người bán đánh dấu "mặc định" cho từng lựa chọn.
4. **Thời gian:** việc làm dùng `job.start` / `job.end` / `job.allDay` (ISO), form phải có ô chọn ngày giờ. Hiển thị luôn qua `jobWhen()` / `formatDateTime()` (`core/utils/status-label.ts`), kiểu `dd/MM/yyyy · HH:mm`. Việc lặp tuần ghi chữ ở `job.due`.
5. **Trạng thái đơn và nút bấm:** bộ trạng thái và các bước theo loại bài nằm ở `core/utils/placed-steps.ts` (đồ ăn 5 bước, đồ dùng 4 bước, dịch vụ 4 bước + Duyệt giá). Mọi tên nút hành động nằm **một chỗ** ở `core/config/order-actions.ts`; phía Bán thêm hành động mới vào đó, không viết chữ riêng. Nút xếp song song, mỗi hàng tối đa 2 nút bằng nhau.
6. **Báo giá và phụ thu:** người bán chỉ gửi số tiền, lý do và các dòng chi tiết; người mua thấy "Giá lúc đặt / Chênh lệch / Giá cuối" từ dữ liệu, không phải chữ tự gõ.
7. **Thời hạn:** báo vấn đề / trả hàng trong 2 giờ (đồ ăn), 24 giờ (đồ dùng, dịch vụ) kể từ lúc nhận (`ISSUE_HOURS`). Phía Bán dùng đúng hằng số này khi hiển thị hạn xử lý.
8. **Giao diện dùng chung:** icon chỉ dùng bộ **Phosphor** (`index.html`), khung chọn ảnh dùng class `.photo-add`, ngày giờ dùng helper chung, ảnh đơn dùng `app-order-thumb`, ảnh đại diện dùng `app-avatar`. Không tự vẽ icon hay viết lại component đã có ở `shared/`.
9. **Dữ liệu mẫu:** sửa cấu trúc dữ liệu mẫu thì đổi `DATA_VERSION` trong `core/services/mock-db.ts` để trình duyệt tự nạp lại.
10. **Chưa có ở phía Mua, cần bàn:** tự hoàn thành đơn đặt sau 2 giờ (đồ ăn) hoặc 24 giờ (đồ dùng, dịch vụ) khi người mua im lặng; người bán cập nhật tiến độ chi tiết theo mẫu bài (ví dụ giặt sấy: "Đang giặt").

## Không gian Bán & Đăng việc — bắt đầu dựng (21/10)
Ý tưởng đã được duyệt (tham khảo Airbnb Host "Today", bTaskee Partner, Shopee/GrabFood Merchant, Airtasker): **một tài khoản bán được nhiều mảng cùng lúc** — Đồ ăn · Đồ dùng · Dịch vụ · Việc cần người — nên mọi màn đều lọc được theo mảng.
- **Menu khi bật "Bán":** Hôm nay · Giao dịch · Lịch · Bài đăng · Hiệu quả · Messenger (không có nút đăng trên header — 4 nút đăng bài nằm ngay dưới hồ sơ gian hàng ở trang Hôm nay). Bấm Mua | Bán ở mọi trang chuyển `home-v5.html` ↔ `seller.html`.
- **`shared/common.js`:** `<div id="siteHeader" data-space="sell" data-active="today">` dựng header phía Bán (không có ô tìm kiếm phía Mua). Link tới màn chưa dựng có `data-soon` → chỉ hiện thông báo. `AntGo.NEW_KINDS` = 4 loại bài đăng.
- **Bản 2 của `seller.html` (21/10, theo góp ý):** bỏ ô "Gian hàng của bạn" → **hồ sơ gian hàng làm tiêu đề trang** (ảnh, tên, loại, khu, ★, số đơn, thời gian trả lời, Hồ sơ 3/5, Xem như khách, công tắc nhận đơn) → **4 nút đăng bài** → **Cần bạn xử lý** đứng đầu (khối nền cam nhạt như `.needgroup` của `orders.html`, lọc mảng bằng nút `.toggles`), thẻ là **thẻ vuông nhỏ giống trang chủ phía Mua** (`.item` có ảnh cho đơn món/đồ dùng — trạng thái ở nhãn góc trái ảnh, hạn ở góc dưới phải; `.item.jobc` ô be cho việc cần người/dịch vụ/hỏi đáp/đánh giá), **4 thẻ một hàng**, còn lại sau nút "Xem thêm"; **thân thẻ giống nhau cho mọi loại** (tên → giá → dòng thông tin + trạng thái, như thẻ món ở trang chủ phía Mua — giá luôn ở thân thẻ, không nằm trong ô be); ảnh có nhãn mảng góc trái + hạn góc phải, ô be có người · nhóm · mô tả · hạn; mỗi thẻ thêm hàng nút: 1 nút chính + nút icon nhỏ (✕ từ chối, 💬 nhắn); Trả lời/Phản hồi mở ô nhập ngay trong thẻ. Hồ sơ gian hàng 2 hàng (loại · khu / ★ đánh giá · số đơn hoàn thành), đã bỏ "thời gian trả lời" và "hồ sơ hoàn thiện". Mục **HIỆU QUẢ** (đổi từ Kết quả) có ô chọn Hôm nay / 7 ngày / 30 ngày / 3 tháng / Năm nay, % tăng trưởng màu xanh ở dòng riêng dưới số (chỉ ghi "+12%", "+3 đơn").
- **Bản 5 (21/10):** 4 nút đăng bài **nền cam, cao 90px**; dưới đó **banner AntXu** "Đưa bài lên Nổi bật trong khu" (số dư Xu + nút "Chọn bài quảng bá" cuộn tới Tình trạng bán). Thẻ Cần xử lý: **nhãn danh mục góc trên trái, nhãn thời gian góc trên phải** cho cả thẻ ảnh lẫn thẻ ô be. **Tình trạng bán** = các mảng xếp nối trong lưới 4 cột, mỗi bài là một thẻ (nhãn trạng thái · lượt xem/QUẢNG BÁ · tên · giá) + **nút chỉnh hợp từng mảng** (đồ ăn: số phần còn + Còn bán; đồ dùng: số lượng + Đang bán; dịch vụ: buổi trống + Nhận lịch; việc cần người: số người cần + Nhận đề nghị) + **nút dùng Xu** (quảng bá 3 ngày 30 Xu; việc: ghim đầu danh sách 20 Xu). Dùng Xu trừ số dư trên banner và header (`S.xu`, lưu `antgo_seller_today`)
- **Bản 6 (21/10) — Lịch hôm nay kiểu Google Calendar:** chỉ ngày hôm nay (xem nhiều ngày ở menu **Lịch**, link "Xem cả tuần"); trục giờ dọc 8:00–19:00 (72px/giờ, khung cuộn, mở ở đơn đầu tiên), dải nền mờ "Nhận đơn 9:00 – 13:00", vạch đỏ giờ hiện tại. Mỗi **đơn đã xác nhận có giờ** và **việc đã chọn người** là một thẻ nhỏ: ảnh món (hoặc ảnh người nhận việc, viền trái xanh) · tên người nhận · giờ · địa chỉ giao · số điện thoại. Đơn **cùng giờ xếp chồng lệch** kèm nhãn "3 đơn", **rê chuột thì xòe ra**; khung giờ chồng lấn thì chia cột như Google Calendar. Xác nhận đơn / chọn người ở Cần xử lý → thẻ tự vào lịch. Icon `phone` thêm vào `shared/icons.js`
- **Bản 7 (21/10):** bỏ mục "Bài cần chú ý"; ô Lịch hôm nay và ô Hiệu quả **cao bằng nhau (540px)**; **Hiệu quả** làm nổi chỉ số: khối số chính nền xanh đen "Đã thu từ đơn" (số 32px + nhãn ▲ % màu xanh) + lưới 2×2 ô nền kem (Đơn hoàn thành ▲, Đã trả công, Đánh giá ★, Lượt xem bài ▲) + link "Xem báo cáo chi tiết" sang menu Hiệu quả → Lịch hôm nay + Kết quả 7/30 ngày → Tình trạng bán → Bài cần chú ý. Tiêu đề nhóm viết hoa nhỏ như `.ogroup h2`, bỏ phần lớn dòng chú thích phụ. Đơn AG-O3012 khớp phía Mua (90.000đ, Đang chuẩn bị). `shared/icons.js` thêm 19 icon Phosphor (calendar, chart, store, plus, pause, eye, pencil, fork, package, wrench, question, megaphone, trend, user, copy, out, sun, moon, play).
- **`seller.html` — Hôm nay (xong bản đầu):** công tắc *Đang nhận đơn / Tạm nghỉ* (cả gian hàng hoặc từng mảng, kèm giờ mở lại); chip lọc mảng có số việc chờ; **Cần bạn xử lý** chia 3 nhóm, nút làm ngay tại chỗ (xác nhận/từ chối đơn, nhận lịch dịch vụ, duyệt yêu cầu hủy, **chọn người nhận việc trong hộp so sánh đề nghị**, xác nhận hoàn thành, trả lời hỏi đáp công khai — chặn SĐT, phản hồi đánh giá); **Lịch của bạn** Hôm nay / Sắp tới gộp mọi mảng + ghi chú riêng; **7 / 30 ngày** (đã thu, đã trả công, hoàn thành, ★, lượt xem — tiền trả trực tiếp, AntGo không giữ tiền); **Gian hàng của bạn** (hồ sơ hoàn thiện, Xem như khách → `shop.html`); **Tình trạng bán** (bật/tắt món, ± số phần); **Bài cần chú ý** (hết hàng, sắp tới hạn, thiếu ảnh, quảng bá Xu). `?new=1` = người bán mới (4 mẫu đăng + 3 bước). Thao tác lưu `localStorage["antgo_seller_today"]`; "Đặt lại dữ liệu mẫu" ở cuối trang.
- Dữ liệu mẫu: tài khoản **Bếp Cô Lan** (số liệu khớp `shop.html`: ★4,3 · 3 đánh giá · 86 đơn · Block B tầng 5). Nút trong khối Cần xử lý dùng **xanh đen** (`.btn.dark`) — cam chỉ cho nền khối và chấm trạng thái, tránh 8 nút cam một lúc.
- **Lệch cần nhóm xem:** `shop.html` dùng ảnh `1494790108377-…` cho Bếp Cô Lan — trùng ảnh tài khoản Ngọc Thủy; seed server dùng `1508214751196-…` (trang Bán theo seed). Chưa sửa `shop.html` vì là file phía Mua.
- **Tiếp theo (mỗi lần một màn):** Giao dịch (`seller-orders.html`, cùng mã đơn + tên bước với `orders.html`) → Bài đăng → Form đăng 7 khối + xem trước → Lịch → Hiệu quả. Chưa chốt: thời hạn tự hủy đơn chờ xác nhận, phụ thu, việc nhiều người (Q4–Q6, F5, F7) — trang chỉ hiển thị như bản mẫu.
- **Bản 8 (21/10) — hoàn thiện cả không gian Bán:** Hiệu quả ở Hôm nay: "Bán · đã thu" và "Thuê người · đã trả" là **hai khối đồng cấp** cạnh nhau + 4 ô (Đơn hoàn thành, Việc thuê xong, Đánh giá, Lượt xem).
  - **`shared/seller-data.js`** (mới) — dữ liệu + thao tác dùng chung mọi trang Bán, lưu chung `localStorage["antgo_seller_today"]`: bài đăng (`posts/setPost`), đơn khách đặt + bước + hành động (`orders/orderActions/orderAct`: xác nhận, từ chối kèm lý do, chuẩn bị, giao/báo khách lấy, hoàn thành, duyệt/không duyệt hủy, báo phụ thu), việc đã đăng + người đề nghị (`jobs/offerAct`: chọn, từ chối, xác nhận xong, đánh giá người làm; `answer`, `setJob`), đánh giá + phản hồi (`reviews/reply`), lịch (`calItems` theo ngày), giờ nhận đơn + ngày nghỉ (`hours/openOf`). Mã đơn/tên/giờ khớp `orders.html` phía Mua (AG-O3012 90.000đ…).
  - **`seller-orders.html` — Giao dịch:** danh sách kiểu `.orow` (Tất cả / Đơn khách đặt / Việc bạn đăng / Lịch sử, nhóm Cần bạn xử lý · Đang diễn ra); `?id=` chi tiết đơn (thanh bước, thông tin, thanh toán, khung hành động theo bước, thẻ khách, phản hồi đánh giá); `?job=` chi tiết việc (so sánh người đề nghị, chọn / từ chối, báo xong kèm ảnh → xác nhận, đánh giá người làm, hỏi đáp công khai chặn SĐT `#qa`, đóng/mở lại, ghim 20 Xu).
  - **`seller-posts.html` — Bài đăng:** lọc mảng / trạng thái (`?kind=`, `?status=promo`) / tìm không dấu; mỗi hàng: sửa giá tại chỗ, ± số lượng, xem · lưu · đã bán, bật/tắt, menu (quảng bá Xu, nhân bản, xem như khách, xóa 2 bước).
  - **`seller-post-form.html` — Đăng bài:** `?type=food|goods|service|job`, `?id=` để sửa. 4 mẫu; bài bán = ảnh (≤ 6, PNG/JPG/WebP ≤ 2 MB, thu nhỏ 480px) + thông tin chung + **7 khối bật/tắt** (giá 4 kiểu, số lượng, thời gian, địa điểm & cách nhận, tùy chọn cộng giá có bộ chọn đồ uống, câu hỏi riêng, tình trạng bán + cho dùng Xu); việc = tên, loại, mô tả, yêu cầu, tiền công, số người, thời gian (lặp hằng tuần), địa chỉ chính xác. Xem trước thẻ như trang chủ + tóm tắt khung đặt; kiểm tra khi bấm Đăng (viền đỏ); Lưu nháp; cảnh báo rời trang chưa lưu.
  - **`seller-calendar.html` — Lịch tuần:** 7 cột kiểu Google Calendar, chuyển tuần, cột hôm nay + vạch giờ, mốc cùng giờ xếp chồng (rê chuột xòe); cột phải: giờ nhận đơn từng thứ (bật/tắt, chọn giờ 30 phút) + ngày nghỉ — dải giờ nhận đơn / “Hôm nay nghỉ bán” ở trang Hôm nay đọc cùng cài đặt.
  - **`seller-insights.html` — Hiệu quả:** mốc Hôm nay → Năm nay; 2 khối đồng cấp Bán / Thuê người + 4 ô; biểu đồ cột đã thu (một chuỗi, một màu, rê chuột xem số, có dạng bảng); thu theo mảng; hành trình khách xem → lưu → đặt; bài bán chạy; việc đã thuê; đánh giá + phản hồi (`#reviews`).
  - Hôm nay: thẻ Cần bạn xử lý / thẻ lịch mở đúng chi tiết; thao tác ở đây hay ở Giao dịch đều đồng bộ. Footer “Đăng bài bán / Đăng việc cần người / Quảng bá bằng AntXu” ở mọi trang và nút “Đăng việc cần người” ở `home-v5.html` mở đúng trang Bán (gắn trong `common.js`, không sửa file phía Mua). `SOON` trong `common.js` nay rỗng.
  - Lưu ý khi đặt `id`: tránh trùng id icon trong `shared/icons.js` (vd. `chart`, `calendar`) — đã gặp lỗi biểu đồ trống vì `id="chart"`.
  - **Chưa có / còn mô phỏng:** Messenger phía Bán dùng chung `messenger.html` (góc nhìn người mua); tự hủy đơn quá hạn, phụ thu chờ khách đồng ý, việc nhiều người (Q4–Q6) chỉ là hiển thị mẫu; chưa nối API thật.
- **Bản 9 (21/10):**
  - **Bài đăng** (`seller-posts.html`): bài hiện dạng **thẻ** giống "Tình trạng bán" ở Hôm nay (lưới 4 cột, nhóm theo mảng): nhãn trạng thái · lượt xem/QUẢNG BÁ · tên · giá sửa tại chỗ · ± số lượng · công tắc · nút Xu · bút sửa · menu (nhân bản, xem như khách, xóa 2 bước).
  - **`seller-messenger.html`** (mới) — hộp thư của người bán, tách khỏi `messenger.html` phía Mua. Lưu `localStorage["antgo_seller_chats"]`; tab Tất cả / Khách đặt / Người nhận việc; khung phải hiện đơn/việc đang nói tới (lấy từ `AntSeller`) + **mẫu trả lời nhanh** theo bước. Mở bằng `?to=Tên&order=id` hoặc `&job=id`. Menu Messenger phía Bán và mọi nút "Nhắn" ở trang Bán đều trỏ về đây.
  - **`seller-shop.html`** (mới) — gian hàng của tôi ở **chế độ người bán** (khác "Xem như khách" → `shop.html`): đổi ảnh bìa/ảnh đại diện, sửa tên · loại · khu · giới thiệu (`AntSeller.setShop`, lưu `S.shop`), số liệu (2 số chỉ bạn thấy: lượt xem gian hàng, người theo dõi), danh sách hoàn thiện hồ sơ, tab Đang bán / Việc đăng / Đánh giá (`?tab=`), phản hồi đánh giá. **Bấm vào bất kỳ chỗ nào trong ô hồ sơ ở Hôm nay** (trừ các nút) → mở trang này.
  - **Đăng bài** (`seller-post-form.html`) viết lại theo đúng tham số từng loại bên Mua (`detail.html`, `job.html`): **Đồ ăn** (món theo phần / đồ uống theo ly → nhóm chọn size, độ ngọt, đá, topping; giờ nhận đặt, ngày bán, thời gian chuẩn bị, khung nhận, giao/tự lấy, số phần mỗi ngày); **Đồ dùng** (tình trạng mới/như mới/đã dùng + % còn, đã dùng bao lâu, bảo hành, đi kèm, giá + số lượng, hẹn giờ qua lấy, cho xem thử, giao tận cửa); **Dịch vụ** (chọn loại Giặt sấy / Sửa chữa / Dọn dẹp / Giao nhận hộ / Nấu ăn / Khác → điền sẵn 3 ô nổi bật, giá 4 kiểu, giá ước tính, khối lượng khách nhập, lịch *khách chọn giờ* hoặc *chọn ngày + số giờ*, 4 kiểu địa điểm, tùy chọn cộng giá, câu hỏi riêng, các bước); **Việc cần người** (tiền công, tính theo, số người, tiền mặt/chuyển khoản, ứng tiền trước, ngày hoặc lặp hằng tuần, khung giờ khác chấp nhận, hạn nhận đề nghị, tại một nơi / A→B, địa chỉ chính xác chỉ gửi khi chọn người). Cột phải xem trước thẻ + **đầu trang bài** (3–4 ô thông tin, nút đặt, các bước) như khách thấy. Dữ liệu form lưu trong `post.form` để sửa lại đúng. Bản cũ: scratchpad `backup/seller-post-form-v1.html` (không nằm trong repo).
  - **Lịch** (`seller-calendar.html`): tuần full chiều ngang, cài đặt giờ nhận đơn/ngày nghỉ chuyển xuống dưới; thẻ mốc **giống hệt thẻ nhỏ ở Lịch hôm nay** (ảnh · tên · giờ · địa chỉ · SĐT); xếp chồng theo khoảng chồng lấn thật (không chỉ cùng giờ).
  - Còn mô phỏng: tin nhắn không gửi thật giữa hai phía Mua/Bán (mỗi phía lưu riêng); bài đăng mới chỉ lưu localStorage, chưa hiện bên trang Mua.
- **Bản 10 (21/10):**
  - Hiệu quả (Hôm nay + `seller-insights.html`): 2 ô tiền đổi tên **"Tổng tiền đã bán" / "Tổng tiền đã thuê"**, **nền cam**, to hơn 4 ô còn lại (Hôm nay: hàng 2 ô cao hơn hàng ô nhỏ; trang Hiệu quả: hàng 1 hai ô tiền, hàng 2 bốn ô). Nhãn dưới mỗi ô chỉ là **% tăng trưởng** (thêm `payUp`, `payNUp`, `brUp`, `doneUp` dạng %), riêng ô Đánh giá ghi số đánh giá. Trang Hiệu quả **chỉ xem**: bỏ ô phản hồi đánh giá (phản hồi vẫn làm ở Hôm nay / Gian hàng của tôi / chi tiết đơn).
  - Đồ dùng & việc cần người: **số lượng mặc định 1**, người bán tự tăng (max 20 cho đồ dùng mới, việc không xuống dưới 1 người).
  - Hồ sơ ở Hôm nay: bỏ chữ "Gian hàng của tôi →" (bấm vào ô hồ sơ vẫn mở `seller-shop.html`).
  - Lịch: bỏ ô Giờ nhận đơn, Ngày nghỉ, Tuần này và dòng mô tả; 2 chỉ số tuần (đơn & lịch hẹn, việc đã thuê) lên đầu; nhãn tuần `dd/mm/yyyy – dd/mm/yyyy` (bấm nhãn khi đang xem tuần khác → về tuần này); chữ thẻ nhỏ giảm còn 11.5/10px, ảnh 24px để vừa cột ngày. Dải giờ nhận đơn / ngày nghỉ vẫn vẽ theo dữ liệu `S.hours`, `S.offs` nhưng **hiện chưa có chỗ chỉnh** — nếu cần nên đưa vào Gian hàng của tôi.
  - Messenger phía Bán: vừa một màn hình (ẩn footer, bỏ tiêu đề trang; chỉ danh sách và nội dung hội thoại cuộn), ô trả lời luôn hiện ở đáy (Enter gửi, Shift+Enter xuống dòng, tự cao theo nội dung), trả lời nhanh một hàng cuộn ngang.
- **Bản 11 (23/10):**
  - 4 danh mục chuẩn ở mọi chỗ chia mảng phía Bán: **Đồ ăn & uống · Đồ dùng · Dịch vụ · Việc làm** (`KIND`, `LANE.title` trong `seller-data.js` và `seller.html`; nhãn thẻ, nút lọc, chú thích Lịch, chip chi tiết việc, nhãn xem trước trong form). 4 nút *đăng* vẫn giữ tên hành động ("Đăng việc cần người"…).
  - Hồ sơ ở Hôm nay: bỏ loại gian hàng; dòng 1 = icon ghim + địa chỉ (giống `shop.html`); dòng 2 = `4,3 ★ (3)` · `86 đơn`.
  - Banner Xu: "Dùng AntXu để quảng bá bài và giúp gian hàng bạn tiếp cận nhiều cư dân hơn."
  - Tiêu đề mục Hôm nay (Cần bạn xử lý, Lịch hôm nay, Hiệu quả, Tình trạng bán) dùng kiểu `.sh h2` của `home-v5.html` (22px, đậm, màu chữ chính, không icon, không viết hoa).
  - Hiệu quả ở Hôm nay: 2 ô tiền **về lại xanh đen**, số 21px để số hàng triệu không tràn (thử với mốc Năm nay 4.120.000đ).
  - Tình trạng bán (Hôm nay) và Bài đăng: **mỗi danh mục một hàng riêng**, lưới 4 thẻ/hàng dù ít bài; tiêu đề danh mục không icon.
- **Bản 12 (23/10) — Cần bạn xử lý:**
  - Thẻ mới `.tcard` (gọn): nhãn mảng + hạn → ảnh nhỏ 52px (ảnh món / ảnh người / nhóm người đề nghị) · tên · mã đơn + giá · trạng thái → người (tên · SĐT) · nơi (Giao tới… / Tự đến lấy / Tại nhà… · giờ) · ghi chú khách → nút. Người/nơi/ghi chú lấy từ `AntSeller.orders` và `AntSeller.jobs`.
  - Nút theo giai đoạn: **Xác nhận đơn** (đồ ăn & uống, đồ dùng) · **Xác nhận lịch** (dịch vụ) · **Xác nhận hủy** (khách xin hủy) · **Xác nhận người làm** (việc làm có đề nghị → mở hộp chọn người) · **Xác nhận hoàn thành** (việc đã báo xong) · **Phản hồi** (hỏi đáp, đánh giá).
  - Trước khi xác nhận đơn / lịch / hủy / hoàn thành có **hộp hỏi lại** "Bạn chắc chắn …?" hiện quy trình, bước hiện tại (cam) và bước sắp chuyển (xanh đen) + tóm tắt đơn. Quy trình (`FLOW` trong `seller.html`): giao tận nơi Đã đặt → Chờ xác nhận → Đang giao → Hoàn thành; tự lấy … → Chờ khách lấy → …; dịch vụ tại nhà … → Đang thực hiện → …; việc làm Đã yêu cầu → Chờ xác nhận → Đang thực hiện → Đã báo xong → Hoàn thành.
  - **Lệch cần chốt:** thanh bước ở chi tiết đơn (`seller-orders.html`, `STEPS` trong `seller-data.js`) và phía Mua vẫn có thêm "Đã xác nhận", "Đang chuẩn bị"; việc làm phía Mua dùng "Đã gửi đề nghị → Được chọn → Đang làm…".
  - Hồ sơ: `★ 4,3 (3)` dùng icon sao cùng cỡ 16px với icon ghim và icon đơn; bỏ số ở tiêu đề "Lịch hôm nay" và số bài ở từng danh mục Tình trạng bán.
- **Sửa lỗi (23/10):** nút "Đặt lại dữ liệu mẫu" ở `seller.html` gọi biến `KEY` không còn tồn tại → lỗi, không xóa được. Nay xóa mọi khóa `antgo_seller_*` (dữ liệu bán + tin nhắn) rồi tải lại. `tools/shot.sh` thêm `--user-data-dir=%TEMP%/antgo-shot/profile`: Edge headless trước đây dùng chung hồ sơ Edge thật nên các lần bấm thử khi chụp đã ghi trạng thái "đã xử lý" vào localStorage của người dùng.
- **Bản 13 (23/10) — thẻ Cần bạn xử lý:** bỏ số đếm cạnh tiêu đề. Phần trên cao cố định 76px: mã đơn → tên bài (tối đa 2 dòng) → số tiền; phần dưới (sau nét đứt) cao cố định 88px, chữ 11.5px: trạng thái cam → tên (SĐT) → địa chỉ · giờ → ghi chú; hàng nhãn cao 26px để mọi thẻ thẳng hàng. Nút chỉ còn **"Xác nhận"** (đơn, lịch, chọn người, hoàn thành) và riêng **"Xác nhận hủy"**; hộp hỏi lại ghi rõ bước: "Xác nhận chuyển sang “Đang giao”?".

## Khu Bán & Đăng việc trên Angular — Đợt 1 (25/10)
Chuyển dần `design/mockups/seller*.html` vào `client/src/app/features/seller` (NgModule, cùng khung header/footer/toast của phía Mua).
- **Dữ liệu:** `core/models/seller.ts` (kiểu dữ liệu + nhãn bước, quy trình hộp xác nhận, nhãn từng mảng) · `core/services/seller-space.ts` (`SellerSpaceService`: nạp `public/datasets/seller-space.json` qua `MockDb`, lưu thao tác trong `antgo_mock_seller-space`; đơn, việc + đề nghị, hỏi đáp, đánh giá, lịch, giờ nhận đơn, tạm nghỉ; khối "Cần bạn xử lý" tự suy ra từ dữ liệu thay vì danh sách cứng). Dữ liệu sinh từ `seller-data.js` (Bếp Cô Lan). AntXu dùng chung `XuService` (quảng bá trừ Xu qua `spend`, hiện trong lịch sử Xu).
- **Header:** ở `/seller` menu đổi thành Hôm nay · Giao dịch · Lịch · Bài đăng · Hiệu quả · Messenger (`header.ts` → `sellLinks`), logo về `/seller`. Phía Mua không đổi.
- **Trang Hôm nay** (`/seller`, `seller-today`): hồ sơ (bấm → `/seller/shop`, "Xem như khách" → `/shop/<id của tôi>`), tạm nghỉ, 4 nút đăng, banner Xu, Cần bạn xử lý (lọc mảng, 4 thẻ + Xem thêm, Xác nhận → hộp hỏi lại có quy trình, Xác nhận người làm → hộp chọn người, Xác nhận hủy, Phản hồi tại chỗ có chặn SĐT), Lịch hôm nay, Hiệu quả theo mốc, Tình trạng bán (mỗi mảng một hàng, ±, bật/tắt, Xu).
- **Component dùng chung** (`features/seller/components`): `task-card`, `day-agenda`, `post-card`, `confirm-dialog`, `pick-dialog`; kiểu chung `features/seller/seller-ui.css`.
- **Icon** thêm vào `index.html`: phone, store, sun, calendar, chart, eye, plus, pause, pencil, fork, package, wrench, question, user, trend, megaphone, copy, out.
- **Route:** `/seller/orders` (tạm dùng `Transactions` cũ), `/seller/posts`, `/seller/posts/new|:id/edit` (tạm dùng `PostManage`/`PostForm` cũ); `orders/:id`, `jobs/:id`, `calendar`, `insights`, `messenger`, `shop` là trang giữ chỗ `SellerSoon`. `/seller/transactions` chuyển về `/seller/orders`. Đã bỏ `seller-dashboard` (thay bằng Hôm nay). Giữ nguyên xác minh danh tính + guard.
- **Kiểm tra:** `ng build` sạch, `ng test` 46/46; chụp `ng serve` (mock, đã xác minh) — Hôm nay, hộp xác nhận, hộp chọn người, xác nhận đơn + chọn người cập nhật lịch.
- **Tiếp:** Đợt 2 Giao dịch + chi tiết đơn/việc → Đợt 3 Bài đăng + Lịch → Đợt 4 Hiệu quả + Messenger + Gian hàng → Đợt 5 form đăng bài (5 form).

## Khu Bán trên Angular — Đợt 2–5 (25/10): đã chuyển hết các màn
- **Route `/seller/**`:** `''` Hôm nay · `orders` Giao dịch · `orders/:id` chi tiết đơn · `jobs/:id` chi tiết việc · `calendar` Lịch tuần · `posts` Bài đăng · `posts/new?type=food|drink|goods|service|job` · `posts/:id/edit` · `insights` Hiệu quả · `messenger` Messenger người bán · `shop` Gian hàng của tôi · `verify` (của nhóm). Đã bỏ khung tạm cũ `seller-dashboard`, `post-manage`, `post-form`, `transactions` và trang giữ chỗ.
- **Giao dịch** (`seller-orders`, `seller-order-detail`, `seller-job-detail`, thanh bước `components/steps`): nhóm Cần bạn xử lý / Đang diễn ra / Lịch sử; chi tiết đơn có hộp hỏi lại khi Xác nhận / Xác nhận hủy, từ chối kèm lý do, báo phụ thu, phản hồi đánh giá, Nhắn / Gọi; chi tiết việc: chọn / từ chối người đề nghị, xác nhận hoàn thành (ảnh báo xong), đánh giá người làm, hỏi đáp công khai chặn SĐT, đóng / mở lại, ghim 20 Xu.
- **Bài đăng** (`seller-posts`): thẻ `post-card` chế độ `manage` (sửa giá tại chỗ, ± số lượng, bật/tắt, Xu, sửa, nhân bản, xem như khách, xóa 2 bước); lọc mảng / trạng thái / tìm không dấu; `?status=promo`.
- **Lịch** (`seller-calendar`): tuần dd/mm/yyyy, 2 chỉ số tuần, thẻ nhỏ xếp chồng theo khoảng chồng lấn.
- **Hiệu quả** (`seller-insights`): chỉ xem — 2 ô tiền cam + 4 ô, biểu đồ cột SVG (rê chuột / dạng bảng), thu theo mảng, hành trình khách, bài bán chạy, việc đã thuê, đánh giá.
- **Messenger** (`seller-messenger`): hội thoại nằm trong dữ liệu Bán (`chats`), `?to=&order=|job=`, trả lời nhanh, vừa một màn hình (`body.no-footer` như Messenger phía Mua).
- **Gian hàng của tôi** (`seller-shop`): đổi ảnh bìa / đại diện, sửa hồ sơ, số liệu riêng, hồ sơ hoàn thiện, **giờ nhận đơn + ngày nghỉ** (chuyển từ trang Lịch sang đây), tab bài / việc / đánh giá có phản hồi.
- **Đăng bài** (`seller-post-form` + `post-form-config.ts`): Reactive Forms, 5 form — Đồ ăn (khẩu phần, nhãn, tùy chọn cộng giá, lịch bán hằng ngày / đặt trước / theo đợt, giao / tự lấy, cam kết) · Đồ uống (bảng size, nóng/lạnh, độ ngọt, đá, topping) · Đồ dùng (4 mức tình trạng, lỗi bắt buộc mô tả, giá mua mới, số lượng mặc định 1, hẹn qua lấy, đổi trả) · Dịch vụ (khung chung + 9 loại điền sẵn: gói & giá nhiều kiểu, phí kiểm tra, số lượng ước tính, câu hỏi riêng, tùy chọn, 4 kiểu lịch, 4 kiểu nơi làm, bảo hành, hủy) · Việc làm (danh sách việc + tiêu chí đạt, một lần / linh hoạt / hằng tuần, khung giờ khác, hạn đề nghị, một nơi / A→B / từ xa, yêu cầu, tiền công 3 kiểu, ứng trước, câu hỏi cho người đề nghị). Xem trước thẻ + đầu trang bài; lưu nháp; `pendingChangesGuard`; bài mới cũng gửi bản rút gọn sang kho bài phía Mua (`SellerService.savePost`). Chưa làm (chờ nhóm chốt): trả giá đồ dùng, người làm đề xuất tiền công khác.
- **Dữ liệu** `datasets/seller-space.json` có `version` (hiện `2026-10-25-b`): đổi cấu trúc thì tăng số này ở cả JSON lẫn `SellerSpaceService.VERSION`, bản cũ trong trình duyệt tự nạp lại.
- **Kiểm tra:** `ng build` (development) sạch, `ng test` 46/46, chụp từng màn trên `ng serve` mock + bấm thử đăng việc mới. `ng build` production đang **lỗi sẵn** do `orders/order-detail.css` (phía Mua) vượt budget 16 kB — không do khu Bán; CSS khu Bán chỉ cảnh báo vượt 4 kB.
- **25/10 — thẻ "Cần bạn xử lý" (trang Hôm nay, `components/task-card`):** dùng cùng thông tin với dòng "Cần bạn xử lý" ở Đơn hàng phía Mua (`features/orders/order-list`), chỉ khác dạng thẻ vuông: đầu = ảnh + tên người kia · trạng thái chữ cam; nhãn viền loại ("Đơn khách đặt" / "Việc bạn đăng" / "Hỏi đáp" / "Đánh giá") + hạn; thân = ảnh 64px (việc làm: ô be có icon) · tên bài · ngày giờ dd/mm/yyyy · HH:mm · "Mã đơn …"; dòng "Tổng tiền" / "Tiền công" số cam; chân = "Nhắn tin" + nút chính cam (giữ nút ✕ từ chối cho đơn chờ xác nhận). Trường mới trong `SellerTask`: `person`, `personAvatar`, `kindTag`, `when`, `amountLabel`.
  - Sửa tiếp (25/10): bỏ nhãn loại ("Đơn khách đặt"…); hạn xử lý ("Còn 12 phút") thành viên nhỏ một hàng riêng ngay dưới trạng thái ở góc phải đầu thẻ. Nút: đơn chờ = **Từ chối + Xác nhận** · khách xin hủy = **Nhắn tin + Xác nhận hủy** · việc làm (chọn người / đã báo xong) = **Xác nhận** · hỏi đáp / đánh giá = **Phản hồi**. Thẻ chọn người dùng trạng thái "Chờ xác nhận".
- **25/10 — trạng thái trên thẻ bài** (Tình trạng bán, Bài đăng, Gian hàng của tôi — chung `SellerSpaceService.postState`): chỉ 3 loại **Đang hoạt động** (xanh) · **Sắp hết** (vàng, chỉ đồ ăn & uống còn ≤ 3 phần) · **Tạm ngưng** (xám: đã tắt, hết số lượng, việc đã đóng). Việc đã chọn được người vẫn "Đang hoạt động" nhưng khóa ± / bật tắt. Bộ lọc ở Bài đăng đổi tên theo 3 loại này.
- **25/10 — ô số lượng & công tắc trên thẻ bài** (`components/post-card`, dùng ở Tình trạng bán và Bài đăng): ô ghi chung **"Còn n"** (không đơn vị), rộng cố định 116px, luôn có − / + (bị khóa thì mờ đi, không ẩn); công tắc ghi chung **"Đang mở"** cho mọi loại bài. Bấm − / + xử lý ngay trong thẻ và hiện thông báo **"Bạn vừa điều chỉnh còn 12 phần · Hoàn tác"** (đơn vị lấy từ `SELLER_LANE[kind].unit`: phần / cái / buổi / người). `ToastService.show(text, ms, action?)` nay nhận thêm nút tùy chọn (`{ label, run }`, hiện 5 giây) — các chỗ gọi cũ không đổi.
