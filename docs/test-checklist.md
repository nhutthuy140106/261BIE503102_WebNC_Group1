# Danh sách kiểm thử AntGo (bản mẫu, chạy bằng dữ liệu mẫu)

> 04/11/2026. Dùng để tự bấm thử toàn bộ web. Đánh dấu `[x]` khi đúng; chỗ nào sai thì ghi **bài nào · bên nào · thấy gì · đáng lẽ thấy gì** (kèm ảnh chụp) rồi gửi cho người sửa.
> Mỗi mục có **Làm gì** → **Phải thấy**. Chỗ ghi 🔸 là phần **đã biết chưa làm**, không cần báo lỗi.

## 0. Chuẩn bị

- [ ] Chạy client đúng cổng **4200** (`cd client && npm start`). Đăng nhập Google chỉ chạy ở cổng này.
- [ ] Mặc định dùng dữ liệu mẫu (không cần server). Muốn đổi: thêm `?mock=0` (API thật) hoặc `?mock=1` (mẫu) vào địa chỉ.
- [ ] Muốn sạch dữ liệu: DevTools → Application → Local Storage → xóa các khóa `antgo_*` rồi F5. Hoặc dùng nút "Đặt lại dữ liệu mẫu" (trang Bài đăng phía Bán).
- [ ] Dùng **cửa sổ ẩn danh** khi nghi dữ liệu cũ che thay đổi.
- [ ] Mỗi bài chỉ **1–2 ảnh nhỏ**: ảnh lưu trong localStorage (~5MB), đầy thì mất bài mà không báo lỗi.
- [ ] Mở hai tab: tab A = phía Bán (`/seller`), tab B = phía Mua (`/`). Sau mỗi thay đổi bên Bán, F5 tab B.

## 1. Tài khoản

| Làm gì | Phải thấy |
|---|---|
| `/auth/register`: nhập thiếu / sai SĐT (không đủ 10 số) | Báo lỗi đúng ô, không cho gửi |
| Đăng ký đủ thông tin | Vào app, header hiện ảnh/tên |
| Đăng xuất (trang Tôi) rồi `/auth/login` | Vào lại được; sai mật khẩu → báo lỗi |
| `/auth/forgot` | Form quên mật khẩu hiện, gửi được (mô phỏng) |
| Nút **Google** ở trang đăng nhập | Lần đầu: hỏi SĐT rồi vào app; lần sau vào thẳng. Chỉ tài khoản trong danh sách Test users. 🔸 chưa kiểm chứng đến cùng |
| Chưa đăng nhập, bấm Đặt hàng / Nhắn tin / Theo dõi | Hiện hộp yêu cầu đăng nhập, không lỗi trắng trang |

## 2. Phía Mua — khám phá

**Trang chủ `/`**
- [ ] Header một hàng: logo, Trang chủ, Đơn hàng, Messenger, công tắc Mua|Bán, khu vực, Xu, tim Đã lưu, chuông, ảnh đại diện.
- [ ] Cuộn qua ô tìm kiếm lớn → ô tìm gọn trượt lên header.
- [ ] Các khối: Nổi bật (nhãn QUẢNG BÁ) · Gần bạn · Việc mới quanh bạn · Kiếm thêm gần nhà · Khám phá.
- [ ] **Khám phá**: lọc Tất cả / Đồ ăn / Đồ dùng / Dịch vụ / Việc làm; sắp xếp (Gần nhất, Mới nhất, Giá ↑↓); cuộn tự tải thêm, rồi nút "Xem thêm"; hiện **mọi bài của khu đang chọn**, kể cả bài đã có ở các khối trên.
- [ ] Bài vừa đăng ở phía Bán xuất hiện ở trang chủ (sau F5).
- [ ] **Đổi khu vực** trên header → trang chủ, tìm kiếm và "Xem tất cả" chỉ còn bài bán ở khu đó; bài người bán chọn nhiều khu hiện ở từng khu đã chọn; khu chưa có bài thì trống.
- [ ] Bài **tạm ngưng / đã xóa** phía Bán không còn ở danh sách.

**Tìm kiếm `/search`**
- [ ] Gõ từ khóa ở ô header → kết quả; tab Đồ ăn/Đồ dùng/Dịch vụ/Việc làm có số đếm.
- [ ] Lọc danh mục, "Dùng được Xu", khoảng giá "Từ – Đến".
- [ ] Từ khóa không có kết quả → ô "Chưa có bài phù hợp…" + gợi ý, không trang trắng.
- [ ] Nút **giọng nói** (Chrome/Edge) điền được ô tìm; nút **ảnh** chọn/kéo thả hiện chip "Tìm theo ảnh" 🔸 (mô phỏng).
- [ ] "Xem tất cả" ở từng khối (`/search/section/:key`) mở đúng danh sách.

**Ngăn kéo Đã lưu & AntXu**
- [ ] Bấm ♡ trên thẻ → tim bay lên header, số đếm tăng; bấm lại → bỏ lưu.
- [ ] Bấm ♡ header → ngăn kéo Đã lưu, lọc Tất cả / Đồ ăn & uống / Đồ dùng / Dịch vụ / Việc làm; bài tạm ngưng ghi "Tạm ngưng nhận".
- [ ] Bấm "… Xu" → ngăn kéo Xu: đổi voucher, voucher của bạn, cách nhận Xu.

## 3. Phía Mua — chi tiết bài và đặt hàng

Làm với **mỗi loại** (đồ ăn, đồ uống, đồ dùng, dịch vụ). Dùng cả bài mẫu có sẵn lẫn bài bạn tự đăng ở mục 6.

**Bố cục chung**
- [ ] **Bộ ảnh**: 1 ảnh · 2 ảnh cạnh nhau · 3–4 ảnh · 5+ ảnh. Ảnh dọc (lon nước) không bị cắt, không tràn cao. Bấm ảnh → xem lớn (← → , Esc).
- [ ] Tên người bán / ảnh → mở gian hàng; nút **Nhắn tin** mở Messenger đúng người.
- [ ] **Ba ô thông tin** (tối đa 3, một dòng, ô trống thì ẩn):
  - Đồ ăn & uống: Giờ nhận đặt · Cách nhận · Thời gian chuẩn bị.
  - Đồ dùng: Ngày đăng · Cách nhận · Tình trạng.
  - Dịch vụ: Thời gian hoàn thành · Nơi làm · Bảo hành (báo giá sau mà chưa ghi bảo hành → Phí kiểm tra).
- [ ] Mô tả, đánh giá (bài mới: "Chưa có đánh giá"), Xem tất cả đánh giá (lọc sao, Có ảnh).
- [ ] "Bài khác của …" và "Tương tự trong khu" đúng người bán / đúng loại.
- [ ] ♡ lưu, Chia sẻ hoạt động.

**Khung đặt (bước 1)**
- [ ] **Bài nhiều món**: nhóm "Món"/"Dịch vụ" tick từng dòng + số lượng từng dòng; giá ghi **đầy đủ** từng dòng; giá đầu trang "từ …".
- [ ] **Tùy chọn**: chọn 1 (bấm lại nhóm không bắt buộc thì bỏ chọn) và **chọn nhiều** (ô tick). Bài **một món** có Size → Size là *chọn 1*, **không** thành danh sách tick có số lượng.
- [ ] **Câu hỏi riêng** đủ 4 loại: chữ, chọn 1, chọn nhiều, ảnh; câu bắt buộc thiếu → báo "Hãy điền …" khi bấm Tiếp tục.
- [ ] Câu **"Cần trả tiền giùm?"** chọn Có → hiện ô nhập số tiền.
- [ ] Số lượng +/− không vượt tồn kho ("Còn n phần hôm nay").
- [ ] Nút **Tiếp tục · giá** cập nhật đúng theo lựa chọn (xem mục tính tiền bên dưới).

**Hộp Xác nhận đơn hàng (bước 2)**
- [ ] Địa chỉ nhận → mở sổ địa chỉ: chọn, **Thêm mới** (họ tên, SĐT 10 số, Block A–D, căn/tầng), Sửa, đặt mặc định. Đặt hộ người khác = chọn địa chỉ người đó.
- [ ] **Cách nhận** theo bài: chỉ giao / chỉ tự lấy / cả hai; phí giao đúng số người bán đặt. Giao miễn phí vẫn đòi địa chỉ.
- [ ] Nhận lúc / Ngày & giờ: giờ chọn được nằm trong khung người bán đặt; dịch vụ chưa chọn giờ thì chặn đặt.
- [ ] Gạt "Lấy dụng cụ ăn uống" (đồ ăn); ghi chú; **Voucher AntXu** áp được và trừ đúng.
- [ ] Thanh toán **Tiền mặt / Chuyển khoản**.
- [ ] **Tổng cộng** = (giá món × số lượng + tùy chọn × số lượng + phí giao) − Giờ vàng − voucher. Tự tính lại bằng tay ít nhất 1 đơn nhiều món có Topping.
- [ ] Bấm **Đặt đơn** → màn "Đã gửi đơn!" → mở được đơn trong Đơn hàng.

**Trạng thái đặc biệt của bài**
- [ ] **Ngày bán** (đồ ăn/uống): lịch không có hôm nay → "Hôm nay quán nghỉ · Mở bán lại ngày …", nút đặt khóa, Giờ vàng ẩn.
- [ ] **Khung giờ nhận đơn**: đặt khung không gồm giờ hiện tại → "Đã hết giờ nhận đơn · Mở lại …".
- [ ] **Tạm ngưng** → "Tạm ngưng nhận". **Hết hàng / đã bán một lần** → không đặt được.
- [ ] **Giờ vàng** (bài có khuyến mãi theo giờ): hiện giá mới + giá gốc gạch + đếm ngược; chỉ giảm giá chính, không giảm tùy chọn; hết giờ thì tự mất.
- [ ] **Combo**: mở bài combo → khối "Trong combo này" liệt kê từng món + số lượng + giá lẻ + "Tiết kiệm"; món trong combo đã ngừng bán → ghi rõ và không đặt được; giá combo = giá hiện ở đầu trang. Đặt combo → đơn ghi "Gồm: …".
- [ ] **Dịch vụ**: lịch chọn ngày chỉ bấm được các ngày người bán chọn; giá theo giờ × số giờ; báo giá sau có "Phí kiểm tra" và bước **Duyệt giá** trong đơn; giặt sấy hiện "giá ước tính".
- [ ] **Ngày hẹn:** lịch khi đặt chỉ mở các ngày người bán đã đặt (mọi loại bài), ngày ngoài khoảng bị khóa; đã qua hết ngày thì bài ghi "Đã hết lịch hẹn".
- [ ] **Ghi chú:** form đồ ăn, đồ uống, đồ dùng, dịch vụ đều có ô cho khách ghi chú, mặc định bật; tắt thì khung đặt không còn ô Ghi chú.
- 🔸 Dịch vụ **lưu trú** (theo đêm) vẫn theo mẫu cũ. 🔸 Tùy chọn riêng từng món hiện áp **chung cả đơn**. 🔸 `payMethods`, `dailyQty` từng món chưa dùng.

## 4. Phía Mua — việc làm

**Chi tiết việc `/posts/job/:slug`**
- [ ] Tiền công to, 4 ô (Thời gian làm · Địa điểm · Số người cần · Trả công). Địa chỉ chính xác **chỉ hiện sau khi được chọn**.
- [ ] Trạng thái "Đang mở · n đề nghị" / "Đã có người nhận".
- [ ] **Hỏi đáp công khai**: gửi câu hỏi; **có số điện thoại (≥ 9 chữ số) bị chặn**; câu mới ghi "Chờ … trả lời".
- [ ] Thẻ người đăng: Nhắn tin, 3 chỉ số, Xem gian hàng.
- [ ] **Đề nghị nhận việc**: chọn khung giờ + giới thiệu ngắn (bắt buộc) → hộp xác nhận → "Đã gửi đề nghị". Ghi rõ gửi đề nghị ≠ đã nhận việc.
- 🔸 Đề nghị mới gửi **chưa hiện sang** danh sách chọn người ở phía Bán (kho chưa gộp). 🔸 Chưa có đề nghị kèm giá.

## 5. Phía Mua — đơn hàng, tin nhắn, hồ sơ

**Đơn hàng `/orders`**
- [ ] Tab Tất cả · Đơn đã đặt · Việc đã nhận · Lịch sử; khối "Cần bạn xử lý" ở đầu; số đếm chỉ tính đơn đang chạy.
- [ ] Đơn vừa đặt xuất hiện; mở chi tiết thấy thanh bước đúng loại (đồ ăn / đồ dùng / dịch vụ có Duyệt giá), nội dung đã đặt (món, tùy chọn, địa chỉ, giờ, voucher, thanh toán).
- [ ] **Đơn đã đặt**: hủy / yêu cầu hủy; duyệt giá (ước tính, báo giá, phụ thu); đổi lịch; xác nhận đã nhận; báo vấn đề / trả hàng (đồ ăn 2 giờ, đồ dùng & dịch vụ 24 giờ); đánh giá (sao bắt buộc).
- [ ] **Việc đã nhận**: sửa giới thiệu, rút đề nghị, bắt đầu, báo hoàn thành (ghi chú bắt buộc, ≤ 4 ảnh), xin hủy (bắt chọn lý do), xác nhận nhận tiền, đánh giá.
- [ ] **Xu**: +10 khi xong đơn ≥ 30.000đ, +5 đánh giá có chữ, +15 xong việc, trả voucher khi hủy, thu lại Xu khi hoàn tiền hết (xem Lịch sử Xu ở trang Tôi).
- [ ] Nút "Mô phỏng phía người bán" đẩy đơn sang bước tiếp. "Báo cáo vấn đề" (`/orders/:id/report`) lưu được.
- 🔸 Quy tắc hủy/trả/hoàn chưa chốt chính sách thật.

**Messenger `/messenger`**: danh sách hội thoại, gửi tin hai phía, thẻ đơn/bài đính kèm, `?to=<tên>` mở/tạo cuộc trò chuyện.
**Thông báo `/notifications`**: chấm chuông đếm đúng; bấm thông báo mở đúng đơn; đọc hết thì chấm mất.
**Tôi `/profile`**: hoạt động, khu vực & AntXu, lịch sử Xu, **Địa chỉ của tôi** (thêm/sửa/xóa/mặc định), bài đã lưu, đăng xuất.
**Gian hàng `/shop/:id`**: đầu trang, 3 ô thống kê, giới thiệu, tab Đang bán / Việc đang cần người / Đánh giá, nút Theo dõi (cần đăng nhập) và Nhắn tin.
**Xu `/xu`**, **Hỗ trợ `/help`**, **Pháp lý `/legal`**, **Giới thiệu `/welcome`** mở được, không lỗi.
**Trợ lý (nút chat nổi)**: hỏi món / việc, trả lời có liên kết đúng.

## 6. Phía Bán — đăng bài (chiều Bán → Mua)

Vào `/seller/posts/new?type=food|goods|service|job`. Với **mỗi bài**: đăng → F5 tab Mua → kiểm tra bài hiện đúng như đã nhập.

| # | Đăng gì | Điền | Mở bên Mua phải thấy |
|---|---|---|---|
| 1 | **Đồ uống nhiều loại** | 2 loại nước; mỗi loại có Size; 1 loại có Topping (chọn nhiều); cả giao và tự lấy, phí giao 5.000đ; lịch bán gồm hôm nay; Nhận đặt 06:00–23:55, chuẩn bị 15 phút, giao 06:00–23:00 | Nhóm "Món" tick từng loại; Size chọn 1; Topping ô tick; ba ô: `06:00 – 23:55` · `Giao tận nơi, Tự đến lấy` · `Khoảng 15 phút`; tổng đúng |
| 2 | **Đồ ăn một món** | 1 món có Size, tồn 10 phần | Size là chọn 1 (không phải danh sách tick); "Còn 10 phần hôm nay" |
| 3 | **Đồ ăn nhiều món** | 3 món, giá khác nhau | Giá đầu trang "từ" món rẻ nhất; mỗi món ghi giá đầy đủ |
| 4 | **Đồ ăn dạng combo** | Bật Combo, chọn ≥ 2 món đã đăng, giá combo **thấp hơn** tổng lẻ | Khối "Trong combo này"; "Tiết kiệm" đúng. Giá combo ≥ tổng lẻ → form **báo lỗi, không cho đăng** |
| 5 | **Đồ dùng** | Tình trạng 90%, cả giao và tự lấy | `Hôm nay` · `Giao tận nơi, Tự đến lấy` · `Mới 90%` |
| 6 | **Dịch vụ giặt sấy** | 2 dòng giá (kg, bộ), giá ước tính, chọn ngày nhận lịch | Danh sách dịch vụ có đơn vị; "giá ước tính"; có bước Duyệt giá; lịch khóa ngày khác |
| 7 | **Dịch vụ sửa máy** | Báo giá sau, phí kiểm tra 50.000đ, bảo hành 3 tháng, "thợ đến nhà" 30.000đ | Giá "Báo giá sau"; ô Bảo hành; chọn "Đến nhà bạn" → phí 30.000đ + đòi địa chỉ |
| 8 | **Dịch vụ dọn nhà theo giờ** | Giá/giờ, kiểu "ngày + số giờ" | Chọn ngày + số giờ; giá = đơn giá × số giờ |
| 9 | **Dịch vụ giao nhận hộ** | Nơi làm "Lấy ở A, giao tới B", câu hỏi "Cần trả tiền giùm?" | Ô "Nơi làm" `Lấy ở A, giao tới B`; câu hỏi trả tiền giùm hoạt động |
| 10 | **Việc làm** | Nhiều ngày làm, giờ bắt đầu/kết thúc, số người, đơn vị công | Trang việc hiện đúng ngày giờ; 🔸 số người / đơn vị công có thể chưa vẽ ra |

**Kiểm tra form (mỗi loại)**
- [ ] Thiếu ảnh (trừ việc làm), thiếu ngày, thiếu cách nhận tiền, chuyển khoản thiếu số tài khoản/QR → báo lỗi, không đăng.
- [ ] Ô đỏ cuộn tới đúng chỗ; **Lưu nháp** không hiện bài bên Mua; thoát khi đang sửa dở → hỏi lại.
- [ ] **Giờ vàng**: bật, mức giảm 0 hoặc > 90% (hoặc số tiền ≥ giá bán) → báo lỗi; hợp lệ → bên Mua hiện giá giảm trong khung giờ.
- [ ] **Khung giờ nhận đơn**: bật hộp riêng → ngoài giờ bên Mua khóa. 🔸 Form có **hai chỗ trùng** (Lịch bán "Nhận đặt từ / Đóng đơn lúc" và hộp này), hộp riêng được ưu tiên.
- [ ] 🔸 Cột **xem trước** có thể không giống hệt phía Mua.

## 7. Phía Bán — đồng bộ sau khi đăng (kiểm tra hai chiều)

Làm với bài ở mục 6 (ví dụ bài 1):
- [ ] **Sửa giá nhanh** (bấm giá trên thẻ) → F5 bên Mua: giá đổi.
- [ ] **Sửa bài** (nút bút) đổi tên/mô tả/tùy chọn → bên Mua đổi theo (không tạo bài trùng).
- [ ] **Công tắc "Đang mở"** tắt → bên Mua: "Tạm ngưng nhận"; bật lại → đặt được.
- [ ] **Nhân bản** → bản sao tạm ngưng, **không** hiện bên Mua cho tới khi bật và lưu.
- [ ] **Xóa** → biến khỏi bên Mua.
- [ ] **Hết hàng** (bấm − về 0 hoặc khách đặt hết) → bài tự tắt, bên Mua khóa.
- [ ] **Ngày bán**: sửa lịch chỉ còn ngày mai → bên Mua "Hôm nay quán nghỉ · Mở bán lại ngày …".
- [ ] **Nhắc lịch**: lịch còn ≤ 2 ngày → thẻ bài hiện dòng cam "Lịch bán còn đến …"; lịch đã qua → "Hết lịch bán — bài đang khóa". Bấm dòng đó mở form sửa.
- [ ] Bài mẫu có sẵn (Bếp Cô Lan…) sửa **không** tự đăng thêm bản mới bên Mua.

## 8. Phía Bán — các màn quản lý (`/seller`)

- [ ] **Hôm nay**: khối "Cần bạn xử lý" (đơn mới, việc cần chọn người, hỏi đáp, đánh giá), thẻ Tình trạng bán (±, bật/tắt), "Xem thêm".
- [ ] **Giao dịch** (`/seller/orders`): danh sách cùng kiểu với Đơn hàng phía Mua; chi tiết đơn đổi bước (xác nhận, chuẩn bị, giao, hoàn thành, từ chối có lý do, báo phụ thu, khách xin hủy giữ/đồng ý).
- [ ] **Chi tiết việc** (`/seller/jobs/:id`): đề nghị chờ / đã chọn; chọn người; báo cáo hoàn thành; trả lời hỏi đáp (chặn SĐT); đóng/mở lại việc; ghim bằng Xu.
- [ ] **Lịch**, **Hiệu quả** (số liệu), **Messenger bán**, **Gian hàng của tôi** mở được và số liệu khớp dữ liệu mẫu.
- [ ] **Quảng bá bằng Xu**: nút "Quảng bá · n Xu" trừ đúng Xu; thiếu Xu → báo "Cần n Xu, bạn còn …"; bài có nhãn QUẢNG BÁ.
- [ ] **Xác minh người bán** (`/seller/verify`): gửi form, trạng thái đổi.
- Đơn khách đặt từ bài đăng mới tự hiện trong Giao dịch phía Bán và hai bên đổi bước theo nhau (dữ liệu mẫu). 🔸 Đổi lịch, báo vấn đề, đánh giá chưa nối.

## 9. Trò chơi & vòng quay

- [ ] **Quay món `/quay-mon`**: hero khít một màn hình, bấm quay → thẻ rơi đúng tâm từng ô → **popup món trúng** (ảnh, giá, nhãn); món có nhãn QUẢNG BÁ có cơ hội cao hơn (tối đa 30%); rớt mạng → màn chờ con kiến + nút Thử lại.
- [ ] **Vườn `/vuon`**: Hái xu (`/vuon/hai-xu`), Tưới cây (`/vuon/tuoi-cay`), Thú cưng (`/vuon/thu-cung`) mở được, Xu cộng đúng và đồng bộ với số Xu ở header.

## 10. Quản trị (`/admin`)

- [ ] Vào được bằng tài khoản quản trị; danh sách bài với trạng thái (Đang mở / Hết hàng / Đã đóng / Bị ẩn).
- [ ] Gỡ bài có lý do → bài biến khỏi phía Mua; mở lại → trở về đúng trạng thái cũ.
- [ ] Xem báo cáo vấn đề / hồ sơ xác minh nếu có.

## 11. Kiểm tra chung

- [ ] Mở DevTools → Console: không có lỗi đỏ khi bấm qua các trang trên.
- [ ] Địa chỉ không tồn tại (`/abc`) → trang "Không tìm thấy".
- [ ] Đóng tab giữa chừng khi đang điền form → hỏi lại khi quay về (nhờ guard).
- [ ] Thu nhỏ cửa sổ < 1240px: menu header chỉ còn icon, không vỡ hàng.
- [ ] Tải lại trang (F5) ở trang chi tiết đơn / bài: dữ liệu còn nguyên.

## 12. Những chỗ **chưa làm** (đừng báo là lỗi)

1. Xem trước trong form Bán chưa dùng chung code hiển thị với phía Mua.
2. Đề nghị nhận việc phía Mua chưa sang phía Bán. Đơn đặt đã nối ở dữ liệu mẫu, chưa nối qua server.
3. Tùy chọn cộng giá riêng từng món áp chung cả đơn; chưa có giỏ nhiều dòng.
4. Dịch vụ lưu trú (theo đêm), bảng giá tham khảo của dịch vụ báo giá sau chưa hiện.
5. Việc làm: số người cần, đơn vị công chưa chắc đã vẽ ra.
6. Chưa có server thật cho phía Bán; mọi thứ chạy ở dữ liệu mẫu.
7. Quy tắc hủy / trả hàng / hoàn tiền chưa chốt chính sách; SMS báo người nhận khi đặt hộ chưa có.
8. `ng test` đang lỗi build từ trước (pipe `vnd`), nên chưa có test tự động chạy được.
