# AntGo Web2 — User flow Trang chủ / Khám phá

> Cập nhật: 13/10/2026. Phạm vi: không gian **Mua và Nhận việc**, từ Trang chủ / Khám phá đến các thao tác phát sinh từ bài đăng. Tài liệu tổng hợp các quyết định trong buổi thảo luận và bản mẫu có thể thao tác; chưa phải đặc tả nghiệp vụ hoàn chỉnh cho toàn ứng dụng.
>
> **Trạng thái:** **Đã thống nhất** = hướng UX người dùng đã xác nhận; **Đề xuất / bản mẫu** = cách thể hiện để thử, có thể đổi; **Chưa chốt** = không tự coi là quy tắc sản phẩm hay triển khai xử lý dữ liệu thật.

> **Cập nhật bản mẫu 15/10/2026:** Tài liệu này lưu luồng mục tiêu và một số đề xuất cũ. Giao diện web hiện tại dùng header trên cùng, khối Nổi bật / Gần bạn / Việc mới / Khám phá thay cho cấu trúc ba phần Hàng hóa / Dịch vụ / Việc làm ở mục 3. `search.html` đã nối tìm kiếm chung, tab loại bài, danh mục, giá/tiền công, Xu và sắp xếp theo khoảng cách hoặc giá; gợi ý/lịch sử tìm kiếm và bộ lọc sâu còn chờ làm. Đã lưu mở ngăn kéo tại trang cũ và có trang đầy đủ trong `profile.html`. AntXu nằm ở header/ngăn kéo, đổi voucher ở ngăn kéo và áp ở bước đặt hàng; cơ chế Xu vẫn là mẫu. Trang `detail.html` dựng form đặt từ 7 khối tùy loại bài. Việc đã nhận theo `offered → chosen → working → reported → done`, tiền công trả trực tiếp giữa hai bên. Messenger, Thông báo, Tôi và đổi khu vực đã có bản mẫu. Khi mô tả khác với bản mẫu, xem `CLAUDE.md` và `docs/handoff.md`; các chính sách chưa chốt không được suy từ hành vi mẫu.

## 1. Nguyên tắc chung

- AntGo có **một tài khoản** và hai không gian: **Mua và Nhận việc**; **Bán và Đăng bài việc làm**. Tin nhắn, hồ sơ, thông báo và AntXu dùng chung tài khoản. Trang chủ trong tài liệu này thuộc không gian **Mua và Nhận việc**.
- Trang chủ là nơi **khám phá nội dung**. Ba mục **Hàng hóa**, **Dịch vụ**, **Việc làm** là lối vào nhanh, không phải ba bước chọn bắt buộc. Người dùng có thể tìm kiếm, mở danh mục hoặc lướt bài ngay.
- **Hàng hóa bao gồm đồ ăn, thức uống và các món hàng khác**. Không tách đồ ăn thành không gian hoặc vai trò thứ tư. Tuy cùng là hàng hóa, trang chi tiết và hành động có thể dùng từ ngữ phù hợp: **Đặt món** cho đồ ăn; **Mua** cho món hàng khác.
- Phân biệt **bài đăng công khai**, **yêu cầu mua/đặt hoặc đề nghị nhận việc**, **đơn/giao dịch** và **cuộc trò chuyện**. Một bài đăng có thể phát sinh nhiều yêu cầu hoặc giao dịch. **Nhắn tin không tự tạo đơn hay thay đổi trạng thái giao dịch.**
- Các tên bài, giá, người đăng, địa điểm trong bản mẫu chỉ là **dữ liệu minh họa**. Không dùng đánh giá, độ phổ biến, tình trạng còn hàng hoặc số lượt đặt giả làm dữ liệu thật.

## 2. Sơ đồ luồng tổng quát

```text
Vào Khám phá
  ├─ Chọn / đổi khu vực
  ├─ Tìm kiếm chung → gợi ý / lịch sử → kết quả → lọc / sắp xếp
  ├─ Lối vào nhanh Hàng hóa / Dịch vụ / Việc làm → danh sách tương ứng
  ├─ Danh mục nổi bật → danh mục con → danh sách phù hợp
  ├─ Các nhóm bài gợi ý → card → chi tiết bài
  │                         ├─ Lưu bài → Tôi / Đã lưu
  │                         ├─ Nhắn người đăng → Messenger / hội thoại
  │                         ├─ Đặt món / Mua hàng → yêu cầu hoặc đơn
  │                         ├─ Đặt dịch vụ → yêu cầu hoặc đơn
  │                         └─ Đề nghị nhận việc → chờ người đăng phản hồi
  └─ Đáng xem quanh bạn → bài gợi ý theo khu vực → chi tiết bài
```

## 3. Cấu trúc Trang chủ / Khám phá

**Đã thống nhất ở mức UX:**

1. Hiển thị **khu vực đang xem** và cho đổi khu vực bất cứ lúc nào.
2. Có **thanh tìm kiếm chung** cho hàng hóa, dịch vụ và việc làm.
3. Hiển thị ba lối vào nhanh **Hàng hóa · Dịch vụ · Việc làm**. Người dùng không phải chọn một lối vào trước khi dùng phần còn lại của trang.
4. Hiển thị **danh mục nổi bật** mà mọi người hay tìm, mua, đặt hoặc nhận làm. Chọn danh mục chính sẽ hiện các danh mục nhỏ hơn ngay bên dưới. Ví dụ phù hợp: **Đồ ăn & thức uống**, **Đồ gia dụng**, **Dọn dẹp**, **Sửa chữa**, **Bán hàng**, **Vận chuyển**. Danh sách chính thức và thứ tự sẽ dựa trên nhu cầu thực tế.
5. Thay vị trí từng dành cho AntXu bằng nhóm **Đáng xem quanh bạn**: một vài bài cụ thể phù hợp khu vực, chẳng hạn món ăn, dịch vụ và việc làm. Chạm bài mở trang chi tiết. Bản mẫu dùng lựa chọn minh họa theo khu vực; tiêu chí chọn bài thật còn phải xác định. Không gọi bài là “bán chạy”, “được đánh giá tốt” hoặc “đang được quan tâm” nếu chưa có dữ liệu chứng minh.
6. Bên dưới có ba phần nội dung **Hàng hóa**, **Dịch vụ**, **Việc làm**. Mỗi phần hiển thị một số bài để lướt và nút **Xem thêm** mở danh sách đầy đủ. Bản mẫu không lặp lại ngay các bài đã nằm trong nhóm Đáng xem quanh bạn.
7. Trong từng phần có thể dùng nhóm gợi ý theo ngữ cảnh như **đồ ăn gần bạn**, **dịch vụ trong khu**, **việc mới trong khu**. Chỉ hiển thị nhãn “được đánh giá tốt”, “đang được quan tâm” khi có dữ liệu thật. Không cần phần **Đã xem gần đây** trên Trang chủ.

**Nguyên tắc sắp xếp theo vị trí:** ưu tiên bài trong khu vực người dùng đã chọn; khi thiếu hoặc đã xem hết thì cho xem thêm bài ở khu gần đó và ghi rõ khu vực. Việc đổi khu vực làm mới danh sách/gợi ý theo khu vực mới.

## 4. Các user flow chi tiết

### F01 — Vào Trang chủ và chọn khu vực

1. Người dùng vào **Mua và Nhận việc → Khám phá**.
2. Trang chủ hiển thị khu vực đang dùng. Khi cần, người dùng chạm khu vực để chọn nơi khác. Có thể gợi ý lấy vị trí thiết bị nhưng phải có cách chọn thủ công.
3. Hàng hóa, dịch vụ và việc làm trong khu vực đó được ưu tiên. Bài ở khu gần đó xuất hiện sau và có nhãn vị trí rõ ràng.
4. Người dùng có thể tiếp tục bằng tìm kiếm, danh mục, lối vào nhanh hoặc lướt card. **Chọn khu vực không ép người dùng phải chọn một trong ba loại bài.**

**Chưa chốt:** độ rộng “khu gần đó”, vị trí mặc định khi chưa chọn khu vực và cơ chế đồng bộ vị trí giữa các thiết bị.

### F02 — Tìm kiếm chung

1. Chạm thanh tìm kiếm: hiện vài gợi ý hữu ích và **lịch sử tìm kiếm** nếu có.
2. Gõ tự do tên món ăn, hàng hóa, dịch vụ, công việc hoặc từ khóa liên quan. Khi gõ có thể hiện gợi ý khớp nội dung.
3. Chọn gợi ý hoặc bấm tìm kiếm: mở **kết quả chung**. Người dùng có thể thu hẹp theo **Hàng hóa / Dịch vụ / Việc làm**; không bị giới hạn bởi lối vào nhanh đã bấm trước đó.
4. Tại danh sách kết quả, người dùng lọc và sắp xếp theo ngữ cảnh. Ví dụ: khu vực, danh mục, giá đối với hàng hóa; lịch hoặc phạm vi với dịch vụ; thời gian, địa điểm, tiền công với việc làm. Sắp xếp có thể gồm trong khu trước, mới hơn hoặc giá/tiền công phù hợp.
5. Không có kết quả: báo rõ và cho sửa từ khóa, đổi khu vực hoặc bỏ bớt bộ lọc.

**Chưa chốt:** bộ lọc chính thức của từng loại, thứ tự mặc định bên trong cùng một khu và thời hạn lưu/xóa lịch sử tìm kiếm.

### F03 — Ba lối vào nhanh và danh mục nổi bật

- Bấm **Hàng hóa**, **Dịch vụ** hoặc **Việc làm** → mở danh sách đầy đủ của loại đó. Đây là thao tác tiện lợi, không phải điều kiện để xem danh mục khác.
- Bấm **danh mục chính** ở Trang chủ → thấy các danh mục con tương ứng ngay bên dưới. Bấm danh mục con → mở danh sách phù hợp, vẫn có thể đổi lọc/sắp xếp.
- Danh mục nổi bật ưu tiên những nhu cầu thường gặp, **không cần chia đều số lượng danh mục cho ba loại bài**.
- Danh mục của việc làm phải diễn đạt **việc người dùng muốn nhận làm**; không dùng y nguyên bộ danh mục của hàng hóa/dịch vụ nếu ý nghĩa khác.

### F04 — Lướt các phần nội dung và mở bài

1. Người dùng lướt những bài được gợi ý trong từng phần **Hàng hóa**, **Dịch vụ**, **Việc làm**.
   Nhóm **Đáng xem quanh bạn** trước ba phần này cũng mở trực tiếp từng bài, không chuyển người dùng sang một chế độ khác.
2. Card thể hiện thông tin đủ để quyết định có mở tiếp hay không:
   - **Hàng hóa:** ảnh, tên, giá/đơn vị, khu vực; đồ ăn có thể có đơn vị theo phần/ly/ổ.
   - **Dịch vụ:** tên, giá hoặc cách tính giá, khu vực, người cung cấp nếu cần.
   - **Việc làm:** tên việc, tiền công, thời gian, địa điểm.
3. **Chạm card** → mở **chi tiết bài đăng**. Bấm **Xem thêm** ở tiêu đề phần → mở danh sách nhiều bài hơn, **không** mở một bài cụ thể.
4. Nếu bài là nội dung được ưu tiên bằng hình thức quảng bá/AntXu, phải có nhãn **được tài trợ/quảng bá** rõ ràng.

### F05 — Chi tiết bài đăng

Chi tiết phải giúp người dùng hiểu bài và người đăng trước khi quyết định:

| Loại bài | Nội dung cần xem | Hành động chính | Hành động phụ |
|---|---|---|---|
| **Đồ ăn / thức uống** | Ảnh món, tên, mô tả/thành phần do người bán cung cấp, giá theo đơn vị, tình trạng phục vụ nếu có, khu vực, người bán, đánh giá thật nếu có | **Đặt món** | Nhắn người bán, Lưu |
| **Hàng hóa khác** | Ảnh, mô tả, giá, tình trạng, số lượng/khả dụng nếu có, khu vực, người bán, đánh giá thật nếu có | **Mua** | Nhắn người bán, Lưu |
| **Dịch vụ** | Phạm vi công việc, đơn vị giá, thời gian/lịch có thể đặt nếu có, khu vực, người cung cấp, đánh giá thật nếu có | **Đặt dịch vụ** | Nhắn người cung cấp, Lưu |
| **Việc làm** | Việc cần làm, tiền công, thời gian, địa điểm, yêu cầu, người đăng | **Đề nghị nhận việc** | Nhắn người đăng, Lưu |

**Chạm card luôn mở chi tiết trước.** Hành động mua/đặt/đề nghị nhận việc chỉ bắt đầu khi người dùng bấm nút tương ứng ở chi tiết.

### F06 — Lưu bài

1. Bấm biểu tượng **Lưu** trên card hoặc trang chi tiết → lưu bài, không mở trang chi tiết khi bấm biểu tượng trên card.
2. Trạng thái đã lưu đồng bộ giữa card và chi tiết. Bấm lại để bỏ lưu.
3. Xem lại trong **Tôi → Đã lưu**, gom hàng hóa, dịch vụ và việc làm; tại đây có thể mở lại chi tiết bài.
4. **Lưu không giữ chỗ, không đặt hàng, không đặt lịch và không nhận việc.**

### F07 — Liên hệ người bán / người cung cấp / người đăng việc

1. Tại chi tiết, bấm **Nhắn tin** cạnh thông tin người đăng → mở cuộc trò chuyện gắn với **đúng bài đăng**.
2. Người dùng hỏi thêm về món ăn, tình trạng hàng, cách nhận, lịch dịch vụ hoặc yêu cầu công việc. Có đường quay lại chi tiết để tiếp tục thao tác.
3. Cuộc trò chuyện thuộc **Messenger chung của tài khoản**, không tách Messenger theo hai không gian.
4. **Gửi tin nhắn không tự tạo yêu cầu mua, đơn đặt dịch vụ, đề nghị nhận việc hoặc thay đổi trạng thái giao dịch.**

**Chưa chốt:** có cho nhắn trước khi đăng nhập hay không; quản lý hội thoại khi cùng hai người trao đổi về nhiều bài; các quy tắc an toàn/liên hệ ngoài nền tảng.

### F08 — Mua hàng hoặc đặt món

1. Từ chi tiết hàng hóa, bấm **Mua**; với đồ ăn/thức uống bấm **Đặt món**.
2. Người dùng xem/xác nhận món hoặc sản phẩm, **số lượng** và **địa chỉ nhận**. Với đồ ăn có thể thêm **ghi chú món** (ví dụ ít đá, không rau) nếu người bán hỗ trợ.
3. Trước khi gửi cần thấy giá và các thông tin phải xác nhận. Sau khi gửi, hiển thị kết quả rõ ràng và đường vào theo dõi hoạt động/đơn hàng.
4. Người mua có thể nhắn người bán ở trang chi tiết hoặc trong quá trình xử lý, nhưng tin nhắn và đơn là hai đối tượng riêng.

**Đề xuất / bản mẫu:** hiện thao tác **Gửi yêu cầu mua/đặt món** để thử flow. **Chưa chốt** người bán có cần xác nhận hay đơn được tạo ngay; cách nhận hàng (giao/tự đến lấy), phí vận chuyển, tồn kho, giỏ hàng, nhiều người bán trong một đơn, phương thức thanh toán, hoàn/hủy/trả hàng và các trạng thái đơn. Không xem bước mô phỏng là cam kết nghiệp vụ.

### F09 — Đặt dịch vụ

1. Từ chi tiết dịch vụ, xem phạm vi và cách tính giá, người cung cấp, khu vực và điều kiện có thể đặt.
2. Bấm **Đặt dịch vụ** → nêu thời gian mong muốn, địa chỉ và mô tả nhu cầu. Nếu giá cần báo theo việc, phải có bước xác nhận giá trước khi hoàn tất đặt.
3. Gửi yêu cầu và theo dõi trạng thái ở khu vực đơn/hoạt động của mình. Có thể nhắn người cung cấp để làm rõ phạm vi.

**Chưa chốt:** lịch khả dụng, xác nhận đặt lịch, đặt cọc, đổi lịch, hủy, phí và quy tắc hoàn thành.

### F10 — Tìm và đề nghị nhận việc

1. Người dùng mở việc từ card hoặc danh sách. Việc ưu tiên trong phạm vi Web2 là **việc địa phương, việc theo ca/ngắn hạn**, có nội dung, tiền công, thời gian và địa điểm rõ ràng. Chưa mở rộng sang quy trình tuyển dụng dài hạn đầy đủ.
2. Tại chi tiết, xem yêu cầu và người đăng; có thể nhắn hỏi thêm hoặc bấm **Đề nghị nhận việc**.
3. Nhập thời gian có thể làm và lời giới thiệu ngắn, rồi gửi. Giao diện phản hồi **Đã gửi đề nghị** để người dùng biết thao tác thành công.
4. **Đề xuất đã dùng trong bản mẫu:** người đăng xem và chấp thuận; chỉ khi được đồng ý mới thành **Đã nhận việc**. Cách này tránh nhiều người cùng bấm rồi mặc nhiên đều nhận một việc.

**Chưa chốt:** có trường hợp nhận ngay hay không, số người có thể nhận một bài, tiêu chí chọn người, cơ chế trả công, hủy/đổi người và trạng thái sau khi hoàn thành. Hoàn thành việc **không tự đồng nghĩa** đã thanh toán.

### F11 — AntXu tạm rời Trang chủ

- **Quyết định UX mới nhất:** chưa dành một mục riêng hoặc lối vào AntXu trên Trang chủ. Vị trí đó ưu tiên bài **Đáng xem quanh bạn** để phục vụ mục tiêu khám phá.
- Nếu tiếp tục có AntXu, chi tiết số dư, nhiệm vụ và lịch sử Xu nên nằm ở **Tôi** hoặc khu vực AntXu của cùng tài khoản. Chỉ nhắc Xu tại thời điểm nó có lợi ích rõ ràng cho người dùng, ví dụ ưu đãi có thể dùng Xu.
- **Định hướng đang thảo luận:** người mua có thể dùng Xu cho quyền lợi/ưu đãi phù hợp; người đăng có thể dùng Xu để quảng bá bài trong giới hạn và phải gắn nhãn quảng bá. Người dùng có thể nhận Xu từ nhiệm vụ phù hợp hoặc **tự nguyện** xem quảng cáo có thưởng.
- **Chưa chốt toàn bộ cơ chế:** giá trị Xu, cách kiếm/tiêu, giới hạn, điều kiện quảng cáo, quyền lợi thực tế và tác động lên xếp hạng. Chỉ cân nhắc đưa Xu trở lại Trang chủ khi các lợi ích này đủ cụ thể.

### F12 — Đăng nhập tại thời điểm cần thao tác

- **Đã tham khảo nhưng người dùng yêu cầu chốt sau:** đăng nhập nhanh bằng số điện thoại/OTP, một tài khoản cho hai không gian. Có thể để người dùng xem bài trước rồi mới mời đăng nhập khi lưu, nhắn tin, mua, đặt dịch vụ hoặc đề nghị nhận việc. Sau đăng nhập nên trở lại **đúng bài và thao tác đang làm**.
- Đây **chưa phải flow đăng nhập cuối cùng**. Chưa chốt phương thức đăng nhập, yêu cầu tạo hồ sơ, thời điểm bắt buộc đăng nhập và quyền xem của khách chưa đăng nhập.

## 5. Trạng thái và điều hướng cần giữ nhất quán

| Đối tượng | Ví dụ trạng thái để thiết kế UX | Quy tắc |
|---|---|---|
| Bài đăng | đang hiển thị, tạm ẩn, hết khả dụng | Bài có thể tồn tại độc lập với nhiều yêu cầu/đơn phát sinh. |
| Lưu bài | chưa lưu, đã lưu | Không phát sinh giao dịch. |
| Hội thoại | chưa nhắn, đang trao đổi | Không tự thay đổi trạng thái đơn hoặc việc. |
| Yêu cầu mua/đặt | đang nhập, đã gửi, đang chờ/xử lý | Tên và chuyển trạng thái cuối cùng chờ chốt nghiệp vụ. |
| Đề nghị nhận việc | đang nhập, đã gửi, được chấp thuận hoặc từ chối | Chỉ hiển thị hành động hợp lệ với người nhận việc. |

Người dùng phải có đường quay lại danh sách/Trang chủ từ chi tiết, hội thoại và biểu mẫu. Nếu bắt đầu thao tác rồi đăng nhập, cần giữ ngữ cảnh của bài. Khi bài hết khả dụng hoặc không còn kết quả trong khu, giao diện phải báo rõ và gợi ý hành động tiếp theo.

## 6. Những quyết định cần chốt trước khi làm nghiệp vụ thật

1. **Đơn hàng:** gửi yêu cầu hay đặt thành công ngay; người bán duyệt hay không; thanh toán, vận chuyển, tự lấy, phí, hủy/hoàn/trả.
2. **Đồ ăn:** thời gian chuẩn bị, trạng thái còn món, tùy chọn món, giao nhận và cách xử lý món không còn.
3. **Dịch vụ:** lịch trống, xác nhận giá, đổi lịch, hủy và hoàn thành.
4. **Việc làm:** đề nghị hay nhận ngay, số người được nhận, cách duyệt, trả công và tranh chấp.
5. **Đăng nhập:** khách được xem/lưu/nhắn đến mức nào; OTP và điều hướng trở lại.
6. **AntXu:** cách nhận, cách dùng, giới hạn và nhãn quảng bá.
7. **Khám phá:** danh mục chính thức, bộ lọc, thuật toán gợi ý/xếp hạng và phạm vi “gần bạn”.

---

**Ghi chú về tài liệu cũ:** `docs/project-context.md` ngày 22/09/2026 còn mô tả Trang chủ theo hai tab “Dịch vụ/Hàng hóa” và “Việc cần người”, với tên không gian “Tìm và chọn” / “Đăng và quản lý”. Những quyết định mới hơn trong tài liệu này dùng **ba lối vào không bắt buộc** và ba phần nội dung **Hàng hóa / Dịch vụ / Việc làm**, cùng tên không gian **Mua và Nhận việc** / **Bán và Đăng bài việc làm**. Khi cập nhật sitemap hoặc code, ưu tiên quyết định mới hơn của người dùng.
