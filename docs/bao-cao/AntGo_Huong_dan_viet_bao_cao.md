# HƯỚNG DẪN VIẾT BÁO CÁO ĐỒ ÁN ANTGO | NHÓM 1

> Tài liệu dùng chung cho cả nhóm. Đọc hết trước khi viết phần của mình.
> Áp dụng cho **toàn bộ báo cáo**, từ phần đầu đến phụ lục.

---

## 1. Mạch xuyên suốt của báo cáo

Cả báo cáo đi theo **một sợi chỉ**: ba vấn đề nêu ở chương 1 được theo dõi đến hết chương 6. Mỗi chương xử lý ba vấn đề đó ở một góc khác nhau:

| | Tìm kiếm và định giá | Theo dõi đơn hàng và công việc | An toàn thông tin |
|---|---|---|---|
| **Ch.1: Vì sao là vấn đề** | Gõ sai, gõ không dấu thì không ra kết quả; người đăng không biết đặt giá | Hai bên thấy hai trạng thái khác nhau cho cùng một giao dịch | Lộ địa chỉ, số điện thoại, phiên đăng nhập |
| **Ch.2: Kỹ thuật nào giải quyết** | TF–IDF, cosine, Levenshtein, kNN | REST, MongoDB (enum trạng thái, tham chiếu) | Cookie, session, băm mật khẩu, phân quyền |
| **Ch.3: AntGo thiết kế thế nào** | Tiền xử lý tiếng Việt, trọng số, giá trị k | Bảng chuyển trạng thái, BPMN, ERD | Ai được xem gì, middleware xác thực |
| **Ch.4: Kết quả đo được** | P@1/3/5, ví dụ truy vấn | Màn hình theo dõi, test luồng đơn và đề nghị | Test bảo mật: chặn được gì |
| **Ch.5: Đánh giá** | Hạn chế của trọng số chọn tay, dữ liệu ít | Phía Bán chưa dùng chung API | Chưa xác minh danh tính |
| **Ch.6: Làm gì tiếp** | Dữ liệu hành vi, học từ người dùng | API phía Bán, đồng bộ hai phía | Xác minh, chính sách bảo vệ |

**Điểm neo của mạch là Bảng 1.2** (vấn đề, mục tiêu, tiêu chí đánh giá) ở chương 1:
- **Mục 4.10** dùng lại đúng các dòng của Bảng 1.2 và thêm cột *Kết quả*, *Đạt / Một phần / Chưa*.
- **Mục 5.1** bàn về những dòng *Một phần* và *Chưa* trong bảng đó.
- **Mục 6.3** đưa ra hướng phát triển cho chính những dòng đó.

Người đọc nhận ra cùng một bảng xuất hiện ba lần, nên tự thấy được mạch của bài mà không cần nhiều câu dẫn.

---

## 2. Mỗi chương trả lời một câu hỏi

| Chương | Câu hỏi | Viết gì | Không viết |
|---|---|---|---|
| 1. Giới thiệu | **Cái gì? Vì sao quan trọng?** | Bối cảnh, bằng chứng, vấn đề, mục tiêu, phạm vi | Cách làm chi tiết |
| 2. Cơ sở lý thuyết | **Kỹ thuật này là gì? Người khác đã làm gì?** | Định nghĩa có trích dẫn, nghiên cứu, sản phẩm liên quan | Tham số, code của AntGo |
| 3. Phương pháp | **AntGo thiết kế thế nào?** | Sơ đồ, quy tắc nghiệp vụ, công thức có tham số thật | Ảnh màn hình kết quả |
| 4. Kết quả | **Chạy ra sao? Đo được gì?** | Ảnh màn hình, số liệu, kết quả kiểm thử | Giải thích lại lý thuyết |
| 5. Thảo luận | **Kết quả có ý nghĩa gì?** | Lý giải, điểm mạnh, hạn chế, bài học | Mô tả lại chức năng |
| 6. Kết luận | **Tóm lại được gì? Làm gì tiếp?** | Kết quả chính, ý nghĩa, hướng phát triển | Tóm tắt lại cả bài |

**Mẹo kiểm tra:** muốn chứng minh một câu mà phải dùng đến sơ đồ hoặc ảnh chụp màn hình, thì câu đó không thuộc chương 1 hay chương 2.

**Tỉ lệ độ dài gợi ý:** Ch.1 khoảng 10%, Ch.2 khoảng 20%, Ch.3 khoảng 30%, Ch.4 khoảng 25%, Ch.5 khoảng 10%, Ch.6 khoảng 5%. Chương 2 dài hơn chương 3 nghĩa là nhóm đang viết lý thuyết quá nhiều.

---

## 3. Khung của một bài report

Phần này giúp bài "ra dáng" báo cáo. **Mọi chương đều theo cùng một khung.**

### 3.1. Khung chương

```
CHƯƠNG X. TÊN CHƯƠNG                      ← P1
[Đoạn dẫn chương: 2–3 câu]
X.1. Tên mục                               ← P2
[Câu dẫn mục: 1–2 câu]
X.1.1. Tên mục con                         ← P3
[Nội dung]
...
Tiểu kết chương X                          ← P5 (không vào mục lục)
[3–4 câu: chương đã xác định được gì → chương sau làm gì]
```

**a) Đoạn dẫn chương**, 2–3 câu: chương này giải quyết câu hỏi gì, gồm những phần nào.
> Chương này giới thiệu bối cảnh hình thành đề tài AntGo, các vấn đề cư dân gặp phải khi giao dịch trong khu và mục tiêu nhóm đặt ra cho đồ án. Phần cuối chương xác định phạm vi, giới hạn và phương pháp thực hiện.

**b) Không để hai tiêu đề nằm liền nhau.** Dưới mỗi P2 luôn có 1–2 câu dẫn trước khi vào P3.
> ✗ 1.4. Mục tiêu của đồ án → *(ngay sau là)* 1.4.1. Mục tiêu tổng quát
> ✓ 1.4. Mục tiêu của đồ án → "Từ ba nhóm vấn đề trên, nhóm đặt ra mục tiêu ở ba mức: tổng quát, chức năng và kỹ thuật, kèm tiêu chí để đánh giá kết quả." → 1.4.1…

**c) Tiểu kết chương**, 3–4 câu ở cuối mỗi chương: chương vừa rồi đã xác định hoặc làm được gì, và chương sau sẽ làm gì. Đây là **chỗ duy nhất** nối hai chương với nhau, nên các phần thân chương không cần câu dẫn sang chương khác.
> *Tiểu kết chương 1:* Chương 1 đã chỉ ra khoảng trống giữa sàn thương mại điện tử và nhóm chat của khu dân cư, từ đó xác định ba nhóm vấn đề và bốn tiêu chí đánh giá cho AntGo. Để có cơ sở lựa chọn giải pháp, chương 2 trình bày các nền tảng tương tự đang có và những kỹ thuật được dùng để xây dựng hệ thống.

### 3.2. Dẫn chéo: dùng ít, đặt đúng chỗ

Dẫn chéo làm người đọc **mất mạch**, vì họ phải lật trang để tìm. Bốn quy tắc:

1. **Không dẫn thay cho nội dung.** Người đọc cần lý do ngay tại chỗ, thì viết lý do ra.
   > ✗ Phần này chạy bằng dữ liệu mẫu. Lý do được nêu ở mục 1.5.4.
   > ✓ Phần này chạy bằng dữ liệu mẫu vì server chưa có API cho phía Bán.
2. **Không báo trước những gì người đọc đương nhiên sẽ đọc tới.** Báo cáo nào cũng có chương kết quả và chương hạn chế, nên không cần viết "được đánh giá ở mục 4.10, 5.1" hay "hướng sửa ở mục 6.3".
3. **Khi thật sự cần dẫn, dẫn theo chương hoặc theo bảng/hình**, không dẫn theo số mục.
   > ✗ …ở mục 3.2.4 và 3.4. ✓ …ở chương 3. ✓ …(Bảng 1.2).
4. **Đặt câu dẫn ở cuối đoạn**, đừng để giữa mạch ý.

**Định mức:** mỗi chương tối đa **2–3 câu dẫn chéo**, chưa tính tiểu kết và các câu dẫn tới bảng/hình. Riêng dẫn tới **phụ lục** thì dùng thoải mái, ví dụ "(Phụ lục A)", vì đó là nơi đặt nội dung bổ sung.

**Dẫn ngược lại chương trước** (chương 4 dẫn về chương 1, chương 5 dẫn về chương 4): dùng **tên** của nội dung, không dùng số mục.
> ✗ Mục tiêu ở 1.4.2 đã đạt. ✓ Luồng đặt hàng, mục tiêu đặt ra từ đầu, đã chạy bằng API thật.

### 3.3. Câu và đoạn

**Câu vừa phải, ý liền nhau.** Câu quá cụt đọc như ghi chú. Câu quá dài thì khó theo. Khi hai câu liền nhau cùng nói về một ý, gộp lại thành một câu ghép có liên từ (*vì, nên, khi đó, còn, trong khi, bên cạnh đó*).
> ✗ Việc tìm cũng khó. Người dùng gõ "lau nhà" trong khi bài ghi "dọn nhà". Họ gõ không dấu hoặc sai một hai ký tự.
> ✓ Bên cạnh đó, cách người dùng gõ thường không khớp với cách người đăng viết: họ tìm "lau nhà" trong khi bài ghi "dọn nhà", hoặc gõ không dấu, sai một hai ký tự.

**Cấu trúc một đoạn:**
1. Câu chủ đề: đoạn này nói gì.
2. Giải thích hoặc lý do.
3. Ví dụ hoặc bằng chứng của AntGo.
4. (Nếu cần) hậu quả hoặc ý nối sang đoạn sau.

**Liệt kê:**
- Liệt kê **từ 4 mục song song trở lên**, mỗi mục là một cụm từ → dùng gạch đầu dòng hoặc bảng.
- Liệt kê cần **lập luận** (vì sao, so sánh, nhân quả) → viết thành đoạn văn.

### 3.4. Bảng và hình làm điểm tựa

Mỗi chương cần vài bảng hoặc hình để người đọc "dừng mắt". Danh sách tối thiểu:

| Chương | Bảng / hình nên có |
|---|---|
| 1 | Bảng 1.1 Bốn loại bài; **Bảng 1.2 Vấn đề, mục tiêu, tiêu chí**; Hình 1.1 Ảnh nhóm Zalo (bằng chứng); *(tùy chọn)* Hình 1.2 Trang chủ AntGo |
| 2 | Bảng so sánh nền tảng (2.2.2); bảng tổng hợp nghiên cứu liên quan *(tùy chọn)*; công thức thuật toán |
| 3 | Gantt rút gọn; ma trận tác nhân và chức năng; **bảng chuyển trạng thái**; sơ đồ kiến trúc; Use Case; BPMN; ERD; lưu đồ thuật toán |
| 4 | Ảnh màn hình mỗi luồng; bảng nhóm API; bảng P@k; bảng kết quả kiểm thử; **bảng đối chiếu Bảng 1.2** (4.10) |
| 5 | Ít bảng, chủ yếu đoạn văn |
| 6 | Không bắt buộc |

---

## 4. Giọng văn

### 4.1. Giữ

- **Ví dụ cụ thể của AntGo**: block A–D, trông mèo, "lau nhà" và "dọn nhà". Mỗi mục P2 nên có ít nhất một ví dụ.
- **Thẳng thắn về giới hạn.** "Chưa làm được" đáng tin hơn là khen sản phẩm.
- **Ngôi kể là "nhóm"** cho cả bài. Không dùng "chúng em", "chúng tôi", "tác giả".

### 4.2. Thêm

- **Quyết định nào cũng kèm lý do.**
  > ✗ Tổng tiền do server tính. ✓ Tổng tiền do server tính lại, để người mua không sửa được giá trên trình duyệt.
- **Vấn đề nào cũng kèm hậu quả.**
  > ✗ Tìm kiếm khớp chính xác trả về danh sách trống. ✓ …trả về danh sách trống, và người dùng lại quay về hỏi trong nhóm chat.
- **Nhận định nào cũng có chỗ dựa**: trích dẫn, số liệu nhóm tự đo, hoặc bảng/hình trong bài. Câu "theo quan sát của nhóm" dùng tối đa 1–2 lần cho cả bài.
- **Không nói quá.**
  > ✗ Thuật toán gợi ý rất chính xác. ✓ Precision@3 đạt 0,xx trên 40 bài seed, cao hơn mức chọn ngẫu nhiên (0,yy).

### 4.3. Văn viết báo cáo: nâng nhẹ, không quá trang trọng

| Khẩu ngữ | Văn báo cáo |
|---|---|
| Nhóm làm năm luồng / Đồ án làm bốn loại bài | Nhóm xây dựng năm luồng chức năng / Đồ án triển khai bốn loại bài |
| Nhóm thấy… | Nhóm nhận thấy… |
| Khi thử giao diện… | Trong quá trình thử nghiệm giao diện… |
| đề tài buộc phải dùng những gì môn học yêu cầu | đề tài cho phép áp dụng hầu hết nội dung của môn học |
| lỗ công | không bù được công sức |
| người lạ, biết địa chỉ nhà | người ngoài, biết địa chỉ nơi ở |
| chạy ổn | hoạt động ổn định |
| cái này, mấy cái, tụi mình | (bỏ hoặc thay bằng danh từ cụ thể) |

### 4.4. Tránh (dấu hiệu "văn AI")

- Mở đoạn bằng câu chung chung: *"Trong thời đại công nghệ 4.0…"*, *"Ngày nay, … ngày càng đóng vai trò quan trọng"*.
- *"không chỉ… mà còn…"*, *"đóng vai trò then chốt"*, *"góp phần nâng cao"*, *"toàn diện"*, *"tối ưu"*, *"vượt trội"*, *"liền mạch"*.
- Đoạn nào cũng kết bằng một câu tóm tắt lặp lại ý vừa viết. Tiểu kết chỉ đặt ở cuối chương.
- Lúc nào cũng liệt kê đúng 3 ý.
- **Trích dẫn không có thật.** Bài nào được trích thì người viết phải đã mở ra đọc.

---

## 5. Thuật ngữ thống nhất

| Dùng | Không dùng lẫn |
|---|---|
| bài đăng | tin, post, sản phẩm (khi nói chung) |
| đơn hàng | order, đơn đặt |
| đề nghị nhận việc | ứng tuyển, apply, đơn xin việc |
| người bán / người đăng việc / người nhận việc | chủ shop, chủ việc, worker |
| không gian Mua và Nhận việc / không gian Bán và Đăng việc | phía buyer, phía seller |
| server | máy chủ, backend (trừ khi nói "cấu trúc backend" ở 3.3.3) |
| dữ liệu seed (ở server) / dữ liệu mẫu (JSON ở client) | mock, dữ liệu giả |
| Messenger (lần đầu ghi: "Messenger, tính năng nhắn tin của AntGo") | chat, tin nhắn (khi nói về tính năng) |
| AntXu | xu, coin |
| quản trị viên | admin (trừ tên quyền `admin` trong code) |

- **Thuật ngữ kỹ thuật** (API, component, endpoint, middleware…) giữ tiếng Anh. Lần đầu xuất hiện thì viết nghiêng, giải thích ngắn, và thêm vào **Danh mục từ viết tắt** nếu là từ viết tắt.
- **Tên trong code** (`authGuard`, `connect-mongo`, tên collection) viết bằng font code hoặc in nghiêng, giữ nguyên chữ hoa và chữ thường.
- **Số liệu** viết theo kiểu Việt Nam: 0,82; 39 tỷ USD; 1.250 bài.
- **Tên trạng thái** của đơn hàng và việc làm lấy đúng như hiển thị trên giao diện (ví dụ: *Được chọn, Đang làm, Đã báo xong, Hoàn thành*), viết hoa chữ đầu và dùng giống nhau ở mọi chương.

---

## 6. Hướng viết từng phần

### Phần đầu

| Mục | Hướng viết |
|---|---|
| Trang bìa | Điền đủ môn, đề tài, nhóm, GVHD, "TP. Hồ Chí Minh, tháng … năm 2026". |
| Danh sách thành viên | Kiểm tra lại chính tả họ tên và MSSV. |
| Lời cảm ơn | 1 đoạn, chân thành, không sáo rỗng. |
| Lời cam kết | Nêu rõ: nhóm có dùng công cụ AI hỗ trợ lập trình theo đề cương cho phép. Mọi nội dung đã được nhóm kiểm tra. |
| Tóm tắt (150–250 từ) | **Viết sau cùng.** 1 đoạn gồm: bối cảnh (1 câu), vấn đề (1 câu), mục tiêu (1 câu), cách làm (2 câu), kết quả **có số liệu** (2–3 câu), hạn chế chính (1 câu). |
| Mục lục, danh mục | Word tạo tự động từ style (mục 7). Tên đúng: "DANH MỤC HÌNH ẢNH", "DANH MỤC BẢNG BIỂU", "DANH MỤC TỪ VIẾT TẮT". |
| Gantt, phân công | Gantt theo tuần, bảng gồm đầu việc, người phụ trách, sản phẩm bàn giao. Khớp với Phụ lục E. |

### Chương 1. Giới thiệu

**Vai trò:** cho người đọc thấy vấn đề có thật, đáng giải quyết, và AntGo nhắm vào đúng chỗ đó. **Chương 1 tự đọc hiểu được, không cần lật sang chương khác.**

- **Đoạn dẫn chương:** có, theo mẫu ở mục 3.1.
- **1.1.1:** viết theo mạch *số liệu thị trường → vì sao sàn lớn không hợp với nhu cầu trong khu → nhóm chat đang lấp chỗ trống nhưng có nhược điểm → khoảng trống cho AntGo*. Số liệu khu vực và số liệu Việt Nam lấy từ **cùng một báo cáo e‑Conomy SEA 2026** (bỏ trích dẫn Vietstock). Có **Hình 1.1** (ảnh nhóm Zalo, che thông tin cá nhân) hoặc số liệu khảo sát làm bằng chứng.
- **1.1.2:** giữ hai phía cung và cầu. Nếu có khảo sát thì đưa 1–2 số liệu vào đây.
- **1.1.3:** giữ hai lý do. **Không** dẫn sang mục 2.2. Ý so sánh với các nền tảng khác đặt ở tiểu kết chương.
- **1.2:** chỉ giữ ý tưởng chính: một tài khoản, hai không gian, bốn loại bài (Bảng 1.1), phân biệt dịch vụ với việc làm. Ở 1.2.1 và 1.2.2, thay câu dẫn chéo bằng **một câu ví dụ** hoặc **một câu lý do** ngay tại chỗ.
- **1.3:** mỗi vấn đề kết bằng **hậu quả** với người dùng.
- **1.4:** có câu dẫn dưới tiêu đề 1.4.
  - **1.4.2:** năm luồng viết thành gạch đầu dòng, mỗi dòng ghi người dùng làm được gì. Bỏ các câu kiểu "trả lời vấn đề ở mục 1.3.x".
  - **1.4.3:** chỉ nói về kỹ thuật. Trợ lý dùng **bộ luật kết hợp mô hình ngôn ngữ**, không phải TF–IDF/kNN.
  - **1.4.4. Tiêu chí đánh giá** *(mục mới, nhớ cập nhật outline)*: 1–2 câu dẫn + **Bảng 1.2**.

| Vấn đề | Mục tiêu | Tiêu chí đánh giá |
|---|---|---|
| Tìm kiếm và định giá | Tìm bài theo loại, tìm gần đúng, gợi ý giá | Vẫn ra kết quả khi gõ không dấu hoặc sai 1–2 ký tự; Precision@3 cao hơn mức ngẫu nhiên |
| Theo dõi đơn và công việc | Luồng đặt hàng, nhận việc có ràng buộc trạng thái | Các luồng phía Mua chạy bằng API thật |
| An toàn thông tin | Session, băm mật khẩu, phân quyền xem dữ liệu, quản trị | API không trả địa chỉ chính xác cho người chưa được chọn |

- **1.5:** có câu dẫn dưới tiêu đề 1.5. Bốn đối tượng ở 1.5.1 viết thành gạch đầu dòng. Ở 1.5.4 **bỏ** câu "nguyên nhân và hướng sửa ở mục 5.3 và 6.3".
- **1.6:** bỏ câu "cách đo cụ thể nằm ở mục 3.9". Đoạn "Phần còn lại của báo cáo…" thay bằng **tiểu kết chương 1**.

### Chương 2. Cơ sở lý thuyết

**Vai trò:** cung cấp nền tảng để hiểu thiết kế ở chương 3. **Đây là chương dễ bị "giọng AI" nhất.**

- **Đoạn dẫn chương:** chương gồm hai phần, *nghiên cứu và sản phẩm liên quan* và *các kỹ thuật được dùng*.
- **Cuối mỗi mục P2** viết một câu "Trong AntGo, … được dùng để …". Câu này nối lý thuyết với sản phẩm ngay tại chỗ, không cần dẫn sang chương 3.
- **2.1:** đang chỉ có 2.1.1. Đã chia mục nhỏ thì phải có ít nhất 2 mục. Có thể thêm 2.1.2 (*giao dịch C2C trong cộng đồng* hoặc *việc làm ngắn / việc vặt*), hoặc gộp 2.1.1 vào 2.1.
- **2.2.1, nghiên cứu liên quan:** 4–6 bài trong 5 năm gần đây, lấy từ IEEE, ACM, Springer, Elsevier hoặc Google Scholar. **Không dùng MDPI, Frontiers, Hindawi.** Hướng tìm: *hyperlocal platform, neighborhood marketplace, gig economy / micro-tasks, peer-to-peer trust, content-based recommendation*. Viết thành đoạn văn, gom bài theo chủ đề. Mỗi bài 2–3 câu: bài làm gì, kết quả gì, liên quan gì đến AntGo.
- **2.2.2, sản phẩm tham khảo:** **bảng so sánh** gồm nhóm Zalo/Facebook, ShopeeFood/GrabFood, Facebook Marketplace, một app nhận việc vặt, và AntGo. Tiêu chí: phạm vi khu, loại nội dung, theo dõi đơn, việc làm ngắn, bảo vệ địa chỉ, phí.
- **2.2.3:** rút điểm khác biệt **từ chính bảng ở 2.2.2**, viết 1–2 đoạn. Mục này là câu trả lời đầy đủ cho "khoảng trống" đã nêu ở chương 1.
- **2.3–2.7, kỹ thuật web:** viết **ngắn**, mỗi mục con 1–2 đoạn. Trích tài liệu chính thức (angular.dev, expressjs.com, mongodb.com, mongoosejs.com). Không giảng lại kiến thức đã học trên lớp. Code mẫu nếu có thì tối đa 5–10 dòng.
- **2.8, thuật toán:** công thức TF–IDF, cosine, Levenshtein, kNN, trung vị có trọng số **ở dạng tổng quát**. Tham số cụ thể của AntGo để ở chương 3.
- **2.9, trợ lý:** khái niệm tool calling và cơ chế dự phòng. Không mô tả prompt hay code cụ thể.
- **Tiểu kết chương 2:** từ khác biệt ở 2.2.3 và các kỹ thuật đã nêu → chương 3 trình bày cách nhóm áp dụng chúng vào thiết kế AntGo.

### Chương 3. Phương pháp thực hiện

**Vai trò:** chương dày nhất. Cho thấy nhóm *thiết kế* trước khi code.

- **Đoạn dẫn chương:** đi từ quy trình → yêu cầu → kiến trúc → luồng → dữ liệu → thuật toán → giao diện → công cụ → cách đánh giá.
- **Sau mỗi sơ đồ** viết 3–5 câu chỉ ra **điểm không hiển nhiên** trong sơ đồ, ví dụ vì sao đơn không nhảy thẳng từ "chờ xác nhận" sang "hoàn thành". **Không đọc lại sơ đồ bằng chữ.**
- Sơ đồ chính để trong bài. Các sơ đồ phụ (DFD mức 1, các BPMN còn lại, lưu đồ chi tiết) để ở **Phụ lục A**.
- **3.1:** quy trình thực tế của nhóm, có Gantt rút gọn. Có thể ghi thật những lần phải quay lại sửa thiết kế.
- **3.2.2:** ma trận tác nhân và chức năng **dạng bảng**.
- **3.2.4, quy tắc nghiệp vụ:** **bảng chuyển trạng thái** gồm trạng thái hiện tại, hành động, ai được làm, trạng thái mới. Làm cho cả đơn hàng và đề nghị nhận việc. Đây là phần cốt lõi của vấn đề *theo dõi đơn*.
- **3.3:** 1 sơ đồ kiến trúc tổng thể và 2 cây thư mục rút gọn (frontend, backend), mỗi cây kèm 1 đoạn giải thích cách chia.
- **3.5.2, từ điển dữ liệu:** trong bài chỉ để 3–4 collection chính (User, Post, Order, Offer). Các collection còn lại để ở phụ lục.
- **3.6:** công thức với **tham số thật** (trọng số loại, giá, khu vực; giá trị k; ngưỡng Levenshtein…) và 1 ví dụ tính tay nhỏ. Nói rõ trọng số do nhóm chọn tay và vì sao.
- **3.8.1:** số phiên bản **đối chiếu với `package.json`**.
- **3.9:** cách đo cho **từng tiêu chí trong Bảng 1.2**. Chỉ nêu cách đo, chưa nêu kết quả.
- **Tiểu kết chương 3:** thiết kế đã sẵn sàng → chương 4 trình bày sản phẩm thực tế và kết quả đo.

### Chương 4. Kết quả và phân tích

**Vai trò:** chứng minh sản phẩm chạy được và đo được.

- **Đoạn dẫn chương:** kết quả trình bày theo thứ tự giống chương 3, cuối chương đối chiếu với Bảng 1.2.
- **Khuôn cố định cho mỗi mục con:** *ảnh màn hình → 2–3 câu (người dùng làm gì, hệ thống phản hồi gì, điểm đáng chú ý) → API hoặc test case liên quan*.
- Ảnh chụp có dữ liệu seed rõ ràng, không chụp màn hình trống. Mỗi mục con tối đa 1–2 ảnh, ảnh còn lại để ở Phụ lục B.
- **4.4:** ghi **một lần** ở câu dẫn của mục: "Không gian Bán và Đăng việc hiện chạy bằng dữ liệu mẫu ở client do server chưa có API cho phía này." Không nhắc lại ở các mục con. Không dẫn về chương 1.
- **4.7.4:** chỉ ghi **kết quả** (test nào đã chạy, chặn được gì).
- **4.8, 4.9:** **số liệu thật, trình bày bằng bảng**: P@1/3/5 so với ngẫu nhiên, số test pass/tổng. Kèm vài ví dụ truy vấn, ví dụ gõ "lau nha" vẫn ra "Dọn nhà".
- **4.10:** **bảng đối chiếu**, gồm các dòng của Bảng 1.2 và hai cột mới: *Kết quả thực tế* và *Đạt / Một phần / Chưa*. Viết ngắn, không lý giải. Phần lý giải để ở chương 5.
- **Tiểu kết chương 4:** những gì đã đạt, những gì mới đạt một phần → chương 5 lý giải.

### Chương 5. Thảo luận

**Vai trò:** cho thấy nhóm hiểu sản phẩm của mình. **Viết thành đoạn văn, hạn chế gạch đầu dòng.**

- **Đoạn dẫn chương:** chương bàn về ý nghĩa của kết quả ở chương 4.
- **5.1:** không chép lại bảng ở 4.10. Chỉ bàn những dòng *Một phần* hoặc *Chưa*: nguyên nhân, ảnh hưởng.
- **5.2:** mỗi điểm mạnh có **minh chứng**, dẫn tới bảng hoặc hình ở chương 4, ví dụ "(Bảng 4.x)". Không tự khen chung chung.
- **5.3:** đi sâu hơn giới hạn đã nêu ở chương 1. Mỗi hạn chế gồm *nguyên nhân, ảnh hưởng đến người dùng hoặc kết quả, và mức độ*.
- **5.4, phát hiện và quan sát:** **phần thể hiện rõ nhất là nhóm tự làm.** Kể những gì nhóm thật sự gặp, ví dụ: "Ban đầu nhóm gộp dịch vụ và việc làm thành một loại. Khi thử nghiệm giao diện, … nên nhóm tách ra."
- **Tiểu kết chương 5:** điểm mạnh và hạn chế chính → chương 6 đề xuất hướng tiếp theo.

### Chương 6. Kết luận và đề xuất

- **Không có tiểu kết** (bản thân chương đã là kết luận).
- **6.1:** 2–3 đoạn ngắn. **Không tóm tắt lại cả bài.** Trả lời gọn: ba vấn đề ở chương 1 đã được giải quyết đến đâu, kèm 1–2 con số.
- **6.2:** ý nghĩa thực tiễn cho cư dân, người bán nhỏ, người có thời gian rảnh, và ý nghĩa học tập. Không hứa hẹn quá mức.
- **6.3:** **mỗi hướng phát triển ứng với một hạn chế ở 5.3** (6.3.1↔5.3.1, 6.3.2↔5.3.3, 6.3.3↔5.3.4, 6.3.4↔5.3.2). Gọi lại hạn chế bằng **tên**, không bằng số mục.
  > ✓ Để khắc phục việc không gian Bán còn dùng dữ liệu mẫu, bước tiếp theo là…

### Tài liệu tham khảo và Phụ lục

- **APA 7** dùng thống nhất cho cả bài. Trích dẫn nhóm tác giả ghi đủ tên, ví dụ "Google, Temasek và Bain & Company (2026)".
- Mỗi tài liệu trong danh sách phải được trích ít nhất một lần trong bài, và ngược lại.
- Ưu tiên nguồn gốc thay vì trang báo đưa lại.
- Mỗi phụ lục phải được nhắc đến ít nhất một lần trong bài.

---

## 7. Định dạng trong Word (theo style của nhóm)

### 7.1. Tiêu đề

| Style | Cấp | Ví dụ | Vào mục lục |
|---|---|---|---|
| **P1** | Chương, phần đầu và phần cuối | CHƯƠNG 1. GIỚI THIỆU; TÀI LIỆU THAM KHẢO; PHỤ LỤC | Có |
| **P2** | Mục cấp 2 | 1.1. Bối cảnh và lý do chọn đề tài | Có |
| **P3** | Mục cấp 3 | 1.1.1. Bối cảnh thực tế | Có |
| **P4** | Mục cấp 4 (khi thật sự cần) | 4.3.3.1. Hủy đơn và trả hàng | Có (cấp cuối cùng) |
| **P5** | Tiêu đề nhỏ không đánh số, **Tiểu kết chương** | *Tiểu kết chương 1* | **Không** |

- Mục lục **tối đa 4 cấp** (P1–P4). Khi tạo mục lục, chọn *Show levels: 4*.
- Hầu hết các mục **chỉ cần đến P3**. Chỉ dùng P4 khi một mục P3 quá dài và có từ 2 ý con trở lên. **Không** có P4 nào đứng một mình.
- **Không để hai tiêu đề nằm liền nhau** (mục 3.1b).
- Các style "P2 cách", "P3 cách", "p3" và "cách": nhóm thống nhất công dụng và ghi vào đây: ………………………

### 7.2. Bảng, hình, sơ đồ

| Loại | Style tên | Vị trí tên | Đánh số |
|---|---|---|---|
| Bảng | **Bảng** | **Phía trên** bảng | Bảng 1.1, Bảng 1.2… (theo chương) |
| Hình, ảnh giao diện | **Ảnh** | **Phía dưới** hình | Hình 4.1, Hình 4.2… |
| Sơ đồ | **Sơ đồ** | **Phía dưới** sơ đồ | Sơ đồ 3.1… *(hoặc gộp chung số với Hình)* |
| Nội dung trong bảng | **table** | — | — |

- Dùng *Insert Caption* để Word tự tạo các danh mục.
- Đánh số sơ đồ riêng thì phải thêm **Danh mục sơ đồ**. Gộp vào "Hình" thì không cần. **Nhóm chọn một cách:** ………
- Dưới mỗi bảng hoặc hình ghi nguồn: *"Nguồn: Nhóm tổng hợp"*, *"Nguồn: Nhóm thiết kế"*, hoặc trích dẫn nếu lấy từ tài liệu khác.
- Mỗi bảng, hình phải **được nhắc đến trong phần chữ** trước khi xuất hiện, ví dụ "như Bảng 3.2".
- Tên nói rõ nội dung: "Hình 4.5. Màn hình theo dõi đơn hàng phía người mua", không đặt tên "Hình 4.5. Ảnh giao diện".

### 7.3. Nội dung

- Thân bài dùng style **Normal**, không chỉnh font hay cỡ chữ riêng cho từng đoạn.
- Ảnh có alt text do Word tự sinh ("AI-generated content may be incorrect") → **xóa đi**.
- Ghi chú tạm như [CẦN BỔ SUNG: …] thì tô vàng để dễ tìm, và **xóa hết trước khi nộp**.

---

## 8. Quy trình phối hợp

1. Mọi người đọc tài liệu này và **chương 1 (văn mẫu)** trước khi viết.
2. Mỗi người viết **đoạn dẫn chương, câu dẫn mục và tiểu kết** cho phần mình phụ trách. Người viết chương sau đọc tiểu kết của chương trước rồi mới viết đoạn dẫn của chương mình.
3. Viết vào đúng mục được phân công, dùng đúng style.
4. Gặp thuật ngữ mới thì bổ sung vào bảng ở mục 5. Gặp từ viết tắt mới thì báo người làm danh mục.
5. Viết xong thì tự kiểm tra theo **checklist ở mục 9**.
6. **Một người đọc lại toàn bài** để sửa giọng văn, xóa chỗ trùng và rà các câu dẫn chéo. Nên chọn người không viết chương 2.
7. Viết **Tóm tắt** sau cùng, khi đã có số liệu ở chương 4.

---

## 9. Checklist trước khi nộp

**Mạch và nội dung**
- [ ] Ba vấn đề ở chương 1 được theo dõi đủ qua 6 chương (bảng ở mục 1).
- [ ] Bảng 1.2 xuất hiện lại ở 4.10. Mục 5.1 và 6.3 bàn đúng các dòng chưa đạt của bảng.
- [ ] Mỗi chương có đoạn dẫn chương và tiểu kết (trừ chương 6).
- [ ] Không có đoạn nào giải thích cùng một điều ở hai chương.
- [ ] Mọi con số đều có nguồn, hoặc là số nhóm tự đo và nói rõ đo thế nào.
- [ ] Cách trợ lý hoạt động được mô tả giống nhau ở chương 1, 2, 3, 4.
- [ ] Mọi tài liệu trích dẫn có thật và đã được đọc. Không có MDPI, Frontiers, Hindawi.

**Dẫn chéo**
- [ ] Mỗi chương tối đa 2–3 câu dẫn chéo, chưa tính tiểu kết, bảng/hình, phụ lục.
- [ ] Không câu dẫn nào thay cho nội dung người đọc cần ngay tại chỗ.
- [ ] Không dẫn theo số mục kiểu "ở mục 3.2.4". Chỉ dẫn theo chương, bảng, hình hoặc phụ lục.

**Giọng văn**
- [ ] Không có hai tiêu đề nằm liền nhau.
- [ ] Không có chuỗi câu cụt liên tiếp. Các ý liên quan đã được nối lại.
- [ ] Không có câu mở đầu chung chung, không dùng *toàn diện, tối ưu, vượt trội, then chốt, liền mạch*.
- [ ] Ngôi kể thống nhất là "nhóm". Thuật ngữ và tên trạng thái đúng theo mục 5.
- [ ] Chương 2.2, chương 5, chương 6 viết chủ yếu bằng đoạn văn.

**Hình thức**
- [ ] Bìa điền đủ thông tin, năm 2026. Họ tên và MSSV thành viên đúng chính tả.
- [ ] Mục lục và các danh mục do Word tự tạo, mục lục 4 cấp, đã cập nhật lần cuối (*Update Field → Update entire table*).
- [ ] Bảng: tên ở trên. Hình, sơ đồ: tên ở dưới. Có nguồn. Có được nhắc đến trong bài.
- [ ] Trích dẫn theo APA 7. Danh mục từ viết tắt đủ (SPA, API, REST, UI/UX, BPMN, DFD, ERD, CRUD, TF–IDF, kNN, LLM, NT…).
- [ ] Đã xóa alt text tự sinh và tất cả ghi chú [CẦN BỔ SUNG].
