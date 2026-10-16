# ANTGO WEB2 — TÀI LIỆU TỔNG HỢP YÊU CẦU VÀ ĐẶC TẢ XÂY DỰNG

> Phiên bản: 0.1 — tổng hợp từ các buổi thảo luận UX Web2, cập nhật 22/09/2026.  
> Mục đích: làm tài liệu định hướng dựng prototype HTML, thiết kế UI/UX, phân rã chức năng và triển khai Web2.  
> **Quy ước:** **[ĐÃ CHỐT]** = người dùng đã xác nhận trực tiếp; **[ĐỊNH HƯỚNG]** = ý tưởng đã thảo luận nhưng chưa xác nhận toàn bộ chi tiết; **[CHƯA CHỐT]** = cần quyết định khi dựng HTML/phân tích nghiệp vụ. Ví dụ về đơn, tên danh mục và số liệu chỉ là minh họa, không phải dữ liệu thực tế.

## 1. Bối cảnh và mục tiêu

AntGo Web2 được thiết kế lại từ Web1 để khắc phục trải nghiệm rối khi một tài khoản đồng thời tham gia nhiều vai trò. Người dùng mới phải nhanh chóng nhận ra có thể làm gì, không cần qua màn hình bắt chọn một trong bốn vai trò trước khi bắt đầu. Ưu tiên **mobile-first**, điều hướng chính bằng **bottom navigation**, không dùng sidebar làm cách điều hướng chủ đạo trên mobile. Web2 tổ chức hoạt động theo **hai không gian dựa trên hành vi**, không phải bốn giao diện role tách biệt.

Bốn vai trò/ngữ cảnh nghiệp vụ cần phục vụ:

1. Người mua/đặt hàng hoặc đặt dịch vụ của người khác.
2. Người nhận làm việc từ yêu cầu của người khác.
3. Người bán hàng/cung cấp dịch vụ, đăng bài để khách đặt.
4. Người đăng yêu cầu tìm người giúp thực hiện công việc.

**[ĐÃ CHỐT]** Một tài khoản có thể tham gia nhiều vai trò; tin nhắn, thông báo và hồ sơ tài khoản là dữ liệu dùng chung. Phân biệt *bài đăng* (nội dung công khai) với *giao dịch/đơn* (lần tương tác cụ thể phát sinh từ bài).

## 2. Kiến trúc hai không gian và switch

### 2.1. Hai không gian [ĐÃ CHỐT]

| Không gian | Hoạt động | Các vai trò được gom |
|---|---|---|
| **Tìm và chọn** | Lướt, tìm, xem, lựa chọn bài đăng của người khác | Người mua/đặt dịch vụ; người nhận việc |
| **Đăng và quản lý** | Tạo bài của mình; theo dõi và xử lý hoạt động phát sinh từ bài mình đăng | Người bán/cung cấp dịch vụ; người đăng yêu cầu tìm người |

Không hiển thị màn hình “Chọn vai trò” trước khi vào ứng dụng. Hai không gian có **trang chủ và bottom nav riêng**, nhưng thuộc cùng một tài khoản.

### 2.2. Vị trí và hiển thị switch [ĐÃ CHỐT về vị trí, ĐỊNH HƯỚNG về chi tiết giao diện]

- Header có tên **AntGo**; **ô switch nằm ở hàng ngay bên dưới tên AntGo**, không nằm cạnh logo, không nằm trong bottom nav.
- Ô switch luôn ghi **tên không gian hiện tại**: “Tìm và chọn” hoặc “Đăng và quản lý”, kèm dấu gợi ý có thể chuyển.
- Vị trí switch nhất quán ở hai không gian; người dùng biết mình đang ở đâu và tìm được đường quay lại.
- Khi bấm switch, mở bảng chọn hai không gian, mỗi lựa chọn có mô tả ngắn. Phương án đã thảo luận là bottom sheet trượt từ dưới lên; cách trình bày/animation chính xác sẽ thử khi dựng HTML.
- Chọn không gian còn lại: đóng bảng chọn, đổi nội dung chính và bottom nav tương ứng. Chọn lại không gian hiện tại: đóng bảng chọn, không cần tải lại.
- Không hỏi xác nhận ở mỗi lần chuyển; chỉ cảnh báo khi có nguy cơ mất dữ liệu biểu mẫu chưa lưu.
- Khi cuộn trang, switch **có thể** cuộn khỏi vùng nhìn để tiết kiệm diện tích; hành vi sticky/scroll chưa được kiểm chứng trên prototype.

### 2.3. Quy tắc mở ứng dụng [ĐÃ CHỐT]

- **Lần đầu sử dụng:** vào không gian **Tìm và chọn**, tab mặc định **Dịch vụ/Hàng hóa**.
- **Các lần quay lại:** mở lại **không gian dùng gần nhất**. Cần lưu lựa chọn theo tài khoản/thiết bị phù hợp với kiến trúc kỹ thuật.
- **[ĐỊNH HƯỚNG]** Có thể nhớ tab/trang gần nhất bên trong mỗi không gian, nhưng cần thử để không làm người dùng mất phương hướng. Quy tắc lần đầu vẫn ưu tiên Tìm và chọn.
- Tin nhắn và thông báo thống nhất toàn tài khoản. Liên kết từ thông báo/tin nhắn nên mở **đúng giao dịch liên quan**, tự điều hướng đến không gian phù hợp nếu cần, thay vì bắt người dùng switch thủ công.
- **[CHƯA CHỐT]** Hành vi nút Back khi chuyển không gian bằng deep link; thời điểm lưu/khôi phục bản nháp biểu mẫu; cách đồng bộ không gian gần nhất giữa các thiết bị.

## 3. Bottom navigation toàn ứng dụng

### 3.1. Không gian “Tìm và chọn” [ĐÃ CHỐT]

**Trang chủ · Quản lý đơn hàng · Messenger · Tôi**

- **Trang chủ:** tìm và chọn hàng hóa/dịch vụ hoặc công việc do người khác đăng.
- **Quản lý đơn hàng:** xem đơn mình đã đặt và công việc mình đã nhận.
- **Messenger:** các cuộc trò chuyện dùng chung toàn tài khoản.
- **Tôi:** hồ sơ, thông tin cá nhân, ví/cài đặt nếu AntGo có hỗ trợ; dùng chung toàn tài khoản.

Tên rút gọn trên nav có thể là **“Đơn hàng”**, còn tiêu đề trang là **“Quản lý đơn hàng”**. Messenger nằm trong nav dưới, vì vậy **không lặp lại biểu tượng Messenger trên header**. Thông báo có thể nằm trên header.

### 3.2. Không gian “Đăng và quản lý” [ĐỊNH HƯỚNG đã thảo luận, chưa có xác nhận cuối cùng cho toàn bộ nav]

**Tổng quan · Bài đăng · Giao dịch · Messenger · Tôi**

- **Tổng quan:** số liệu hoạt động, sự kiện gần đây và lối tắt xử lý công việc.
- **Bài đăng:** quản lý bài bán hàng/dịch vụ và bài yêu cầu tìm người do mình tạo.
- **Giao dịch:** xử lý đơn khách đặt từ bài của mình và người nhận thực hiện yêu cầu mình đăng.
- **Messenger, Tôi:** dùng chung với không gian Tìm và chọn, nên giữ vị trí nhất quán ở hai nav nếu có thể.

**[CHƯA CHỐT]** Có giữ đủ 5 mục trên màn hình mobile hay điều chỉnh cấu trúc để tránh chật? Trong các trao đổi sau, người dùng đã tiếp tục bàn chi tiết cả Tổng quan, Bài đăng và Giao dịch, nhưng chưa xác nhận riêng bố cục 5 mục trên mobile.

## 4. Không gian “Tìm và chọn” — Trang chủ

### 4.1. Mục tiêu và cấu trúc [ĐÃ CHỐT ở mức ý chính]

Trang chủ phải cho phép lướt nội dung ngay, không cần chọn role. Cấu trúc định hướng từ trên xuống:

1. Header AntGo, biểu tượng Thông báo; bên dưới là switch “Tìm và chọn”.
2. Ô tìm kiếm theo ngữ cảnh.
3. Hai lựa chọn nội dung **“Dịch vụ / Hàng hóa”** và **“Việc cần người”**; mặc định lần đầu ở Dịch vụ/Hàng hóa.
4. Danh mục phù hợp với lựa chọn hiện tại.
5. Danh sách bài đăng tương ứng; có thể có công cụ tìm/lọc phù hợp với từng loại.
6. Bottom nav: Trang chủ, Đơn hàng, Messenger, Tôi.

**[ĐÃ CHỐT]** Khi chọn **Việc cần người**, **bộ danh mục phải đổi cho phù hợp với việc nhận làm**, không dùng nguyên danh mục mua hàng rồi chỉ đổi dữ liệu. Các thành phần tìm kiếm, lọc, nội dung thẻ bài và hành động chính cũng cần đổi theo ngữ cảnh.

### 4.2. Chế độ “Dịch vụ / Hàng hóa”

- Mục đích: người dùng tìm **hàng hóa muốn mua** hoặc **dịch vụ muốn đặt** từ người khác.
- Tìm kiếm: theo tên hàng/dịch vụ, từ khóa liên quan.
- Danh mục: phân loại hàng hóa/dịch vụ mà AntGo thực sự hỗ trợ; ví dụ từng được nêu trong trao đổi: đồ ăn, mua hộ, giao/nhận hàng. **[CHƯA CHỐT]** Danh mục chính thức và phạm vi nghiệp vụ của từng nhóm.
- Danh sách bài: hình ảnh, tên hàng/dịch vụ, giá, thông tin người bán/cung cấp, khu vực hoặc điều kiện phù hợp.
- Bấm bài: xem chi tiết, sau đó thực hiện hành động mua/đặt theo loại bài.
- **[CHƯA CHỐT]** Cơ chế giỏ hàng, thanh toán, vận chuyển, đặt lịch, số lượng, biến thể hàng hóa, phí, hoàn trả, đánh giá và chính sách cho từng loại sản phẩm/dịch vụ.

### 4.3. Chế độ “Việc cần người”

- Mục đích: người dùng tìm **yêu cầu do người khác đăng để nhận thực hiện**.
- Tìm kiếm: “Bạn muốn tìm công việc gì?” hoặc cách diễn đạt tương tự.
- **Danh mục riêng theo loại công việc**. Ví dụ để thảo luận: mua hộ, giao/nhận đồ, việc nhà, sửa chữa, vận chuyển, chăm sóc thú cưng, hỗ trợ khác. **Đây chưa phải danh mục chính thức.**
- Danh sách bài: nội dung công việc, tiền công, địa điểm, thời gian, thông tin người đăng, điều kiện nhận việc.
- Bấm bài: xem chi tiết yêu cầu và thao tác nhận/đề nghị nhận việc tùy cơ chế nghiệp vụ.
- **[CHƯA CHỐT]** Nhận việc ngay hay cần chủ yêu cầu duyệt; một yêu cầu có thể nhận bao nhiêu người; cách xác minh năng lực; đặt cọc, thanh toán và xử lý tranh chấp.

### 4.4. Quy tắc không trộn ngữ cảnh

Hai loại bài có thể dùng tên danh mục gần giống nhau (ví dụ “Mua hộ”) nhưng khác mục đích: **tìm người cung cấp dịch vụ mua hộ** khác với **tìm yêu cầu mua hộ để mình nhận làm**. Danh sách và CTA cần thể hiện rõ người dùng đang **trả tiền để được phục vụ** hay **nhận công việc để thực hiện**.

**[CHƯA CHỐT]** Bộ lọc cụ thể, sắp xếp mặc định, gợi ý gần bạn, quảng bá/banners, số danh mục hiện trên trang và trạng thái khi không có kết quả. Người dùng muốn quyết định sâu hơn trong giai đoạn dựng HTML.

## 5. Không gian “Tìm và chọn” — Quản lý đơn hàng

### 5.1. Danh sách và bộ lọc [ĐÃ CHỐT]

- Mở trang **hiển thị TẤT CẢ** đơn hàng của hai nhóm: **Đơn đã đặt** và **Đơn đã nhận**.
- Có **hai nút lọc bật/tắt**: “Đơn đã đặt” và “Đơn đã nhận”.
- Bấm “Đơn đã đặt” → chỉ xem đơn đã đặt; bấm **lại cùng nút** → trở về tất cả.
- Bấm “Đơn đã nhận” → chỉ xem đơn đã nhận; bấm **lại cùng nút** → trở về tất cả.
- Đang lọc nhóm A mà bấm nhóm B → chuyển thẳng sang B.
- **Không đặt bộ lọc theo trạng thái đơn tại màn hình danh sách** theo phương án người dùng đã chọn.
- Nên gắn nhãn “Đã đặt”/“Đã nhận” trên từng thẻ để khi xem tất cả vẫn phân biệt được loại đơn.
- **Khi bấm vào từng đơn mới mở chi tiết và hiển thị trạng thái đơn cùng các hành động tương ứng.**

### 5.2. Chi tiết “Đơn đã đặt” [ĐÃ CHỐT về sự tách biệt, CHƯA CHỐT quy trình chi tiết]

Đây là đơn người dùng mua hàng/đặt dịch vụ **của người khác**. Chi tiết dự kiến có thông tin đơn, bên cung cấp, nội dung hàng/dịch vụ, thời gian/địa điểm/chi phí phù hợp, trạng thái và thao tác theo điều kiện nghiệp vụ. Các trạng thái từng được nhắc đến: **chờ xác nhận, đang thực hiện, đã hoàn thành**, cùng trường hợp **đã hủy**. Người dùng mong có thao tác như **hủy đơn** hoặc **trả hàng**, nhưng **trả hàng chỉ áp dụng với giao dịch hàng hóa đủ điều kiện**, không hiển thị trên mọi loại dịch vụ. Hủy đơn cũng cần điều kiện theo trạng thái và chính sách.

### 5.3. Chi tiết “Đơn đã nhận” [ĐÃ CHỐT về sự tách biệt, CHƯA CHỐT quy trình chi tiết]

Đây là công việc người dùng **nhận làm từ yêu cầu của người khác**. Chi tiết dự kiến có nội dung việc, chủ yêu cầu, tiền công, thời gian/địa điểm, tiến độ và hành động dành cho người thực hiện (ví dụ xác nhận nhận việc, bắt đầu, cập nhật tiến độ, báo hoàn thành, xin hủy theo điều kiện). **Không dùng nguyên giao diện chi tiết hoặc bộ nút của Đơn đã đặt.**

### 5.4. Phạm vi dữ liệu [ĐÃ CHỐT]

Trang này **không chứa đơn khách đặt từ bài bán hàng/dịch vụ do mình đăng**, cũng **không chứa giao dịch với người nhận yêu cầu do mình đăng**. Hai nhóm đó nằm trong không gian Đăng và quản lý.

## 6. Messenger, Thông báo và Tôi

- **Messenger [ĐÃ CHỐT ở mức định hướng]:** thiết kế theo mô hình quen thuộc của ứng dụng nhắn tin; dùng chung một hộp thư trên toàn tài khoản và truy cập từ nav ở cả hai không gian. Tin nhắn nên có ngữ cảnh đơn/yêu cầu để người dùng biết đang trao đổi với tư cách nào.
- **Thông báo [ĐỊNH HƯỚNG]:** dùng chung toàn tài khoản, truy cập ở header; thông báo về đơn, người nhận việc, tiến độ... cần mở đúng chi tiết liên quan, không bắt switch thủ công.
- **Tôi [ĐÃ CHỐT ở mức định hướng]:** dùng chung hồ sơ/tài khoản; các chức năng cụ thể (ví, địa chỉ, phương thức thanh toán, cài đặt, đánh giá, xác minh...) **chưa chốt**, chỉ bổ sung theo nghiệp vụ thực tế.
- Người dùng đã yêu cầu Messenger và Tôi “như những web khác”, **chưa yêu cầu thiết kế chi tiết** ở giai đoạn này.

## 7. Không gian “Đăng và quản lý” — Tổng quan

### 7.1. Mục đích [ĐÃ CHỐT]

Trang chủ của không gian này là **Tổng quan**, tập trung vào **tình hình hoạt động và xử lý các đơn/yêu cầu đang có**, không đặt “Đăng bài mới” làm nội dung chính. Người dùng muốn trang chủ có **phần thống kê**, sau đó là **hoạt động gần đây** (ví dụ có khách đặt hàng, có người nhận yêu cầu), rồi đến lối tắt đăng bài.

### 7.2. Thứ tự nội dung [ĐÃ CHỐT ở mức ý chính]

**(1) Thống kê hoạt động → (2) Hoạt động gần đây → (3) Tạo bài đăng.**

**Thống kê:** các ô số liệu tóm tắt, ví dụ số đơn khách đặt, số yêu cầu có người nhận, số giao dịch đang thực hiện, số đã hoàn thành. **[CHƯA CHỐT]** Chỉ số cuối cùng, cách tránh đếm trùng giữa hai loại giao dịch, mốc thời gian (từ trước đến nay/hôm nay/7 ngày/30 ngày), định nghĩa “đã hoàn thành”, doanh thu/chi phí có hiển thị hay không.

**Hoạt động gần đây:** dòng sự kiện theo thời gian, ví dụ khách vừa đặt dịch vụ, có người đề nghị nhận yêu cầu, người thực hiện báo hoàn thành. Sự kiện **cần người dùng xử lý** được gắn nhãn nổi bật; sự kiện chỉ để biết không được mô tả như hành động bắt buộc. Bấm sự kiện mở đúng giao dịch/đề nghị liên quan. **[CHƯA CHỐT]** Số sự kiện hiện mặc định, “Xem tất cả”, cơ chế đã đọc/chưa đọc, nhóm trùng sự kiện.

**Tạo bài đăng:** hai lối tắt riêng: **Đăng bán hàng/dịch vụ** và **Đăng yêu cầu tìm người**. Đặt sau thống kê và hoạt động gần đây, không dùng nút dài thô chiếm cuối danh sách.

### 7.3. Khi không có dữ liệu

**[ĐỊNH HƯỚNG]** Hiển thị trạng thái trống dễ hiểu (chưa có đơn, chưa có yêu cầu, chưa có hoạt động), kèm lối tắt tạo bài. Không hiển thị số liệu giả trong sản phẩm thật.

## 8. Không gian “Đăng và quản lý” — Quản lý bài đăng

### 8.1. Danh sách [ĐỊNH HƯỚNG đã thảo luận]

- Mở trang **“Bài đăng của tôi”** → hiển thị **tất cả bài do tài khoản tạo**.
- Có hai bộ lọc theo loại bài: **Bán hàng/Dịch vụ** và **Yêu cầu tìm người**. Đã đề xuất dùng kiểu bật/tắt như trang Đơn hàng; **chưa có xác nhận riêng từ người dùng về hành vi lọc này**.
- Mỗi bài có nhãn loại, tiêu đề, thông tin tóm tắt, trạng thái hiển thị và đường dẫn đến chi tiết/quản lý.
- **[CHƯA CHỐT]** Có cần tìm kiếm bài của mình, sắp xếp theo ngày, phân trang, bản nháp, bài bị từ chối/vi phạm, lịch sử chỉnh sửa hay không.

### 8.2. Hai loại bài và thao tác riêng

**Bài bán hàng/dịch vụ:** xem bài, chỉnh sửa nội dung/giá/hình ảnh nếu phù hợp, tạm ẩn hoặc mở hiển thị lại, xem liên kết đến các đơn khách đặt phát sinh từ bài. Một bài có thể tạo **nhiều đơn khách đặt**.

**Bài yêu cầu tìm người:** xem/chỉnh sửa nội dung việc, tiền công, thời gian/địa điểm nếu phù hợp, tạm dừng hoặc đóng yêu cầu, xem thông tin người đề nghị nhận và các giao dịch liên quan. **[CHƯA CHỐT]** Bài tự ngừng nhận thêm người khi đã có một người nhận hay chủ bài có thể tuyển nhiều người; điều kiện chỉnh sửa/đóng bài khi công việc đang diễn ra.

**Quy tắc:** quản lý bài đăng là quản lý **nội dung công khai**; xác nhận đơn và theo dõi thực hiện là nghiệp vụ của **Giao dịch**, không trộn một bài với một đơn.

### 8.3. Tạo bài mới [ĐỊNH HƯỚNG]

Người dùng không thích nút **“Tạo bài đăng mới” dài, thô, nằm cuối danh sách**. Phương án đã đề xuất: nút **+** gọn ở góc trên bên phải màn hình Bài đăng; bấm vào chọn **Đăng bán hàng/dịch vụ** hoặc **Đăng yêu cầu tìm người**. Ở Tổng quan vẫn có hai lối tắt tạo bài riêng. **[CHƯA CHỐT]** Vị trí và hình thức nút + cuối cùng (header hay nút nổi), vì người dùng chưa xác nhận dứt điểm sau khi đề xuất.

Hai luồng đăng bài cần **biểu mẫu khác nhau**; không ép bài bán hàng/dịch vụ và bài tìm người dùng một biểu mẫu chung. Trường dữ liệu, bước đăng, ảnh, kiểm duyệt, giá/tiền công, địa điểm, thời gian và điều kiện nhận việc **sẽ quyết định khi dựng HTML và phân tích nghiệp vụ**.

## 9. Không gian “Đăng và quản lý” — Giao dịch

### 9.1. Phạm vi [ĐÃ CHỐT về ranh giới hai không gian]

Mục Giao dịch chỉ theo dõi hoạt động phát sinh từ **bài do mình đăng**, gồm:

1. **Đơn khách đặt:** người khác mua/đặt hàng hoặc dịch vụ do mình đăng; mình là người bán/cung cấp.
2. **Yêu cầu của tôi:** người khác đề nghị nhận hoặc nhận thực hiện công việc do mình đăng; mình là chủ yêu cầu.

**Không đồng nhất** hai loại này. Đơn khách đặt có quy trình xử lý của bên bán/cung cấp; yêu cầu của tôi có quy trình chọn người và theo dõi người thực hiện.

### 9.2. Danh sách [ĐỊNH HƯỚNG, chưa xác nhận cuối cùng]

Phương án đã đề xuất: vào trang **hiển thị tất cả giao dịch**, hai nút lọc **“Đơn khách đặt”** và **“Yêu cầu của tôi”**; bấm một lần lọc, bấm lại trả về tất cả, đổi nút để đổi nhóm. Bấm vào từng mục mới mở chi tiết/trạng thái. Cách này nhất quán với trang Đơn hàng ở không gian Tìm và chọn, **nhưng người dùng chưa xác nhận riêng đề xuất này**.

### 9.3. Chi tiết giao dịch — Đơn khách đặt

**[ĐỊNH HƯỚNG]** Xem khách hàng, bài gốc, nội dung đơn, giá/điều kiện, trạng thái và hành động tương ứng như xác nhận/từ chối theo chính sách, chuẩn bị hoặc thực hiện, cập nhật tiến độ, hoàn tất, xử lý hủy/đổi trả khi áp dụng. Các nút phụ thuộc vào loại hàng hóa/dịch vụ và trạng thái, không xuất hiện đồng loạt.

### 9.4. Chi tiết giao dịch — Yêu cầu của tôi

**[ĐỊNH HƯỚNG]** Xem yêu cầu gốc, người đề nghị nhận/người đã nhận, thông tin công việc, điều kiện, trạng thái, tiến độ, xác nhận hoàn thành và vấn đề phát sinh. Nếu có nhiều người đề nghị nhận, cần xác định cơ chế chọn người, chấp nhận/từ chối và giới hạn số người.

**[CHƯA CHỐT — câu hỏi còn mở từ buổi thảo luận]:** Một người mới **đề nghị nhận việc nhưng chủ yêu cầu chưa chấp thuận** có xuất hiện ngay trong danh sách “Yêu cầu của tôi” để xử lý hay chỉ hiện trong hoạt động Tổng quan và chuyển sang Giao dịch sau khi hai bên xác nhận? Cần chốt cùng định nghĩa “đề nghị nhận”, “đã nhận” và “giao dịch”.

## 10. Ma trận phân quyền theo ngữ cảnh

| Tình huống | Không gian | Màn hình chính | Góc nhìn của người dùng |
|---|---|---|---|
| Tôi mua/đặt bài của người khác | Tìm và chọn | Đơn hàng → Đơn đã đặt | Bên mua/đặt |
| Tôi nhận làm yêu cầu của người khác | Tìm và chọn | Đơn hàng → Đơn đã nhận | Bên thực hiện |
| Khách đặt bài bán hàng/dịch vụ của tôi | Đăng và quản lý | Giao dịch → Đơn khách đặt | Bên bán/cung cấp |
| Có người đề nghị nhận/nhận yêu cầu do tôi đăng | Đăng và quản lý | Giao dịch → Yêu cầu của tôi (phạm vi đề nghị chưa chốt) | Chủ yêu cầu |

Một giao dịch có thể liên quan hai tài khoản với **hai góc nhìn khác nhau**. Không dùng tên gọi hoặc CTA của bên mua cho bên bán, hay của người nhận việc cho chủ yêu cầu. Cùng một tài khoản có thể có nhiều vai trò nhưng **mỗi giao dịch được đưa vào đúng không gian theo quan hệ của tài khoản với bài gốc**.

## 11. Luồng thao tác cốt lõi cần có trong prototype HTML

### Luồng A — Mua hàng/đặt dịch vụ

Tìm và chọn → Trang chủ → Dịch vụ/Hàng hóa → Tìm/chọn danh mục → Xem bài → Mua/Đặt → Đơn hàng (Đơn đã đặt) → Chi tiết, trạng thái và hành động theo điều kiện.

### Luồng B — Nhận việc

Tìm và chọn → Trang chủ → Việc cần người → Danh mục việc riêng → Xem yêu cầu → Nhận/đề nghị nhận → Đơn hàng (Đơn đã nhận, khi đủ điều kiện nghiệp vụ) → Chi tiết, tiến độ và thao tác của người thực hiện.

### Luồng C — Đăng bán hàng/dịch vụ và xử lý đơn

Switch sang Đăng và quản lý → Tổng quan hoặc Bài đăng → Chọn đăng bán hàng/dịch vụ → Tạo bài → Bài đăng của tôi → Có khách đặt → Tổng quan/Hoạt động gần đây → Giao dịch/Đơn khách đặt → Xử lý từng đơn.

### Luồng D — Đăng yêu cầu và làm việc với người nhận

Switch sang Đăng và quản lý → Tổng quan hoặc Bài đăng → Đăng yêu cầu tìm người → Tạo bài → Có người đề nghị nhận/nhận → Hoạt động gần đây → Chi tiết yêu cầu/giao dịch → Chọn hoặc xác nhận người nhận theo cơ chế được chốt → Theo dõi thực hiện và xác nhận kết quả.

### Luồng E — Tin nhắn/thông báo xuyên không gian

Đang ở bất kỳ không gian nào → mở Messenger hoặc Thông báo → chọn cuộc trò chuyện/sự kiện → mở đúng đơn hoặc yêu cầu trong **không gian sở hữu ngữ cảnh đó**; không bắt người dùng tự dò switch. **[CHƯA CHỐT]** Quy tắc quay lại sau khi mở từ thông báo, badge số chưa đọc và cách gắn cuộc trò chuyện với nhiều đơn.

## 12. Trạng thái và hành động: nguyên tắc thiết kế

- **Không hiển thị toàn bộ trạng thái ở trang danh sách Đơn hàng**; trạng thái và thao tác đầy đủ nằm trong **chi tiết từng đơn** theo quyết định của người dùng.
- Không đồng nhất “bài đang hiển thị”, “bài đang tìm người”, “đơn chờ xác nhận”, “người đề nghị nhận”, “đơn đang thực hiện” và “đã hoàn thành”. Đây là các đối tượng hoặc giai đoạn khác nhau.
- Hành động **Hủy** phụ thuộc bên thực hiện, thời điểm, thỏa thuận và chính sách. **Trả hàng** chỉ có ở giao dịch hàng hóa đáp ứng điều kiện; không dùng làm hành động chung cho công việc/dịch vụ.
- Người dùng muốn xử lý **hai loại đơn ở Tìm và chọn hoàn toàn khác nhau về tính chất**, do đó cần thiết kế **hai màn hình chi tiết/luồng thao tác riêng**. Tương tự với hai loại giao dịch ở Đăng và quản lý.
- **[CHƯA CHỐT]** State machine chính thức cho 4 góc nhìn, các trường hợp hủy/hoàn tiền/tranh chấp, xác nhận hai phía, thanh toán, giao nhận, thời hạn phản hồi và ngoại lệ.

## 13. Quy tắc UX/UI cần tuân thủ khi dựng HTML

1. **Mobile-first**; bottom nav luôn rõ ràng và tương tác được, không dùng sidebar thay cho nav chính.
2. Tên không gian hiện tại hiển thị rõ ở ô switch ngay dưới AntGo; hai không gian có nav riêng nhưng không làm người dùng mất dấu.
3. Lần đầu vào Tìm và chọn; các lần sau nhớ không gian gần nhất.
4. Trang chủ Tìm và chọn cho phép lướt bài ngay; chuyển Dịch vụ/Hàng hóa ↔ Việc cần người thì **danh mục, tìm kiếm, thẻ bài và hành động** thay đổi phù hợp.
5. Trang Đơn hàng Tìm và chọn **mặc định hiện tất cả**, hai nút lọc bật/tắt theo loại; **không ép chọn trạng thái ở trang danh sách**.
6. Trang Tổng quan Đăng và quản lý ưu tiên **thống kê → hoạt động gần đây (đánh dấu việc cần xử lý) → tạo bài**.
7. Phân biệt **bài đăng** với **giao dịch**; không dùng một bài dịch vụ để đại diện cho tất cả đơn phát sinh.
8. Không lặp Messenger trên header nếu đã nằm ở bottom nav; Thông báo có thể ở header, dữ liệu dùng chung.
9. Không dùng nút tạo bài dài/thô ở cuối danh sách; thử nút + gọn trong Bài đăng, và hai lối tắt đăng bài ở Tổng quan.
10. Với dữ liệu trống, trạng thái chờ, lỗi mạng, không có kết quả, cần có thông điệp và hành động phù hợp; chi tiết thiết kế sẽ kiểm chứng trong prototype.
11. Dùng nhãn hành động rõ nghĩa (“Đặt dịch vụ”, “Nhận việc”, “Xác nhận đơn”, “Xem người nhận”), tránh dùng chung một CTA mơ hồ cho hai quy trình khác nhau.
12. Không đặt popup xác nhận mỗi lần switch; chỉ cảnh báo khi thao tác có thể làm mất dữ liệu chưa lưu.

## 14. Các quyết định chưa chốt — cần xử lý khi dựng HTML và trước khi code nghiệp vụ

### Thiết kế giao diện

- Hình thức cuối cùng của bottom sheet switch; cuộn/sticky header; animation; cách thể hiện không gian đang chọn.
- Nav 5 mục của Đăng và quản lý trên điện thoại; vị trí chính xác của nút + tạo bài.
- Danh mục chính thức của hai chế độ Trang chủ; thứ tự và số lượng danh mục; bộ lọc, sắp xếp, vị trí danh sách và thẻ bài.
- Trang Bài đăng và Giao dịch có dùng bộ lọc bật/tắt giống Đơn hàng hay không.
- Phần Thống kê: chỉ số, khung thời gian và cách tính; số lượng hoạt động gần đây hiển thị.

### Quy tắc nghiệp vụ

- Ranh giới **hàng hóa**, **dịch vụ**, **yêu cầu tìm người**; loại giao dịch nào AntGo thực sự hỗ trợ.
- Người nhận việc được nhận ngay hay phải được chủ yêu cầu chấp thuận; có cho phép nhiều người nhận một yêu cầu không.
- Đề nghị nhận chưa được duyệt nằm ở danh sách Giao dịch hay chỉ ở Tổng quan.
- Trạng thái và quyền thao tác của bốn góc nhìn; khi nào hủy, hoàn trả, hoàn tiền, khiếu nại.
- Thanh toán/ví, phí, giao hàng, đặt lịch, địa chỉ, đánh giá, xác minh và các chính sách liên quan.
- Quy tắc chỉnh sửa/ẩn/đóng bài khi đã phát sinh giao dịch; bản nháp, kiểm duyệt và lịch sử bài.

### Kỹ thuật và dữ liệu

- Mô hình dữ liệu cho `User`, `Listing` (loại bán hàng/dịch vụ hoặc yêu cầu), `Order/Transaction`, `JobApplication` (nếu có bước đề nghị nhận), `Conversation`, `Notification`.
- Liên kết một bài → nhiều giao dịch; phân quyền truy cập dữ liệu theo **quan hệ tài khoản với giao dịch**, không chỉ theo không gian đang hiển thị.
- Lưu không gian dùng gần nhất; deep link đúng ngữ cảnh; xử lý Back; lưu bản nháp và tránh mất dữ liệu khi switch.
- Trạng thái loading/empty/error, dữ liệu giả để demo và kịch bản kiểm thử xuyên không gian.

## 15. Phạm vi tài liệu và bước tiếp theo

Tài liệu này tổng hợp **những gì đã được thảo luận cho Web2**, không tự xem các ví dụ giao diện hoặc tên danh mục minh họa là yêu cầu nghiệp vụ đã được phê duyệt. Tài liệu **không thay thế** việc đối chiếu các quy tắc nghiệp vụ chi tiết trong tài liệu Web1 hay xác nhận từ nhóm dự án. Những chỗ chưa chốt đã được đánh dấu rõ để không vô tình code thành quyết định cuối cùng.

**Trình tự triển khai prototype đề xuất:** (1) khung mobile, switch và hai bottom nav; (2) Trang chủ Tìm và chọn với hai chế độ và danh mục riêng; (3) danh sách Đơn hàng và hai loại chi tiết; (4) Tổng quan Đăng và quản lý; (5) Bài đăng, hai luồng tạo bài; (6) Giao dịch, hai loại chi tiết; (7) Messenger, Tôi, Thông báo và deep link; (8) rà soát trạng thái trống/lỗi, quyền thao tác và kiểm thử luồng người dùng mới.

---

# HƯỚNG DẪN HANDOFF CHO AI/CODEX

## Mental model cốt lõi

AntGo Web2 có **một tài khoản nhưng hai không gian làm việc**:

- **Tìm và chọn** = người dùng tương tác với nội dung do người khác đăng: mua/đặt hàng-dịch vụ hoặc nhận việc.
- **Đăng và quản lý** = người dùng tạo nội dung của mình: bán/cung cấp hàng-dịch vụ hoặc đăng yêu cầu tìm người, sau đó quản lý các phát sinh.

Không biến 4 vai trò thành 4 chế độ độc lập. Không tạo màn hình bắt người dùng “chọn role” trước khi sử dụng.

## Các quyết định phải giữ

### Switch
- Tên: **Tìm và chọn / Đăng và quản lý**.
- Mobile-first.
- Switch nằm **ngay dưới tên AntGo**.
- Lần đầu vào **Tìm và chọn**.
- Những lần sau nhớ không gian dùng gần nhất.
- Khi switch, nội dung và bottom nav đổi theo workspace.
- Messenger, Tôi, thông báo và account state dùng chung.
- Không confirmation mỗi lần switch; chỉ cảnh báo nếu có nguy cơ mất dữ liệu đang nhập.
- Contextual deep link có thể tự đưa user sang đúng workspace/item thay vì bắt switch thủ công.

### Bottom nav — Tìm và chọn
1. Trang chủ
2. Đơn hàng
3. Messenger
4. Tôi

### Bottom nav — Đăng và quản lý
1. Tổng quan
2. Bài đăng
3. Giao dịch
4. Messenger
5. Tôi

### Đơn hàng — Tìm và chọn
- Mặc định hiển thị **tất cả**.
- Hai filter/toggle: **Đơn đã đặt** và **Đơn đã nhận**.
- Bấm filter đang active lần nữa → trở về tất cả.
- Không đưa filter trạng thái ra list chính ở giai đoạn hiện tại.
- Bấm vào đơn mới xem trạng thái/action chi tiết.
- Đơn đã đặt và đơn đã nhận có nghiệp vụ/action khác nhau.

### Tổng quan — Đăng và quản lý
Ưu tiên việc đang diễn ra/cần xử lý. Hướng nội dung:
1. Thống kê.
2. Hoạt động gần đây / cần xử lý: ví dụ khách đặt hàng, có người nhận/đề nghị nhận yêu cầu, cập nhật hoàn thành.
3. Lối tắt tạo bài.

Metric, khoảng thời gian thống kê và visualization **chưa chốt**.

### Quản lý bài đăng
- Mặc định xem tất cả bài của mình.
- Có thể lọc **Bán hàng/Dịch vụ** và **Yêu cầu tìm người**.
- Listing khác transaction.
- Bài bán hàng/dịch vụ và bài yêu cầu có lifecycle/action khác nhau.
- User không thích một nút dài “Tạo bài đăng mới” nằm thô cuối danh sách. Có thể prototype nút `+` ở header rồi cho chọn loại bài; visual cuối chưa chốt.

### Giao dịch — Đăng và quản lý
Hai nhóm:
- **Đơn khách đặt**: phát sinh từ hàng/dịch vụ user đăng.
- **Yêu cầu của tôi**: phát sinh từ yêu cầu tìm người user đăng.

Mặc định có thể xem tất cả rồi lọc theo hai nhóm. Detail/action của hai nhóm khác nhau.

## Listing ≠ Transaction

Đây là nguyên tắc domain bắt buộc:
- **Listing/Bài đăng** = nội dung user công khai.
- **Transaction/Giao dịch** = một lần tương tác/đơn cụ thể phát sinh từ listing.
- Một listing bán hàng/dịch vụ có thể sinh nhiều transaction.

## Trang chủ — Tìm và chọn

Có hai ngữ cảnh nội dung chính:
- mua/đặt hàng hóa-dịch vụ;
- việc cần người.

Do tính chất khác nhau, khi chuyển sang **Việc cần người**, search/danh mục/filter/card phải có thể thay đổi cho đúng ngữ cảnh. Không reuse máy móc bộ danh mục mua hàng. Tên danh mục cụ thể, card, filter và layout chi tiết sẽ chốt khi dựng HTML.

## Messenger / Tôi

Ở thời điểm hiện tại chỉ cần pattern quen thuộc. Không tạo Messenger/Profile riêng theo workspace. Conversation sau này phải đủ context để user biết mình đang ở vai trò nào trong giao dịch.

## Những điểm còn mở — KHÔNG TỰ BỊA BUSINESS RULE

- Danh mục cụ thể của Trang chủ.
- Search/filter/card/detail Trang chủ.
- State machine đầy đủ của các loại đơn/giao dịch.
- Hủy, trả hàng, hoàn tiền, dispute.
- Metric và time range của Tổng quan.
- Lifecycle đầy đủ của bài yêu cầu.
- Khi có người nhận thì bài yêu cầu có tự ẩn không.
- Có cho nhiều người nhận một yêu cầu không.
- Một “đề nghị nhận việc” đã là transaction hay chỉ trở thành transaction sau khi chủ yêu cầu xác nhận.
- Visual cuối của switch và nút tạo bài.
- Chi tiết Messenger/Tôi/notification.

## Nguyên tắc UX

- Mobile-first, bottom navigation; không dùng sidebar làm navigation chính trên mobile.
- Người dùng hiểu **hành động**, không cần hiểu khái niệm role.
- Progressive disclosure: list đơn giản, detail mới hiện trạng thái/action sâu.
- Vào list nên thấy dữ liệu trước; filter khi user cần.
- Cùng layout không đồng nghĩa cùng nghiệp vụ.
- Không nhồi mọi chức năng vào homepage.
- Giữ discoverability: user mới phải nhanh chóng biết mình đang ở workspace nào và làm gì tiếp theo.
- Shared functions nên có vị trí/hành vi nhất quán giữa hai workspace.

## Quy trình build mong muốn

User muốn phát triển theo vòng lặp:

`Thảo luận → chốt ý chính → dựng HTML/CSS/JS → mở browser thao tác → feedback → sửa trên cùng project → sang phần tiếp theo`

Không build toàn bộ Web2 trong một lần. Không tạo một HTML mới cho mỗi iteration. Duy trì **một codebase**.

Giai đoạn prototype:
- dùng mock data;
- có interaction thật;
- có thể dùng localStorage để nhớ workspace;
- chưa cần backend;
- màn hình chưa bàn có thể để placeholder.

## Thứ tự triển khai gợi ý

1. App shell: header, switch, hai bottom nav, persistence.
2. Trang chủ Tìm và chọn.
3. Đơn hàng + detail mock.
4. Tổng quan Đăng và quản lý.
5. Bài đăng.
6. Giao dịch.
7. Messenger/Tôi/notification/deep-link integration.

## Chỉ dẫn cuối cho Codex

Trước mỗi thay đổi:
1. Đọc file này.
2. Xác định requirement nào đã chốt và requirement nào chưa chốt.
3. Chỉ sửa phạm vi user yêu cầu.
4. Không tự redesign phần đã chốt.
5. Không tự hoàn thiện business rule đang mở.
6. Ưu tiên prototype có thể bấm/thử hơn mockup tĩnh.
7. Luôn giữ kiến trúc hai workspace và phân biệt listing/transaction.
