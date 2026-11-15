# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT

Chương này trình bày nền tảng để hiểu cách AntGo được thiết kế. Phần đầu chương làm rõ các khái niệm liên quan, các nghiên cứu và sản phẩm có chức năng gần với AntGo, từ đó chỉ ra điểm khác biệt của đề tài. Phần sau trình bày các kỹ thuật được sử dụng để xây dựng hệ thống, gồm Angular, RESTful API với Express, MongoDB, cơ chế phiên đăng nhập, các thuật toán xử lý văn bản và trợ lý kết hợp mô hình ngôn ngữ.

## 2.1. Các khái niệm liên quan

Mục này trình bày ba khái niệm làm nền cho đề tài: nền tảng kết nối nội khu, giao dịch ngang hàng và việc làm ngắn trong cộng đồng, và mô hình phát triển lặp và tăng dần mà nhóm áp dụng.

### 2.1.1. Nền tảng kết nối nội khu

Nền tảng nội khu chỉ phục vụ người sống trong cùng một khu phố, một khu chung cư hay một cộng đồng dân cư. Khác với sàn thương mại điện tử phục vụ cả nước, nền tảng nội khu tận dụng khoảng cách gần và mối quan hệ hàng xóm để người dùng trao đổi thông tin, mua bán và nhờ nhau giúp đỡ. Nextdoor tại Mỹ là ví dụ tiêu biểu của loại nền tảng này (Brown et al., 2024).

Ở mảng mua bán, một số nền tảng chỉ cho phép giao dịch giữa những người sống gần nhau. Chẳng hạn, Karrot tại Hàn Quốc lấy vùng bán kính khoảng 6 km quanh nơi ở làm "khu phố" của mỗi người dùng (Park et al., 2024). Cách giới hạn này giúp việc giao nhận thuận tiện hơn, đồng thời người mua và người bán là người cùng khu nên dễ gặp mặt trực tiếp khi giao dịch.

Trong AntGo, khái niệm này được áp dụng ở mức một khu dân cư: mọi bài đăng đều gắn với khu và block của người đăng, và người dùng mặc định chỉ thấy nội dung trong khu của mình.

### 2.1.2. Giao dịch ngang hàng và việc làm ngắn trong cộng đồng

Phần lớn giao dịch trong một khu diễn ra trực tiếp giữa hai cá nhân, chẳng hạn một người nấu cơm bán cho hàng xóm hay một người bán lại chiếc xe đạp cũ. Ở dạng giao dịch ngang hàng này, nền tảng chỉ làm trung gian kết nối, và vì hai bên thường không phải doanh nghiệp nên niềm tin là điều kiện để giao dịch diễn ra. Niềm tin này gồm hai lớp: niềm tin giữa các thành viên với nhau và niềm tin vào hệ thống mà họ sử dụng (Fedosov et al., 2023). Nền tảng muốn được tin dùng phải xây dựng được cả hai lớp, chẳng hạn bằng thông tin rõ ràng về người bán và quy tắc minh bạch cho từng bước giao dịch.

Bên cạnh mua bán, cư dân còn cần người giúp những việc nhỏ trong thời gian ngắn, như dọn nhà, chuyển đồ hay trông thú cưng. Các nền tảng việc làm ngắn ghép người cần việc với người có thời gian rảnh ở gần đó, tiêu biểu là TaskRabbit tại Mỹ (Guo et al., 2025).

Trong AntGo, đồ ăn, đồ dùng và dịch vụ là giao dịch ngang hàng giữa người bán và người mua, còn việc làm thuộc dạng việc làm ngắn, trong đó người cần việc đăng bài và chọn người nhận trong số các đề nghị gửi đến.

### 2.1.3. Mô hình phát triển lặp và tăng dần

Theo mô hình phát triển tăng dần, hệ thống được xây dựng thành nhiều phiên bản nối tiếp nhau. Mỗi phiên bản bổ sung thêm chức năng cho phiên bản trước, và các hoạt động đặc tả, phát triển và kiểm định được thực hiện đan xen thay vì tách thành những giai đoạn tuần tự như mô hình thác nước (Sommerville, 2016). Nhờ có phiên bản chạy được từ sớm, nhóm phát triển nhận được phản hồi nhanh hơn, và chi phí điều chỉnh khi yêu cầu thay đổi cũng thấp hơn vì lượng phân tích và tài liệu phải làm lại ít hơn.

Mô hình này phù hợp với các hệ thống có yêu cầu thay đổi trong quá trình làm, trong khi các hệ thống có yêu cầu ổn định ngay từ đầu thường hợp với mô hình kế hoạch hóa hơn. Nhược điểm của cách làm tăng dần là tiến độ khó theo dõi nếu không có các mốc bàn giao rõ ràng, và cấu trúc hệ thống dễ xuống cấp nếu không được rà soát lại sau mỗi phiên bản.

Trong AntGo, mỗi vòng lặp hoàn thiện một nhóm chức năng, chẳng hạn luồng đặt hàng hoặc luồng nhận việc, rồi mới chuyển sang nhóm tiếp theo. Mỗi vòng có sản phẩm bàn giao cụ thể để nhóm kiểm tra tiến độ.

## 2.2. Nghiên cứu và sản phẩm liên quan

Mục này tổng hợp các nghiên cứu gần đây có liên quan đến đề tài, so sánh các sản phẩm đang được sử dụng tại Việt Nam và trên thế giới, từ đó xác định điểm khác biệt của AntGo.

### 2.2.1. Nghiên cứu liên quan

Các nghiên cứu về nền tảng nội khu cho thấy loại nền tảng này đã hình thành ở nhiều quốc gia. Tại Mỹ, Nextdoor tập trung ở những khu dân cư có thu nhập và trình độ học vấn cao hơn, và các bài đăng về dịch vụ là loại nội dung xuất hiện nhiều nhất (Brown et al., 2024). Tại Hàn Quốc, người dùng Karrot càng cảm thấy gắn bó với khu phố của mình thì càng hài lòng với giao dịch, và cảm nhận này còn làm giảm tác động tiêu cực của chi phí kinh tế và chi phí thời gian (Park et al., 2024). Bên cạnh đó, một cộng đồng chia sẻ ở quy mô địa phương cần người dùng tin tưởng cả các thành viên khác lẫn hệ thống mà họ sử dụng (Fedosov et al., 2023). Các kết quả này gợi ý rằng giới hạn phạm vi trong một khu có thể là lợi thế, nhưng nền tảng vẫn cần cơ chế rõ ràng để người dùng tin tưởng cả nhau lẫn hệ thống.

Ở mảng việc làm ngắn, nền tảng theo vị trí như TaskRabbit giúp người lao động chuyển sang tự kinh doanh, nhờ chi phí tìm khách thấp hơn và có công cụ đánh giá để thể hiện chất lượng công việc (Guo et al., 2025). Về ngôn ngữ, người dùng tiếng Việt, kể cả người có học vấn cao, thường bỏ dấu và gõ sai chính tả khi nhập liệu, nên hệ thống xử lý văn bản tiếng Việt cần bước tiền xử lý để khôi phục dấu và sửa lỗi trước khi hiểu nội dung (Lam et al., 2023). Điều này củng cố yêu cầu tìm kiếm gần đúng của AntGo, vì cư dân trong khu cũng có thói quen gõ không dấu khi nhắn tin.

Các nghiên cứu trên chủ yếu khảo sát nền tảng đã vận hành ở quy mô lớn tại Mỹ hoặc Hàn Quốc, hoặc chỉ tập trung vào một loại giao dịch. Nhóm chưa tìm thấy nghiên cứu nào xem xét một nền tảng kết hợp mua bán, dịch vụ và việc làm ngắn trong cùng một khu dân cư tại Việt Nam. [CẦN BỔ SUNG: nhóm rà lại sau khi đọc toàn văn các bài]

### 2.2.2. Sản phẩm tham khảo

Tại Việt Nam, nhu cầu mua bán và nhờ việc giữa cư dân hiện được đáp ứng bởi nhiều loại sản phẩm khác nhau, mỗi loại giải quyết một phần nhu cầu. Nhóm Zalo hoặc Facebook của khu dân cư miễn phí và ai cũng dùng được, nhưng không có chức năng đặt đơn hay theo dõi trạng thái. ShopeeFood và GrabFood là hai ứng dụng giao đồ ăn chiếm phần lớn thị trường (The Hanoi Times, n.d.), có quy trình đặt đơn hoàn chỉnh nhưng phục vụ phạm vi cả thành phố và thu phí hoa hồng của người bán theo hợp đồng (Grab, n.d.). Facebook Marketplace ưu tiên hiển thị tin đăng ở gần người dùng và thường không thu phí với giao dịch nhận hàng trực tiếp, nhưng việc trao đổi diễn ra qua tin nhắn riêng và không có trạng thái đơn hàng. bTaskee là ứng dụng đặt lịch giúp việc nhà theo giờ, có quy trình đặt dịch vụ rõ ràng, nhưng người làm là cộng tác viên do nền tảng tuyển chọn chứ không phải cư dân trong khu. Bảng 2.1 tổng hợp sự khác nhau giữa các sản phẩm này và AntGo.

**Bảng 2.1. So sánh AntGo với các sản phẩm tham khảo**

| Tiêu chí | Nhóm Zalo/Facebook của khu | ShopeeFood / GrabFood | Facebook Marketplace | bTaskee | AntGo |
|---|---|---|---|---|---|
| Phạm vi | Một khu | Cả thành phố | Theo khoảng cách | Theo thành phố | Một khu, chia block |
| Loại nội dung | Mọi loại, không phân loại | Đồ ăn và uống | Chủ yếu đồ dùng | Dịch vụ gia đình | Đồ ăn, đồ dùng, dịch vụ, việc làm |
| Đặt đơn và theo dõi trạng thái | Không | Có | Không | Có | Có |
| Người cung cấp | Cư dân | Cửa hàng, quán ăn | Cá nhân | Cộng tác viên của nền tảng | Cư dân trong khu |
| Việc làm ngắn do cư dân đăng | Có, nhưng tin dễ trôi | Không | Không | Không | Có |
| Bảo vệ địa chỉ, số điện thoại | Không | Có | Hạn chế | Có | Có |
| Phí với người bán | Không | Hoa hồng theo hợp đồng | Thường không với giao dịch trực tiếp | Theo chính sách nền tảng | Không |

*Nguồn: Nhóm tổng hợp*

[CẦN BỔ SUNG: nhóm kiểm tra lại từng ô trên ứng dụng thật trước khi nộp, nhất là cột bTaskee và dòng "Bảo vệ địa chỉ"]

### 2.2.3. Điểm khác biệt của AntGo

Từ Bảng 2.1, có thể thấy mỗi sản phẩm hiện có chỉ giải quyết được một phần nhu cầu trong khu. Nhóm chat có đúng phạm vi và đúng người dùng nhưng không có quy trình giao dịch. Ngược lại, các ứng dụng giao đồ ăn và giúp việc có quy trình hoàn chỉnh nhưng phạm vi rộng, người cung cấp là cửa hàng hoặc cộng tác viên chứ không phải hàng xóm, và mỗi ứng dụng chỉ phục vụ một loại nhu cầu.

AntGo khác ở chỗ kết hợp hai điểm mạnh này: giữ phạm vi một khu và người cung cấp là chính cư dân, đồng thời có quy trình đặt đơn và theo dõi trạng thái như một sàn thương mại điện tử. Bên cạnh đó, AntGo gộp bốn loại nội dung vào một tài khoản với hai không gian Mua và Bán, nên một cư dân vừa có thể đặt cơm trưa vừa có thể nhận trông mèo mà không cần chuyển sang ứng dụng khác. Loại bài việc làm, nơi cư dân tự đăng việc cần người làm, là phần mà các sản phẩm trong Bảng 2.1 chưa đáp ứng.

## 2.3. Kiến trúc ứng dụng web và Angular

Mục này trình bày mô hình ứng dụng một trang và các thành phần cơ bản của Angular, framework được dùng để xây dựng giao diện AntGo.

### 2.3.1. Single Page Application

Với website truyền thống, mỗi lần người dùng chuyển trang, trình duyệt phải tải lại toàn bộ trang từ server. SPA làm khác: ứng dụng chỉ tải một trang HTML ban đầu, sau đó dùng JavaScript cập nhật nội dung ngay trong trình duyệt, còn server chỉ trả về dữ liệu, thường ở dạng JSON. Cách làm này giúp thao tác chuyển trang nhanh hơn và tách rõ phần giao diện ở client với phần xử lý dữ liệu ở server.

Trong AntGo, toàn bộ giao diện của hai không gian Mua và Bán là một ứng dụng Angular dạng SPA, giao tiếp với server qua API.

### 2.3.2. NgModule và Component

Component là đơn vị xây dựng giao diện cơ bản trong Angular, gồm một template HTML, phần định dạng CSS và một lớp TypeScript chứa dữ liệu và xử lý của phần giao diện đó (Google, n.d.). NgModule dùng để gom các component, service và cấu hình liên quan thành một nhóm chức năng. Với lazy loading, một module chỉ được tải khi người dùng mở đến chức năng đó, nhờ vậy dung lượng tải ban đầu của ứng dụng nhỏ hơn.

Trong AntGo, mỗi nhóm chức năng lớn như trang chủ, chi tiết bài, đơn hàng, Messenger hay không gian Bán là một feature module tải lười, còn các thành phần dùng lại nhiều nơi như thẻ bài đăng được đặt trong module dùng chung.

### 2.3.3. Binding và control flow

Data binding là cơ chế đồng bộ dữ liệu giữa lớp TypeScript và template. Property binding đưa giá trị từ lớp vào thuộc tính của phần tử HTML, event binding gọi phương thức khi người dùng thao tác, còn two-way binding với `ngModel` giữ cho dữ liệu trên ô nhập và trong lớp luôn giống nhau. Từ các phiên bản gần đây, Angular cung cấp cú pháp control flow `@if`, `@for` và `@switch` ngay trong template để hiển thị có điều kiện và lặp danh sách (Google, n.d.).

Trong AntGo, `@switch` được dùng để hiển thị thẻ bài theo từng loại nội dung, vì đồ ăn, dịch vụ và việc làm cần những thông tin khác nhau trên cùng một vị trí.

## 2.4. Service, Routing và Form trong Angular

Mục này trình bày ba kỹ thuật Angular dùng để tổ chức dữ liệu, điều hướng giữa các màn hình và xử lý biểu mẫu.

### 2.4.1. Service và Dependency Injection

Service là lớp chứa logic không gắn với một giao diện cụ thể, như gọi API hoặc lưu trạng thái dùng chung giữa nhiều component. Angular cung cấp service cho component qua cơ chế Dependency Injection: component chỉ khai báo service mình cần, còn Angular lo việc tạo và cung cấp đối tượng đó (Google, n.d.). Cách làm này giúp component gọn hơn và dễ thay thế nguồn dữ liệu khi cần.

Trong AntGo, mỗi nhóm chức năng có service riêng để gọi API, chẳng hạn service đơn hàng hay service bài đăng, nên các component không phải biết dữ liệu đến từ đâu.

### 2.4.2. Routing, Lazy Loading và Guard

Router của Angular ánh xạ đường dẫn trên trình duyệt với component tương ứng. Route có thể chứa tham số, như mã bài đăng, và query parameter, như từ khóa tìm kiếm hay bộ lọc. Guard là hàm kiểm tra trước khi cho phép vào một route, thường dùng để chặn người chưa đăng nhập hoặc chưa đủ quyền (Google, n.d.).

Trong AntGo, các trang cần đăng nhập như đơn hàng và Messenger được bảo vệ bằng guard xác thực, còn không gian Bán có thêm guard riêng cho người bán.

### 2.4.3. Reactive Forms và Validation

Reactive Forms là cách xây dựng biểu mẫu trong đó cấu trúc form được khai báo trong lớp TypeScript bằng `FormGroup`, `FormControl` và `FormArray`. Mỗi ô nhập có thể gắn validator để kiểm tra dữ liệu, như trường bắt buộc, độ dài hay định dạng (Google, n.d.). Vì form được định nghĩa bằng mã, các biểu mẫu có nhiều khối thay đổi theo lựa chọn của người dùng dễ quản lý hơn.

Trong AntGo, biểu mẫu đăng bài dùng Reactive Forms với các khối thông tin bật theo loại bài, và các ô số điện thoại có validator kiểm tra định dạng.

## 2.5. RESTful API với Node.js và Express

Mục này trình bày nguyên tắc REST và cách Express tổ chức một API theo nguyên tắc đó.

### 2.5.1. Nguyên tắc REST

Theo phong cách kiến trúc REST, mỗi tài nguyên của hệ thống được định danh bằng một URL và được thao tác qua các phương thức HTTP chuẩn (Fielding, 2000). Thông thường, GET dùng để đọc dữ liệu, POST để tạo mới, PUT hoặc PATCH để cập nhật và DELETE để xóa. Mỗi yêu cầu mang đủ thông tin để server xử lý, và kết quả được báo bằng mã trạng thái HTTP: nhóm 2xx cho thành công, 4xx cho lỗi từ phía client và 5xx cho lỗi phía server.

Trong AntGo, các tài nguyên như bài đăng, đơn hàng và đề nghị nhận việc đều có đường dẫn riêng và trả dữ liệu ở dạng JSON.

### 2.5.2. Router, Middleware và Validation

Express là framework web cho Node.js, tổ chức xử lý yêu cầu theo chuỗi middleware (OpenJS Foundation, n.d.). Mỗi middleware nhận yêu cầu, xử lý một việc như kiểm tra đăng nhập hay đọc dữ liệu gửi lên, rồi chuyển cho middleware tiếp theo hoặc trả kết quả. Router cho phép gom các route của cùng một nhóm tài nguyên vào một tệp riêng. Dữ liệu gửi lên được kiểm tra bằng thư viện validation trước khi đi vào phần xử lý nghiệp vụ, để chặn dữ liệu sai định dạng ngay từ đầu.

Trong AntGo, mỗi nhóm tài nguyên có router riêng, các route cần đăng nhập đi qua middleware xác thực, và dữ liệu đầu vào được kiểm tra bằng Zod. [CẦN KIỂM TRA: Zod có trong code bản cuối]

### 2.5.3. Tài liệu API

Tài liệu API mô tả từng endpoint gồm đường dẫn, phương thức, dữ liệu đầu vào và dữ liệu trả về. Swagger, dựa trên đặc tả OpenAPI, cho phép viết tài liệu này ở dạng có cấu trúc và tạo ra trang web để thử gọi endpoint trực tiếp (SmartBear Software, n.d.).

Trong AntGo, tài liệu API được xây dựng bằng Swagger và dùng làm căn cứ chung giữa người làm giao diện và người làm server.

## 2.6. MongoDB và Mongoose

Mục này trình bày mô hình cơ sở dữ liệu tài liệu và cách Mongoose hỗ trợ mô hình hóa dữ liệu trên MongoDB.

### 2.6.1. Document, Collection và Schema

MongoDB lưu dữ liệu thành các document có cấu trúc giống JSON, và các document cùng loại được gom vào một collection (MongoDB, Inc., n.d.). Mỗi document có một khóa `_id` kiểu ObjectId. Vì không bắt buộc cấu trúc cố định, MongoDB phù hợp với dữ liệu có nhiều dạng khác nhau. Mongoose bổ sung lớp schema ở phía ứng dụng, cho phép khai báo kiểu dữ liệu, trường bắt buộc, giá trị mặc định và danh sách giá trị hợp lệ (enum) cho từng trường (Mongoose, n.d.).

Trong AntGo, trạng thái đơn hàng và trạng thái đề nghị nhận việc được khai báo bằng enum, nên server không lưu được trạng thái nằm ngoài danh sách đã định.

### 2.6.2. Quan hệ giữa các collection

MongoDB biểu diễn quan hệ theo hai cách: nhúng dữ liệu con vào trong document cha, hoặc lưu ObjectId tham chiếu tới document ở collection khác. Nhúng phù hợp khi dữ liệu con luôn đi cùng dữ liệu cha, còn tham chiếu phù hợp khi dữ liệu được dùng chung hoặc thay đổi độc lập. Mongoose cung cấp phương thức `populate` để lấy dữ liệu được tham chiếu khi truy vấn (Mongoose, n.d.).

Trong AntGo, đơn hàng tham chiếu tới người mua, người bán và bài đăng, còn các tùy chọn món được nhúng ngay trong bài đăng.

### 2.6.3. CRUD và dữ liệu seed

Mọi thao tác trên dữ liệu đều quy về bốn loại tạo, đọc, cập nhật và xóa, gọi tắt là CRUD, tương ứng với các phương thức HTTP POST, GET, PUT hoặc PATCH và DELETE. Dữ liệu seed là bộ dữ liệu mẫu được nạp sẵn vào cơ sở dữ liệu, dùng để trình diễn và kiểm thử khi chưa có người dùng thật.

Trong AntGo, dữ liệu seed gồm tài khoản, bài đăng, việc làm, đơn hàng và đề nghị ở nhiều trạng thái khác nhau, để mọi luồng đều có dữ liệu kiểm tra.

## 2.7. Cookie, Session và bảo mật

Mục này trình bày cơ chế duy trì đăng nhập bằng cookie và session cùng các biện pháp bảo vệ API.

### 2.7.1. Cookie và Session

HTTP là giao thức không lưu trạng thái, nên server cần một cơ chế để nhận ra các yêu cầu đến từ cùng một người dùng. Với cơ chế session, sau khi người dùng đăng nhập, server tạo một phiên lưu ở phía server và gửi về trình duyệt một cookie chứa mã phiên. Ở các yêu cầu sau, trình duyệt tự gửi kèm cookie này để server tìm lại phiên tương ứng. Cookie được đặt thuộc tính `httpOnly` để JavaScript trên trang không đọc được, giúp hạn chế việc bị đánh cắp phiên qua mã độc chèn vào trang (OWASP Foundation, n.d.-b).

Trong AntGo, session được lưu trong MongoDB, cookie phiên đặt `httpOnly`, và mã phiên được tạo mới sau khi đăng nhập để tránh bị dùng lại mã phiên cũ.

### 2.7.2. Xác thực và phân quyền

Mỗi yêu cầu gửi đến server cần qua hai bước kiểm tra: xác thực để biết người gửi là ai, và phân quyền để biết người đó được làm gì. Ngoài đăng nhập bằng tài khoản và mật khẩu, nhiều ứng dụng cho phép đăng nhập bằng tài khoản Google: Google xác thực người dùng và trả về một mã định danh mà server kiểm tra lại trước khi chấp nhận (Google for Developers, n.d.).

Trong AntGo, người dùng đăng nhập bằng số điện thoại hoặc tài khoản Google, và server chỉ phân hai quyền là người dùng thường và quản trị viên. [CHỜ CODE: đăng nhập Google chạy trọn luồng]

### 2.7.3. Bảo vệ dữ liệu

Mật khẩu không được lưu ở dạng gốc mà được băm bằng thuật toán chậm có muối như bcrypt, để kể cả khi cơ sở dữ liệu bị lộ thì kẻ tấn công cũng khó khôi phục mật khẩu (OWASP Foundation, n.d.-a). Bên cạnh đó, API thường được bảo vệ bằng nhiều lớp: thiết lập header bảo mật, giới hạn nguồn được phép gọi API (CORS), giới hạn số yêu cầu trong một khoảng thời gian để chống dò mật khẩu, kiểm tra định dạng mã định danh trước khi truy vấn và giới hạn dung lượng, loại tệp tải lên.

Trong AntGo, mật khẩu được băm bằng bcrypt, và API chỉ trả dữ liệu riêng tư như đơn hàng hay địa chỉ chính xác của việc làm cho người có quyền xem. [CẦN KIỂM TRA: Helmet, rate limit, giới hạn tệp tải lên có trong code bản cuối]

## 2.8. Tìm kiếm và gợi ý nội dung

Mục này trình bày các kỹ thuật xử lý văn bản làm nền cho tìm kiếm gần đúng và gợi ý bài, cùng các chỉ số dùng để đánh giá kết quả.

### 2.8.1. TF–IDF và Cosine Similarity

Một cách gợi ý phổ biến là đề xuất những bài có nội dung giống với bài người dùng đang xem hoặc đã quan tâm, gọi là gợi ý dựa trên nội dung (Papadakis et al., 2023). Để so sánh nội dung, mỗi bài đăng được biểu diễn thành một vector, trong đó mỗi chiều ứng với một từ. TF–IDF là cách gán trọng số cho từng từ: một từ càng xuất hiện nhiều trong bài nhưng càng ít xuất hiện ở các bài khác thì càng đặc trưng cho bài đó (Manning et al., 2008).

Trọng số TF–IDF của từ *t* trong bài *d* được tính như sau:

> tfidf(t, d) = tf(t, d) × log(N / df(t))

trong đó tf(t, d) là số lần từ *t* xuất hiện trong bài *d*, N là tổng số bài và df(t) là số bài có chứa từ *t*.

Độ tương đồng giữa hai bài được đo bằng cosine của góc giữa hai vector:

> cos(A, B) = (A · B) / (‖A‖ × ‖B‖)

Giá trị càng gần 1 thì hai bài càng giống nhau về nội dung. Cách tiếp cận này không cần lịch sử của người dùng khác, nhưng chỉ dựa trên chữ nên khó nhận ra hai bài cùng ý mà dùng từ khác nhau, và gặp khó khi bài có ít nội dung (Papadakis et al., 2023).

Trong AntGo, TF–IDF và cosine được dùng để gợi ý các bài tương tự với bài người dùng đang xem.

### 2.8.2. Tìm kiếm gần đúng

Tìm kiếm khớp chính xác chỉ trả về bài có đúng chuỗi người dùng gõ, nên thất bại khi người dùng gõ không dấu, gõ sai hoặc dùng từ khác với người đăng. Tìm kiếm gần đúng khắc phục điều này bằng ba bước. Thứ nhất, chuẩn hóa văn bản: chuyển về chữ thường và bỏ dấu tiếng Việt, để "lau nha" và "lau nhà" được xem là một. Thứ hai, mở rộng truy vấn bằng từ đồng nghĩa, để "lau nhà" cũng tìm được bài ghi "dọn nhà". Thứ ba, so khớp gần đúng bằng khoảng cách Levenshtein, tức số thao tác chèn, xóa hoặc thay ký tự ít nhất để biến chuỗi này thành chuỗi kia (Levenshtein, 1966). Ví dụ, khoảng cách giữa "giặt" và "giạt" là 1, nên một lỗi gõ nhẹ vẫn được chấp nhận.

Việc người dùng Việt Nam thường bỏ dấu và gõ sai khi nhập liệu đã được ghi nhận trong nghiên cứu về trợ lý ảo tiếng Việt (Lam et al., 2023), cho thấy bước chuẩn hóa là cần thiết với ứng dụng có người dùng Việt Nam.

Trong AntGo, hệ thống tìm khớp chính xác trước, và chỉ khi không có kết quả mới chuyển sang tìm bằng từ đồng nghĩa và khoảng cách Levenshtein.

### 2.8.3. [CHỜ CHỐT: Gợi ý giá bằng kNN, hoặc Phát hiện bài trùng lặp và bài đáng ngờ]

*Phương án A, nếu giữ gợi ý giá:*

Thuật toán kNN dự đoán giá trị cho một điểm mới dựa trên k điểm giống nó nhất trong dữ liệu đã có. Với bài toán gợi ý giá, hệ thống tìm k bài cùng loại có nội dung gần nhất với bài đang soạn, rồi lấy trung vị có trọng số theo độ tương đồng của giá các bài đó làm mức giá tham khảo. Trung vị được dùng thay cho trung bình để một vài bài có giá bất thường không kéo lệch kết quả.

*Phương án B, nếu thay bằng phát hiện bài đáng ngờ:*

Phát hiện bài trùng lặp dựa trên độ tương đồng cosine giữa các vector TF–IDF: hai bài có độ tương đồng vượt một ngưỡng được xem là trùng lặp. Phát hiện bài đáng ngờ dùng cách chấm điểm theo các dấu hiệu bất thường, như chứa số điện thoại hoặc đường dẫn ra ngoài, giá lệch xa so với trung vị của các bài cùng danh mục, hoặc chứa từ khóa thường gặp trong tin lừa đảo. Bài có tổng điểm cao được đưa lên đầu danh sách để quản trị viên xem xét.

### 2.8.4. Chỉ số đánh giá

Kết quả gợi ý và phát hiện được đánh giá bằng các chỉ số của lĩnh vực truy hồi thông tin (Manning et al., 2008). Precision@k là tỉ lệ bài phù hợp trong k bài được gợi ý đầu tiên:

> Precision@k = (số bài phù hợp trong k bài đầu) / k

Với bài toán phát hiện, Precision cho biết trong các bài hệ thống đánh dấu, bao nhiêu bài thật sự có vấn đề, còn Recall cho biết trong các bài thật sự có vấn đề, hệ thống tìm ra được bao nhiêu:

> Precision = TP / (TP + FP)  Recall = TP / (TP + FN)

trong đó TP là số bài đánh dấu đúng, FP là số bài đánh dấu nhầm và FN là số bài có vấn đề nhưng bị bỏ sót. Để kết quả có ý nghĩa, các chỉ số được so sánh với một phương án đơn giản làm mốc, như chọn ngẫu nhiên.

Trong AntGo, Precision@3 là tiêu chí đánh giá gợi ý bài đã đặt ra ở chương 1.

## 2.9. Trợ lý tư vấn kết hợp

Mục này trình bày cách kết hợp bộ luật với mô hình ngôn ngữ lớn để xây dựng một trợ lý vừa ổn định vừa linh hoạt.

### 2.9.1. Bộ trả lời theo luật

Bộ trả lời theo luật nhận diện câu hỏi bằng từ khóa hoặc mẫu câu đã định sẵn, rồi trả lời bằng dữ liệu lấy trực tiếp từ hệ thống. Cách làm này nhanh, không tốn chi phí gọi dịch vụ ngoài và luôn cho kết quả giống nhau với cùng một câu hỏi, nhưng chỉ xử lý được những câu nằm trong các mẫu đã định.

Trong AntGo, các câu quen thuộc như hỏi món ăn hay tra đơn hàng được bộ luật xử lý trực tiếp.

### 2.9.2. Mô hình ngôn ngữ và gọi công cụ

Mô hình ngôn ngữ lớn hiểu được câu hỏi tự do, nhưng có thể trả lời sai khi cần thông tin cụ thể mà nó không có, như danh sách món đang bán trong khu. Cơ chế tool calling khắc phục điều này: mô hình được cung cấp danh sách các hàm, tự quyết định khi nào cần gọi hàm nào với tham số gì, rồi dùng kết quả trả về để soạn câu trả lời. Mô hình ngôn ngữ có thể học cách tự gọi công cụ bên ngoài qua API, và nhờ đó cải thiện rõ rệt ở các tác vụ cần tra cứu thông tin chính xác (Schick et al., 2023).

Trong AntGo, mô hình ngôn ngữ được cung cấp các công cụ tìm bài, xem đơn hàng và chọn món, nên câu trả lời luôn dựa trên dữ liệu thật của khu.

### 2.9.3. Cơ chế dự phòng

Vì mô hình ngôn ngữ chạy trên dịch vụ bên ngoài, trợ lý có thể không hoạt động khi thiếu khóa truy cập, hết hạn mức hoặc dịch vụ gặp sự cố. Cơ chế dự phòng cho phép hệ thống tự chuyển sang phương án khác theo thứ tự ưu tiên, để người dùng vẫn nhận được câu trả lời, dù có thể kém linh hoạt hơn.

Trong AntGo, khi không gọi được mô hình ngôn ngữ, trợ lý tự quay về bộ trả lời theo luật.

**Tiểu kết chương 2**

Chương 2 đã làm rõ khái niệm nền tảng nội khu, giao dịch ngang hàng và việc làm ngắn, đồng thời cho thấy các sản phẩm hiện có mới chỉ đáp ứng từng phần nhu cầu của cư dân trong một khu. Chương cũng trình bày các kỹ thuật được dùng để xây dựng AntGo, từ Angular, Express và MongoDB đến cơ chế phiên đăng nhập, các thuật toán xử lý văn bản và trợ lý kết hợp. Trên cơ sở đó, chương 3 trình bày cách nhóm áp dụng các kỹ thuật này vào phân tích yêu cầu và thiết kế hệ thống AntGo.

---

## TÀI LIỆU THAM KHẢO (phần của chương 2)

Brown, M. A., Sanderson, Z., Graham, S., Kim, M., Tucker, J. A., & Messing, S. (2024). Digital town square? Nextdoor's offline contexts and online discourse. *Journal of Quantitative Description: Digital Media, 4*. https://doi.org/10.51685/jqd.2024.icwsm.2

Fedosov, A., Zavolokina, L., Krumhard, S., & Huang, E. M. (2023). "This could be the day I die": Unpacking interpersonal and systems trust in a local sharing economy community. In *Extended Abstracts of the 2023 CHI Conference on Human Factors in Computing Systems*. Association for Computing Machinery. https://doi.org/10.1145/3544549.[CẦN BỔ SUNG: tra số DOI đầy đủ trên dl.acm.org]

Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* [Doctoral dissertation, University of California, Irvine]. https://ics.uci.edu/~fielding/pubs/dissertation/top.htm

Google. (n.d.). *Angular documentation*. https://angular.dev

Google for Developers. (n.d.). *Verify the Google ID token on your server side*. https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

Grab. (n.d.). *Become a GrabFood partner merchant*. https://www.grab.com/vn/en/merchant/food/

Guo, X., Cheng, Z. A., & Pavlou, P. A. (2025). Skill-biased technical change, again? Online gig platforms and local employment. *Information Systems Research, 36*(3), 1354–1374. https://doi.org/10.1287/isre.2022.0307

Lam, K. N., Nguy, L. H., Le, V. L., & Kalita, J. (2023). A transformer-based educational virtual assistant using diacriticized Latin script. *IEEE Access, 11*, 90094–90104. https://doi.org/10.1109/ACCESS.2023.3307635

Levenshtein, V. I. (1966). Binary codes capable of correcting deletions, insertions, and reversals. *Soviet Physics Doklady, 10*(8), 707–710.

Manning, C. D., Raghavan, P., & Schütze, H. (2008). *Introduction to information retrieval*. Cambridge University Press.

MongoDB, Inc. (n.d.). *MongoDB documentation*. https://www.mongodb.com/docs/

Mongoose. (n.d.). *Mongoose documentation*. https://mongoosejs.com/docs/

OpenJS Foundation. (n.d.). *Express documentation*. https://expressjs.com

OWASP Foundation. (n.d.-a). *Password storage cheat sheet*. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

OWASP Foundation. (n.d.-b). *Session management cheat sheet*. https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

Papadakis, H., Papagrigoriou, A., Kosmas, E., Panagiotakis, C., Markaki, S., & Fragopoulou, P. (2023). Content-based recommender systems taxonomy. *Foundations of Computing and Decision Sciences, 48*(2), 211–241. https://doi.org/10.2478/fcds-2023-0009

Park, J., Lee, M., & Kim, H. Y. (2024). The neighborhood advantage: Exploring the impact of negotiation costs on transaction satisfaction in local second-hand trading platforms. *Fashion and Textiles, 11*, Article 22. https://doi.org/10.1186/s40691-024-00386-8

Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Hambro, E., Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). Toolformer: Language models can teach themselves to use tools. *Advances in Neural Information Processing Systems, 36*, 68539–68551. https://doi.org/10.52202/075280-2997

SmartBear Software. (n.d.). *Swagger documentation*. https://swagger.io/docs/

Sommerville, I. (2016). *Software engineering* (10th ed.). Pearson.

The Hanoi Times. (n.d.). *ShopeeFood, GrabFood hold sway in Vietnam's food delivery market*. https://hanoitimes.vn/shopeefood-grabfood-hold-sway-in-vietnam-s-food-delivery-market.763967.html
