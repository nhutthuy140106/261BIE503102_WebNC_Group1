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

