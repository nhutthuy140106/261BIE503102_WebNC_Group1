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
