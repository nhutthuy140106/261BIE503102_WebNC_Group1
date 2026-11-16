# -*- coding: utf-8 -*-
# Cập nhật nội dung Chương 3–6 cho khớp hiện trạng (17/11/2026) và thêm các mục mới, không sửa trực tiếp content3/content456.
BR = 'd:\\Năm 1\\WEB2\\docs\\bao-cao\\'
TK = BR + 'hinh-thietke\\'
SG = BR + 'hinh-style-guide\\'
WF = BR + 'hinh-wireframe\\'
SB = lambda n: BR + 'hinh-ban\\' + n + '.png'

# ------------------------------------------------------------------ thay chuỗi con trong đoạn văn / ô bảng
SUB = [
    ('đến ngày 12/11/2026 có 517 commit', 'đến ngày 17/11/2026 có 576 commit'),
    ('Hai giai đoạn cuối chồng lên nhau một phần: nhóm vừa hoàn thiện server vừa vẽ lại các sơ đồ để bảo đảm sơ đồ phản ánh đúng những gì đã làm được và những gì mới dừng ở thiết kế.',
     'Các giai đoạn cuối chồng lên nhau: nhóm vừa hoàn thiện server và khu quản trị, vừa vẽ lại các sơ đồ và viết báo cáo, để bảo đảm tài liệu phản ánh đúng những gì đã làm được và những gì mới dừng ở thiết kế. {F:gantt} thể hiện tiến độ theo ngày.'),
    ('Gần đây nhất, nhóm chuyển tài khoản nhận tiền từ từng bài sang hồ sơ người bán, vì cùng một người bán không nên phải nhập lại số tài khoản ở mỗi bài; phần này mới được chốt ở mức quyết định, việc chuyển dữ liệu còn chờ phía Bán.',
     'Sau đó, nhóm quyết định đưa tài khoản nhận tiền về hồ sơ người bán thay vì để ở từng bài, vì cùng một người bán không nên phải nhập lại số tài khoản ở mỗi bài; server vẫn giữ trường này ở bài trong lúc chuyển đổi, nên việc chuyển hẳn sang hồ sơ người bán chưa hoàn tất.'),
    ('Phía Bán và Đăng việc chưa có module riêng trên server: các thao tác đẩy đơn sang bước kế tiếp, báo phụ thu và chọn người nhận việc hiện nằm ở nhóm API tạm <c>/api/dev</c>, chỉ bật khi không chạy ở môi trường chính thức, để luồng của người mua vẫn kiểm thử được từ đầu đến cuối.',
     'Phía Bán và Đăng việc có module riêng <c>src/modules/seller</c>, gồm đăng và sửa bài, đơn khách đặt, việc đã đăng và đề nghị, xác minh người bán, hồ sơ gian hàng, thống kê và đánh giá. Nhóm API <c>/api/dev</c> chỉ bật khi không chạy ở môi trường chính thức, dùng cho kiểm thử và để tự duyệt hồ sơ xác minh khi chạy thử.'),
    ('Mười bảy module của không gian Mua và Nhận việc', 'Mười tám module của không gian Mua và Nhận việc'),
    ('Schema dùng chung: User, Post, Job, nhật ký quản trị, bộ đếm mã', 'Schema dùng chung: User, Post, Job, nhật ký quản trị, cài đặt hệ thống, bộ đếm mã'),
    ('bao gồm cả những thực thể nhóm mới đề xuất cho phía Bán như xác minh người bán, thay đổi đơn, khiếu nại giao dịch và xác nhận thanh toán. Schema MongoDB đang chạy ở server hiện có 16 collection.',
     'trong đó xác minh người bán đã được cài đặt, còn các thực thể thay đổi đơn, khiếu nại giao dịch và xác nhận thanh toán mới ở mức đề xuất. Schema MongoDB đang chạy ở server hiện có 26 collection, gồm cả hồ sơ gian hàng, lượt xem, theo dõi gian hàng, phiếu hỗ trợ, định nghĩa voucher, thông báo hệ thống, cài đặt và mã OTP.'),
    ('Nhóm cũng nêu rõ phần nào mới ở mức thiết kế, như xác minh người bán và các thực thể phía Bán.',
     'Nhóm cũng nêu rõ phần nào mới ở mức thiết kế, như các thực thể thay đổi đơn, khiếu nại giao dịch và xác nhận thanh toán.'),
    # chương 4
    ('60 bài đang mở gồm đồ ăn', '58 bài đang mở gồm đồ ăn'),
    ('Không gian Bán và Đăng việc hiện chạy bằng dữ liệu mẫu ở client do server chưa có API cho phía này, nên chương này chỉ trình bày không gian Mua và Nhận việc.',
     'Không gian Bán và Đăng việc (mục 4.9) cũng được chụp ở chế độ dữ liệu mẫu vì cùng lý do, dù đã có API thật ở server.'),
    ('Toàn bộ 92 bài thử của server đều đạt khi chạy ngày 14/11/2026, mất khoảng 58 giây.', 'Toàn bộ 145 bài thử của server đều đạt khi chạy ngày 17/11/2026, mất khoảng 38 giây.'),
    ('với 12 bài, kiểm các nội dung ở {T:akt}; các bài này cùng toàn bộ bộ bài thử của server đều đạt khi chạy ngày 15/11/2026.',
     'với 13 bài, kiểm các nội dung ở {T:akt}; các bài này cùng toàn bộ bộ bài thử của server đều đạt khi chạy ngày 17/11/2026.'),
    ('Nhóm đo hai thuật toán trên 60 bài đang mở', 'Nhóm đo hai thuật toán trên 58 bài đang mở'),
    ('Với gõ sai một ký tự, bài đúng nằm trong ba kết quả đầu ở 86,7% đến 96,7% số truy vấn. Hầu hết các truy vấn này (29 hoặc 30 trên 30)',
     'Với gõ sai một ký tự, bài đúng nằm trong ba kết quả đầu ở 92,9% đến 96,4% số truy vấn. Hầu hết các truy vấn này (27 hoặc 28 trên 28)'),
    ('Hai truy vấn bị tính sai là “đi chợ hộ”, nhận được bài “Đi siêu thị hộ” vốn cùng nghĩa nhưng không khớp biểu thức nhóm dùng để chấm, và “dạy kèm”, nhận được một bài đồ ăn không liên quan vì seed không có bài dịch vụ gia sư mà chỉ có một việc làm. Truy vấn thứ hai là lỗi thật: tìm gần đúng nên trả về rỗng thay vì một bài ngẫu nhiên.',
     'Hai truy vấn bị tính sai là “đi chợ hộ”, nhận được bài “Đi siêu thị hộ” vốn cùng nghĩa nhưng không khớp biểu thức nhóm dùng để chấm, và “dạy kèm”. Ở lần đo ngày 14/11, truy vấn thứ hai nhận về một bài đồ ăn không liên quan vì seed không có bài gia sư, và đó là lỗi thật; nhóm đã sửa để tìm gần đúng trả về rỗng khi truy vấn là khái niệm đã biết mà kho không có bài, nên lần đo ngày 17/11 kết quả đã rỗng. Truy vấn này vẫn bị tính sai chỉ vì phép chấm mong có một bài kết quả, trong khi kết quả rỗng ở đây là hành vi đúng.'),
    ('Ở k bằng 3, thuật toán đạt 61,7%, cao hơn khoảng ba lần mức chọn ngẫu nhiên 18,9%', 'Ở k bằng 3, thuật toán đạt 63,2%, cao hơn khoảng 3,4 lần mức chọn ngẫu nhiên 18,7%'),
    ('Precision@k của gợi ý bài tương tự (60 bài seed)', 'Precision@k của gợi ý bài tương tự (58 bài seed)'),
    ('Chương 4 đã cho thấy các luồng phía Mua và nhận việc chạy được và được kiểm bằng 92 bài thử API đều đạt, trong khi tìm kiếm gần đúng và gợi ý bài vượt mức chọn ngẫu nhiên trên dữ liệu seed. Hai phần chưa trọn vẹn là đồng bộ trạng thái giữa hai không gian và đánh giá định lượng gợi ý giá.',
     'Chương 4 đã cho thấy các luồng của ba không gian Mua, Bán và Quản trị chạy được và được kiểm bằng 145 bài thử API đều đạt, trong khi tìm kiếm gần đúng và gợi ý bài vượt mức chọn ngẫu nhiên trên dữ liệu seed. Phần chưa trọn vẹn là đánh giá định lượng gợi ý giá.'),
    ('Hai tiêu chí về tìm kiếm và định giá, cùng tiêu chí về địa chỉ, đều đạt. Tiêu chí về trạng thái ở hai không gian mới đạt một phần, vì mới chỉ chứng minh được ở phía Mua. Phần gợi ý giá, một mục tiêu của vấn đề thứ nhất, chưa có phép đo định lượng nên không được tính vào dòng Đạt.',
     'Các tiêu chí về tìm kiếm, trạng thái ở hai không gian và địa chỉ đều đạt. Riêng tiêu chí trạng thái chỉ đạt khi ứng dụng chạy ở chế độ dữ liệu thật, như đã nêu ở mục 5.1. Phần gợi ý giá, một mục tiêu của vấn đề thứ nhất, chưa có phép đo định lượng nên không được tính vào dòng Đạt.'),
    # chương 5
    ('Phần đầu giải thích những tiêu chí mới đạt một phần,', 'Phần đầu giải thích phần chưa được đo trọn vẹn,'),
    ('người mua chỉ gửi được yêu cầu hủy chứ không tự hủy đơn,', 'người mua chỉ hủy ngay được khi người bán chưa bắt đầu, còn sau đó chỉ gửi được yêu cầu hủy,'),
    ('đăng nhập bằng Google chưa đi qua bước xác minh số điện thoại, và nhóm chưa xác minh danh tính người bán.',
     'đăng nhập bằng Google tuy đã đi qua bước OTP nhưng chưa được nhóm bấm thử đến cùng với một tài khoản Google thật, và việc xác minh người bán mới dừng ở mức quản trị viên duyệt hồ sơ do người bán tự gửi, không đối chiếu với nguồn nào bên ngoài.'),
    ('khi đo lại Precision@k sau khi seed tăng từ 32 lên 60 bài, kết quả giảm từ 96,9% xuống 61,7% ở k bằng 3,',
     'khi đo lại Precision@k sau khi seed tăng từ 32 lên khoảng 60 bài, kết quả giảm từ 96,9% xuống 61,7% (đo ngày 14/11) và 63,2% (đo lại ngày 17/11 trên 58 bài) ở k bằng 3,'),
    ('Chương 5 đã lý giải rằng hai tiêu chí mới đạt một phần xuất phát từ việc phía Bán chưa dùng chung API và từ việc thiếu giá thật để đo gợi ý giá. Điểm mạnh của AntGo nằm ở các ràng buộc nghiệp vụ được cài ở server và tìm kiếm chịu gõ sai, còn hạn chế tập trung ở bốn nhóm: phía Bán, thuật toán chọn tay, xác minh và thanh toán, và kiểm thử giao diện.',
     'Chương 5 đã lý giải rằng tiêu chí trạng thái ở hai không gian chỉ đạt ở chế độ dữ liệu thật và rằng gợi ý giá chưa có giá thật để đo. Điểm mạnh của AntGo nằm ở các ràng buộc nghiệp vụ được cài ở server và tìm kiếm chịu gõ sai, còn hạn chế tập trung ở bốn nhóm: hai chế độ dữ liệu chưa được người dùng thật kiểm chứng, thuật toán chọn tay, xác minh và thanh toán, và kiểm thử giao diện.'),
    ('Tiêu chí về trạng thái ở hai không gian không thể đo đầy đủ khi phía Bán chưa dùng chung API, nên nhóm sẽ báo rõ phần đo được và phần chưa đo được.', 'Tiêu chí về trạng thái ở hai không gian chỉ đo được khi ứng dụng chạy ở chế độ dữ liệu thật, nên nhóm sẽ nêu rõ điều kiện này khi báo kết quả.'),
    # chương 6
    ('ở 86,7% đến 96,7% số truy vấn gõ sai một ký tự, và Precision@3 của gợi ý bài đạt 61,7% so với 18,9% của chọn ngẫu nhiên', 'ở 92,9% đến 96,4% số truy vấn gõ sai một ký tự, và Precision@3 của gợi ý bài đạt 63,2% so với 18,7% của chọn ngẫu nhiên'),
    ('Với theo dõi đơn hàng và công việc, các luồng đặt hàng và nhận việc phía Mua chạy bằng API thật với ràng buộc trạng thái và được kiểm bằng 92 bài thử đều đạt, trong khi việc đồng bộ trạng thái với phía Bán chưa hoàn thành.',
     'Với theo dõi đơn hàng và công việc, các luồng đặt hàng, nhận việc và xử lý phía Bán chạy bằng API thật với ràng buộc trạng thái, dùng chung một kho đơn và được kiểm bằng 145 bài thử đều đạt.'),
    ('và đưa đăng nhập bằng Google qua bước xác minh số điện thoại, đồng thời hoàn thiện quy trình xác minh người bán.', 'đồng thời bổ sung bước đối chiếu giấy tờ với nguồn bên ngoài khi xác minh người bán.'),
    ('nhóm cần sửa lỗi biên dịch của bộ kiểm thử Angular rồi bổ sung kiểm thử thành phần cho các luồng chính,', 'nhóm cần bổ sung kiểm thử thành phần cho các luồng chính,'),
]

# ------------------------------------------------------------------ thay cả đoạn (khớp phần đầu)
PARA = [
    ('Bảng trên mô tả đúng bộ trạng thái đang có trong mã nguồn',
     'Bảng trên mô tả đúng bộ trạng thái đang có trong mã nguồn, gồm mười giá trị: <c>waiting</c>, <c>confirmed</c>, <c>picked</c>, <c>pricing</c>, <c>preparing</c>, <c>delivering</c>, <c>ready</c>, <c>done</c>, <c>cancelled</c> và <c>declined</c>; hai giá trị <c>picked</c> và <c>pricing</c> chỉ dùng cho đơn giặt sấy và sửa chữa phải báo giá sau khi lấy đồ hoặc kiểm tra. Người mua được hủy ngay khi người bán chưa bắt đầu, vì lúc đó chưa có chi phí phát sinh; từ khi người bán đã chuẩn bị, nhóm chỉ cho gửi yêu cầu hủy, vì họ có thể đã mua nguyên liệu hoặc làm xong, và AntGo không giữ tiền nên cũng không tự hoàn tiền. Thời hạn báo vấn đề sau khi hoàn thành là 2 giờ với đồ ăn và 24 giờ với đồ dùng và dịch vụ. Đơn chờ xác nhận quá hạn (10 phút với đồ ăn, 12 giờ với đồ dùng, 2 giờ với dịch vụ) được server tự hủy khi đọc đơn. Phía Bán thao tác trên cùng bộ trạng thái này qua nhóm API <c>/api/seller</c>, nên hai bên luôn thấy cùng một trạng thái.'),
    ('Tiêu chí về trạng thái giống nhau ở hai không gian mới đạt một phần',
     'Tiêu chí về trạng thái giống nhau ở hai không gian được đánh giá Đạt với một điều kiện: ứng dụng phải chạy ở chế độ dữ liệu thật. Từ ngày 14/11, không gian Bán và Đăng việc có module riêng trên server và dùng chung kho đơn, kho đề nghị với phía Mua, nên đơn người mua đặt xuất hiện bên người bán, và mỗi bước xử lý của người bán (xác nhận, chuẩn bị, giao, hoàn thành, chọn người nhận việc) được ghi lên cùng bản ghi mà người mua đang xem. Nhóm kiểm bằng 21 bài thử API của phía Bán và bằng bấm thử trên trình duyệt thật với hai tài khoản: bấm Xác nhận ở phía Bán thì đơn chuyển từ Chờ xác nhận sang Đã xác nhận trên server, và bấm Chọn người thì đề nghị được chọn, đề nghị còn lại bị từ chối và việc đóng. Điều kiện còn lại là chế độ mặc định của ứng dụng vẫn là dữ liệu mẫu để bấm thử khi chưa có server; ở chế độ này hai không gian đọc hai kho mẫu riêng nên chưa đồng bộ, và chưa có cư dân ngoài nhóm chạy hết một vòng ở chế độ dữ liệu thật.'),
    ('Nguyên nhân là phần này do thành viên khác trong nhóm phụ trách',
     'Ứng dụng mặc định chạy bằng dữ liệu mẫu trong trình duyệt và chỉ gọi server thật khi thêm tham số <c>?mock=0</c>. Nguyên nhân là dữ liệu mẫu cho phép cả nhóm làm giao diện khi server chưa sẵn sàng, nhưng hệ quả là mỗi luồng phải cài hai lần, một lần cho dữ liệu mẫu và một lần gọi API, nên hai bản có thể lệch nhau; nhóm đã gặp lỗi chỉ xảy ra ở chế độ thật, như khách chưa đăng nhập bị chuyển về trang đăng nhập vì một lệnh gọi chạy nền cần quyền. Ngoài ra, chế độ dữ liệu thật mới được các thành viên nhóm bấm thử, chưa có cư dân ngoài nhóm chạy hết một vòng, và việc sửa nội dung bài còn hai kiểu, form đầy đủ và sửa nhanh, tùy bài có lưu nguyên dữ liệu form hay không. Mức độ trung bình: luồng đã chạy xuyên suốt hai phía nhưng độ tin cậy chưa được người dùng thật kiểm chứng.'),
    ('Phần kiểm thử tự động mạnh ở server (92 bài thử)',
     'Phần kiểm thử tự động mạnh ở server (145 bài thử) nhưng hẹp ở client: bộ kiểm thử Angular có 226 bài thử trong 34 tệp, chủ yếu kiểm các hàm thuần và service như ánh xạ dữ liệu từ API, đếm ngược, định dạng tiền và tính trạng thái, chứ chưa kiểm tự động từng màn hình, nên giao diện chủ yếu dựa vào việc bấm thử bằng tay và bằng trình duyệt điều khiển tự động ở vài luồng. Ngoài ra, AntGo mới được thử bởi chính các thành viên nhóm, chưa qua thử nghiệm với cư dân thật, và giao diện ưu tiên màn hình máy tính nên chưa được tối ưu cho điện thoại. Ảnh hưởng là các lỗi nhỏ ở giao diện có thể chưa được phát hiện, và người dùng chủ yếu dùng điện thoại sẽ có trải nghiệm kém. Mức độ trung bình.'),
    ('Để khắc phục việc không gian Bán còn dùng dữ liệu mẫu',
     'Để khắc phục việc ứng dụng còn hai chế độ dữ liệu, bước tiếp theo là cho cư dân ngoài nhóm dùng thử ở chế độ dữ liệu thật rồi thu lỗi, sau đó đổi chế độ thật thành mặc định và giữ dữ liệu mẫu chỉ để thử nghiệm. Khi chỉ còn một luồng cài đặt cho mỗi chức năng, nhóm không còn phải duy trì song song hai bản và có thể đo lại tiêu chí trạng thái giống nhau ở hai phía bằng dữ liệu của người dùng thật.'),
]

# ------------------------------------------------------------------ tiêu đề
HEAD = [
    ('5.3.1. Không gian Bán và Đăng việc chưa dùng chung API', '5.3.1. Hai chế độ dữ liệu chưa được người dùng thật kiểm chứng'),
    ('6.3.1. Hoàn thiện không gian Bán và Đăng việc', '6.3.1. Đưa chế độ dữ liệu thật thành mặc định'),
    ('5.3.5. Khu quản trị chưa hoàn chỉnh', '5.3.5. Khu quản trị còn một số hạn chế'),
]

KT_ROWS = [
    ['Luồng đặt đơn, nhận việc, địa chỉ, đã lưu, hội thoại', '8/8', 'Tính tiền ở server, hủy đơn, máy trạng thái việc, địa chỉ chính xác chỉ lộ cho người đã được chọn, tự hoàn thành sau 24 giờ'],
    ['Thao tác của người mua sau khi đặt, hồ sơ', '9/9', 'Hủy ngay hoặc gửi yêu cầu hủy, xác nhận đã nhận, báo vấn đề kèm ảnh, đánh giá, đổi hồ sơ và mật khẩu'],
    ['Báo giá giặt sấy, sửa chữa; theo dõi giao hàng', '6/6', 'Khách duyệt hoặc từ chối giá, đơn hủy giữ nguyên tổng, trạng thái theo dõi đúng người xem'],
    ['Xác thực, giỏ nháp, tải ảnh, gợi ý', '7/7', 'Cookie phiên, chặn NoSQL injection, đăng ký luôn là người dùng thường, giới hạn loại và dung lượng ảnh'],
    ['OTP và khôi phục mật khẩu', '10/10', 'Mã hết hạn, giới hạn số lần gửi và nhập sai, quên mật khẩu không lộ số nào có tài khoản'],
    ['Giới hạn số lần gọi', '2/2', 'Chặn gọi dồn dập vào các API nhạy cảm'],
    ['AntXu, voucher, trò chơi', '10/10', 'Cộng Xu theo quy tắc, voucher dùng một lần, trần lượt chơi mỗi ngày'],
    ['Khuyến mãi theo giờ, combo', '14/14', 'Giá theo khung giờ do server tính, tiết kiệm của combo, trừ kho theo món'],
    ['Chuyển khoản và QR', '3/3', 'Chụp tài khoản người bán vào đơn, không lộ tài khoản ở API công khai'],
    ['Tìm kiếm thông minh, gợi ý giá', '9/9', 'Chịu gõ sai, đồng nghĩa, kết quả rỗng khi không liên quan, độ tin cậy của giá gợi ý'],
    ['Trợ lý và ưu đãi', '23/23', 'Bộ luật trả lời, công cụ gọi được, quay về bộ luật khi không gọi được mô hình'],
    ['Phía Bán: bài đăng, đơn, việc, gian hàng', '21/21', 'Đăng bài theo hợp đồng, chưa xác minh thì bị chặn, xử lý đơn khách đặt, chọn người nhận việc, thống kê và đánh giá tính từ dữ liệu thật'],
    ['Tin nhắn có tệp đính kèm', '4/4', 'Chỉ nhận tệp do server cấp, kiểm loại và dung lượng, tin rỗng bị từ chối'],
    ['Quản trị', '13/13', 'Phân quyền, phân xử đơn, voucher, thông báo, cài đặt, xuất CSV (chi tiết ở {T:akt})'],
    ['Dữ liệu seed', '6/6', 'Số lượng và tính đúng đắn của dữ liệu mẫu'],
]
TS_ROWS = [
    ['Không dấu (hai từ khóa của tên bài)', '52', '—', '96,2% (trong 10 kết quả đầu)'],
    ['Sai ký tự: xóa một chữ', '28', '71,4%', '92,9%'],
    ['Sai ký tự: thay một chữ', '28', '64,3%', '96,4%'],
    ['Gõ lặp nguyên âm kiểu Telex', '28', '82,1%', '96,4%'],
    ['Từ đồng nghĩa (10 truy vấn viết tay)', '10', '8/10', '8/10'],
]
PK_ROWS = [['1', '55,2%', '18,7%'], ['3', '63,2%', '18,7%'], ['5', '64,1%', '18,7%']]


def _walk(o, fn):
    if isinstance(o, str):
        return fn(o)
    if isinstance(o, (list, tuple)):
        t = [_walk(x, fn) for x in o]
        return tuple(t) if isinstance(o, tuple) else t
    return o


def apply(CH3, CH456):
    used = {}

    def fn(s):
        for old, new in PARA:
            if s.startswith(old):
                used[old] = used.get(old, 0) + 1
                return new
        for old, new in HEAD:
            if s == old:
                used[old] = used.get(old, 0) + 1
                return new
        for old, new in SUB:
            if old in s:
                used[old] = used.get(old, 0) + 1
                s = s.replace(old, new)
        return s

    CH3 = [_walk(o, fn) for o in CH3]
    CH456 = [_walk(o, fn) for o in CH456]
    # ---- bảng
    def tbl(ops, key, f):
        for i, o in enumerate(ops):
            if o[0] == 'tbl' and o[1] == key:
                o = list(o); f(o); ops[i] = tuple(o); return
        raise KeyError(key)

    def f_gd(o):
        o[5] = list(o[5]) + [
            ['API phía Bán và số liệu gian hàng', '13–14/11', 'Module server cho phía Bán: đăng và sửa bài, đơn khách đặt, đăng việc, chọn người nhận việc, xác minh người bán, lượt xem, thống kê, đánh giá'],
            ['Khu quản trị', '15–16/11', 'Màn hình và API quản trị: duyệt hồ sơ, báo cáo vi phạm, phân xử đơn, người dùng, voucher, hỗ trợ, thông báo, cài đặt, nhật ký'],
            ['Hoàn thiện giao diện và báo cáo', '16–17/11', 'Chỉnh giao diện phía Mua, giao diện tối cho quản trị, bộ ảnh màn hình, style guide, khung dây và báo cáo']]
    tbl(CH3, 'gd', f_gd)

    def f_tt(o):
        rows = []
        for r in o[5]:
            if r[0] == 'Chờ xác nhận, Đã xác nhận hoặc Đang chuẩn bị':
                rows += [['Chờ xác nhận hoặc Đã xác nhận', 'Hủy ngay kèm lý do; trả lại tồn kho và voucher', 'Người mua', 'Đã hủy'],
                         ['Chờ xác nhận quá hạn', 'Tự hủy khi người bán không xác nhận kịp', 'Hệ thống', 'Đã hủy'],
                         ['Đang chuẩn bị', 'Gửi yêu cầu hủy kèm lý do', 'Người mua', 'Giữ nguyên, yêu cầu chờ người bán']]
            elif r[0] == 'Hoàn thành':
                rows.append(['Hoàn thành', 'Báo vấn đề hoặc xin trả hàng trong thời hạn (đồ ăn 2 giờ, loại khác 24 giờ)', 'Người mua', 'Giữ nguyên, chờ người bán trả lời'])
            elif r[0] == 'Đang chuẩn bị' and r[1] == 'Giao tận nơi':
                rows.append(['Đã xác nhận (giặt sấy, sửa chữa)', 'Lấy đồ hoặc kiểm tra, rồi báo giá; người mua đồng ý hoặc từ chối', 'Người bán, người mua', 'Đã lấy, Chờ duyệt giá, rồi Đang chuẩn bị; từ chối thì Đã hủy'])
                rows.append(r)
            else:
                rows.append(r)
        o[5] = rows
    tbl(CH3, 'ttdon', f_tt)

    def f_sv(o):
        rows = []
        for r in o[5]:
            rows.append(r)
            if r[0] == '<c>src/modules/admin</c>':
                rows.append(['<c>src/modules/seller</c>', 'Không gian Bán và Đăng việc: bài đăng, đơn khách đặt, đề nghị, xác minh người bán, gian hàng, thống kê'])
        o[5] = rows
    tbl(CH3, 'sv', f_sv)

    def f_api(o):
        rows = []
        for r in o[5]:
            if r[0] == 'Quản trị':
                rows.append(['Phía Bán', '<c>/api/seller, /api/shops</c>', 'Bài đăng, việc làm, đơn khách đặt và thao tác xử lý, đề nghị nhận việc, xác minh người bán, gian hàng, giờ mở cửa, thống kê, đánh giá'])
            rows.append(r)
        o[5] = rows
    tbl(CH3, 'api', f_api)
    tbl(CH456, 'kt', lambda o: o.__setitem__(5, KT_ROWS))
    tbl(CH456, 'ts', lambda o: o.__setitem__(5, TS_ROWS))
    tbl(CH456, 'pk', lambda o: o.__setitem__(5, PK_ROWS))

    def f_dc(o):
        rows = []
        for r in o[5]:
            r = list(r)
            if r[2].startswith('Không dấu 94,4%'):
                r[2] = 'Không dấu 96,2%; sai ký tự đúng ở top 3 từ 92,9% đến 96,4%'
            if r[2] == '61,7% so với 18,9%':
                r[2] = '63,2% so với 18,7%'
            if r[0] == 'Theo dõi đơn hàng và công việc':
                r[2] = 'Phía Bán và Mua dùng chung kho đơn; 145 bài thử đạt, và bấm thử bằng trình duyệt thật với hai tài khoản'
                r[3] = 'Đạt'
            rows.append(r)
        o[5] = rows
    tbl(CH456, 'dc', f_dc)

    # ---- chèn mục mới
    def idx(ops, kind, text=None, key=None):
        for i, o in enumerate(ops):
            if o[0] == kind and ((text is not None and o[1] == text) or (key is not None and o[1] == key)):
                return i
        raise KeyError((kind, text, key))

    for j, o in enumerate(CH3):
        if o[0] == 'p' and o[1].startswith('Bảng trên đặt các mốc theo ngày thật'):
            CH3.insert(j + 1, ('fig', 'gantt', TK + 'gantt.png', 'Biểu đồ Gantt tiến độ thực hiện theo lịch sử commit', False))
            break
    else:
        raise KeyError('gantt')
    j = idx(CH3, 'h2', '3.8. Công nghệ và công cụ')
    CH3[j:j] = NEW_37
    j = idx(CH456, 'h2', '4.9. Quản trị')
    CH456[j:j] = NEW_49
    # đánh số lại: Quản trị 4.9 -> 4.10, Đối chiếu 4.10 -> 4.11
    import re
    out = []
    for o in CH456:
        if o[0] in ('h2', 'h3'):
            t = o[1]
            if t.startswith('4.10. Đối chiếu'):
                t = t.replace('4.10.', '4.11.', 1)
            elif t == '4.9. Quản trị':
                t = '4.10. Quản trị'
            o = (o[0], t) + tuple(o[2:])
        out.append(o)
    CH456 = out
    # heading con của Quản trị: chỉ các h3 nằm sau h2 '4.10. Quản trị'
    inadmin = False
    out = []
    for o in CH456:
        if o[0] == 'h2':
            inadmin = o[1].startswith('4.10. Quản trị')
        elif o[0] == 'h3' and inadmin:
            o = (o[0], re.sub(r'^4\.9\.', '4.10.', o[1])) + tuple(o[2:])
        out.append(o)
    CH456 = out
    unused = [k for k in [x[0] for x in PARA] + [x[0] for x in HEAD] + [x[0] for x in SUB] if k not in used]
    assert not unused, unused
    return CH3, CH456


ADMIN_H3_MARK = []

NEW_37 = [
    ('h3', '3.7.3. Sơ đồ trang'),
    ('p', 'Sơ đồ trang ({F:sitemap}) cho thấy AntGo gồm ba khu có đường dẫn và đối tượng riêng. Khu Mua gồm các trang công khai, như trang giới thiệu, trang chủ, tìm kiếm, chi tiết bài và gian hàng, cùng các trang cần đăng nhập như đơn hàng, Messenger, thông báo, hồ sơ và AntXu. Khu Bán và Đăng việc nằm dưới <c>/seller</c> và chỉ mở sau khi người dùng được xác minh người bán. Khu Quản trị nằm dưới <c>/admin</c> với trang đăng nhập riêng, chỉ nhận tài khoản có vai trò quản trị viên hoặc người kiểm duyệt.'),
    ('fig', 'sitemap', TK + 'so-do-trang.png', 'Sơ đồ trang của AntGo gồm ba khu Mua, Bán và Quản trị', False),
    ('p', 'Sơ đồ chỉ liệt kê các trang chính. Trang con, như chi tiết đơn hay đăng bài mới, được vẽ thụt vào dưới trang cha. Nhờ chia khu theo đường dẫn, mỗi nhóm trang là một module Angular tải lười và có guard riêng, nên người dùng thường không tải mã của khu Quản trị.'),
    ('h3', '3.7.4. Bộ nhận diện và style guide'),
    ('p', 'Nhóm viết style guide cho hai giao diện, mỗi giao diện một trang ảnh gồm phông chữ, hệ màu, thành phần mẫu và quy tắc. Với phía Mua và Bán ({F:sg_client}), thương hiệu là chữ AntGo màu cam và linh vật con kiến cưỡi máy bay giấy, dùng trên trang giới thiệu, trang chủ, trạng thái trống và nút trợ lý. Phông chữ gồm ba loại: Bricolage Grotesque cho tiêu đề thương hiệu, Mona Sans cho giao diện và nội dung, JetBrains Mono cho mã đơn và mã voucher. Hệ màu chỉ có một màu nhấn cam con kiến (#D85A1C) trên nền trắng ấm, chữ xanh đen (#22304A) và mảng phụ kem ngả hồng; cam chỉ dành cho nút hành động chính và giá của bài quảng bá, còn các trạng thái dùng màu vàng cho chờ xác nhận, cam cho đang làm, xanh đen cho hoàn thành và đỏ cho đã hủy hoặc lỗi.'),
    ('fig', 'sg_client', SG + 'style-guide-client.png', 'Style guide của phía Mua và Bán', False),
    ('p', 'Các thành phần được giữ ít và nhất quán: nút chính màu cam có ba trạng thái bình thường, rê chuột và vô hiệu, nút phụ viền mảnh, nút nguy hiểm chữ đỏ, nút xanh đen cho bước tiếp tục; ô nhập có viền cam khi đang nhập và viền đỏ kèm dòng báo lỗi nhỏ; bộ lọc dạng viên bấm. Bố cục rộng tối đa 1280 điểm ảnh, lưới bốn cột với khoảng cách 20 điểm ảnh và chỉ có hai kiểu thẻ, thẻ có ảnh cho đồ ăn, đồ dùng và dịch vụ, và thẻ việc làm nền kem. Icon dùng bộ Phosphor có sẵn thay vì tự vẽ.'),
    ('p', 'Khu Quản trị có style guide riêng ({F:sg_admin}) vì là giao diện tối dành cho người vận hành. Nền xanh đen đậm, thẻ kính mờ bo 16 điểm ảnh, một ánh sáng cam mờ ở góc và một màu nhấn cam. Mọi màu là biến CSS có tên bắt đầu bằng <c>--a-</c> khai báo ở một chỗ, nên đổi bảng màu chỉ cần sửa một nơi. Mọi thao tác không hoàn tác được, như ẩn bài hay gửi thông báo, đều đi qua hộp xác nhận và lý do là bắt buộc, vì đây là các thao tác ghi vào nhật ký.'),
    ('fig', 'sg_admin', SG + 'style-guide-admin.png', 'Style guide của khu Quản trị', False),
    ('h3', '3.7.5. Khung dây'),
    ('p', 'Trước khi dựng giao diện, nhóm vẽ khung dây xám cho các màn hình chính để thống nhất bố cục. Khung dây trang chủ ({F:wf_home}) xếp theo thứ tự đã chọn: khối mở đầu với chữ AntGo và linh vật, ô tìm kiếm lớn có giọng nói và ảnh, rồi các khối Nổi bật, Đang giảm giá, Gần bạn, dải Kiếm thêm gần nhà, Việc mới quanh bạn và cuối cùng là lưới Khám phá có bộ lọc theo loại. Mỗi khối là một hàng bốn thẻ để người dùng quét nhanh theo chiều ngang.'),
    ('fig', 'wf_home', WF + 'wf-c-home.png', 'Khung dây trang chủ', False),
    ('p', 'Khung dây trang chi tiết bài ({F:wf_post}) đặt ảnh lớn và dãy ảnh nhỏ bên trái, còn bên phải là nhãn loại bài, tên, điểm đánh giá, giá, ba ô thông tin và khung đặt bước một có nhóm chọn, số lượng, địa chỉ nhận và nút Tiếp tục. Mô tả, thông tin thêm và thẻ người bán nằm dưới ảnh, đánh giá nằm bên phải, cuối trang là bài khác của người bán và bài tương tự trong khu.'),
    ('fig', 'wf_post', WF + 'wf-c-post.png', 'Khung dây trang chi tiết bài', False),
    ('p', 'Khung dây trang tổng quan của khu Quản trị ({F:wf_dash}) có thanh bên chia các mục theo việc cần xử lý, nội dung chính gồm khung Cần xử lý hôm nay với năm ô, sáu thẻ chỉ số và bốn biểu đồ gồm cột, vành khuyên và cột theo ngày. Bố cục này sau đó được giữ gần như nguyên khi dựng giao diện tối ở {F:ad_tq}.'),
    ('fig', 'wf_dash', WF + 'wf-a-dash.png', 'Khung dây trang tổng quan khu Quản trị', False),
    ('p', 'Ngoài các khung dây trên, nhóm còn vẽ khung dây cho trang tìm kiếm, gian hàng, đơn hàng, Messenger và việc làm ở phía Mua, cùng các trang xác minh, báo cáo, đơn, người dùng, voucher, hỗ trợ và cài đặt ở khu Quản trị. Toàn bộ giao diện đã dựng cũng được đưa vào một tệp Figma của nhóm, gồm ba trang Mua, Bán và Admin, để chỉnh sửa và thống nhất thiết kế.'),
]

ADM_NOTE = ''

NEW_49 = [
    ('h2', '4.9. Không gian Bán và Đăng việc'),
    ('p', 'Không gian Bán và Đăng việc dành cho người có thứ để bán hoặc cần người làm việc. Người dùng chuyển sang không gian này bằng công tắc Mua | Bán trên thanh menu, và phải được xác minh người bán trước khi đăng bài hoặc đăng việc. Các ảnh trong mục được chụp ngày 17/11/2026 với tài khoản mẫu Bếp Cô Lan ở chế độ dữ liệu mẫu, cùng lý do như các mục trước. Ở chế độ dữ liệu thật, các màn hình này gọi nhóm API <c>/api/seller</c> và nhóm đã bấm thử các thao tác chính như đã nêu ở mục 5.1.'),
    ('h3', '4.9.1. Trang Hôm nay'),
    ('p', 'Trang Hôm nay là màn hình đầu tiên khi người dùng chuyển sang không gian Bán ({F:b_today}). Thanh menu của khu này có năm mục: Hôm nay, Giao dịch, Bài đăng, Lịch và Hiệu quả. Đầu trang là ảnh đại diện, tên gian hàng Bếp Cô Lan, địa chỉ Block B tầng 5, điểm đánh giá 4,3 từ 3 đánh giá và 86 đơn, kèm ô chọn trạng thái Đang nhận đơn. Bốn thẻ lối tắt cho phép bắt đầu ngay một bài Bán đồ ăn và uống, Bán đồ dùng, Đăng dịch vụ hoặc Đăng việc cần người.'),
    ('p', 'Dải màu kem bên dưới mời người bán dùng AntXu để đưa bài lên mục Nổi bật trong khu, hiện số dư 90 Xu và nút Chọn bài quảng bá. Khung Cần bạn xử lý gom mọi việc đang chờ người bán, có thể lọc theo loại. Mỗi thẻ ghi người liên quan, tên đơn hoặc việc, giờ, mã và số tiền; đơn mới hiện nút Xác nhận và Từ chối cùng đồng hồ đếm ngược thời gian còn lại, còn việc đã đăng hiện số đề nghị và nút Chọn người. Phần dưới trang là lịch hôm nay và các số liệu hiệu quả.'),
    ('fig', 'b_today', SB('b-today'), 'Trang Hôm nay của không gian Bán', False, '', 0.92),
    ('h3', '4.9.2. Trang Giao dịch và chi tiết đơn'),
    ('p', 'Trang Giao dịch ({F:b_orders}) gom đơn khách đặt và việc người bán đã đăng. Bốn tab lọc là Tất cả, Đơn khách đặt, Việc bạn đăng và Lịch sử. Các mục cần xử lý được đặt riêng ở khung Cần bạn xử lý trên cùng, cách trình bày giống danh sách đơn của người mua nhưng nút hành động đổi theo vai người bán, như Xác nhận, Từ chối, Chọn người hay Nhắn tin.'),
    ('fig', 'b_orders', SB('b-orders'), 'Trang Giao dịch của người bán', False, '', 0.85),
    ('p', 'Chi tiết một đơn khách đặt ({F:b_order}) có thanh năm bước Đã gửi, Đã xác nhận, Đang thực hiện, Đang giao và Hoàn thành, bước đã qua có ghi giờ. Bảng Thông tin đơn nêu tên và số điện thoại khách, hình thức nhận, thời gian, món đã chọn và ghi chú; khung Chi tiết thanh toán cộng tiền món với phí giao thành tổng 85.000đ. Cột bên phải cho biết trạng thái Chờ xác nhận, đồng hồ đếm ngược, lời nhắc rằng đơn không được xác nhận trước hạn sẽ tự hủy, các nút Xác nhận và Từ chối, và thẻ khách với nút Nhắn và Gọi.'),
    ('fig', 'b_order', SB('b-order-detail'), 'Chi tiết một đơn khách đặt', False, '', 0.9),
    ('h3', '4.9.3. Chi tiết việc đã đăng'),
    ('p', 'Với việc đã đăng ({F:b_job}), người đăng thấy danh sách người đề nghị, mỗi người có ảnh, điểm đánh giá kèm số việc đã làm, khu, khung giờ làm được và lời giới thiệu, cùng nút Chọn người này và Từ chối. Cột bên phải ghi việc đang mở với số đề nghị, nhắc rằng gửi đề nghị chưa phải là đã nhận việc, và có các nút Đóng nhận đề nghị, Sửa việc và Ghim đầu danh sách bằng 20 Xu. Khi chọn đủ số người cần, các đề nghị còn lại tự chuyển sang Không được chọn.'),
    ('fig', 'b_job', SB('b-job-detail'), 'Chi tiết việc đã đăng và các đề nghị', False, '', 0.9),
    ('h3', '4.9.4. Bài đăng và form đăng bài'),
    ('p', 'Trang Bài đăng ({F:b_posts}) liệt kê bài của người bán theo bốn nhóm Đồ ăn và uống, Đồ dùng, Dịch vụ và Việc làm. Mỗi thẻ cho thấy trạng thái Đang hoạt động, Sắp hết hoặc Tạm ngưng, lượt xem, giá, số đã bán, số còn lại có nút tăng giảm, công tắc Đang mở và nút Quảng bá bằng 30 Xu. Bài hết lịch bán bị khóa kèm dòng nhắc bấm để gia hạn, và bài đang quảng bá hiện nhãn QUẢNG BÁ cùng số ngày còn lại.'),
    ('fig', 'b_posts', SB('b-posts'), 'Trang Bài đăng của người bán', False, '', 0.85),
    ('p', 'Form đăng bài ({F:b_form}) bắt đầu bằng năm thẻ chọn loại: Bán đồ ăn và uống, Đăng combo, Bán đồ dùng, Đăng dịch vụ và Đăng việc cần người; mỗi loại có các khối riêng theo mô hình bảy khối. Với đồ ăn, phần đầu gồm ảnh tối đa sáu ảnh, tên bài, khu vực bán chọn được nhiều khu và mô tả; phần Menu nhập tên món, giá, đơn vị và số lượng, để trống số lượng nghĩa là bán đến khi đóng bài. Cột bên phải hiện trước thẻ bài khách sẽ thấy, và hai nút Lưu nháp và Đăng bài.'),
    ('fig', 'b_form', SB('b-post-form'), 'Form đăng bài mới', False, '', 0.95),
    ('h3', '4.9.5. Trang Hiệu quả'),
    ('p', 'Trang Hiệu quả ({F:b_stats}) cho người bán xem kết quả kinh doanh theo năm mốc thời gian: hôm nay, 7 ngày, 30 ngày, 3 tháng, năm nay hoặc một khoảng tự chọn. Hai thẻ cam ở đầu là tổng tiền đã bán và tổng tiền đã thuê người làm việc, kèm mũi tên tăng giảm so với kỳ trước; bốn chỉ số nhỏ là đơn hoàn thành, lượt xem bài, tỉ lệ đặt và điểm đánh giá. Biểu đồ cột Đã thu theo ngày, khối Thu theo mảng, khối Hành trình khách đi từ xem bài, lưu bài đến đặt đơn, bảng Bài bán chạy và danh sách Việc đã thuê giúp người bán biết bài nào hiệu quả. Ở chế độ dữ liệu thật, các số này được tính từ đơn, lượt xem, đánh giá và người theo dõi thật chứ không lưu cứng.'),
    ('fig', 'b_stats', SB('b-insights'), 'Trang Hiệu quả của người bán', False, '', 0.85),
    ('h3', '4.9.6. Gian hàng và Messenger của người bán'),
    ('p', 'Trang gian hàng của người bán ({F:b_shop}) có ảnh bìa, ảnh đại diện, tên, khu, “Hàng xóm từ 2023” và thời gian trả lời thường gặp, cùng nút Sửa hồ sơ. Năm ô số liệu cho biết điểm đánh giá, số bài đang đăng, đơn đã hoàn thành, lượt xem tuần này và số người theo dõi. Khung Hồ sơ hoàn thiện 3/4 nhắc những mục còn thiếu, như ảnh bìa, và ba tab Đang bán, Việc đang cần người và Đánh giá giúp người bán xem gian hàng như khách thấy, kèm nút Sửa trên từng bài.'),
    ('fig', 'b_shop', SB('b-shop'), 'Trang gian hàng của người bán', False, '', 0.85),
    ('p', 'Messenger phía Bán ({F:b_chat}) dùng chung kho hội thoại với phía Mua, nên một cuộc trò chuyện hiện ở cả hai bên. Cột trái liệt kê cuộc trò chuyện có ô tìm kiếm và bộ lọc Tất cả, Chưa đọc; khung bên phải hiện thẻ đơn đang bàn, như AG-O3024 ở trạng thái Chờ xác nhận, cùng nội dung tin nhắn. Dưới khung có các câu trả lời nhanh như “Đơn đang chuẩn bị, khoảng 15 phút nữa giao”, nút ghi âm, đính kèm tệp, gửi ảnh và nút Gửi. Nhắn tin không tự đổi trạng thái đơn.'),
    ('fig', 'b_chat', SB('b-messenger'), 'Messenger của người bán', False, '', 0.9),
]

APP_NEW = [
    ('h2', 'PHỤ LỤC A. MÃ NGUỒN, TÀI KHOẢN CHẠY THỬ VÀ TÀI LIỆU'),
    ('p', 'Phụ lục này liệt kê nơi lưu mã nguồn, tài liệu và cách chạy thử sản phẩm để người đọc kiểm lại các kết quả ở chương 4.'),
    ('tbl', 'pla', 'Các sản phẩm kèm theo báo cáo', [3000, 6641],
     ['Hạng mục', 'Vị trí'],
     [['Mã nguồn', 'Kho GitHub <c>github.com/nhutthuy140106/261BIE503102_WebNC_Group1</c>, nhánh <c>dev</c>; thư mục <c>client/</c> (Angular), <c>server/</c> (Express, MongoDB), <c>docs/</c>, <c>design/</c>'],
      ['Sơ đồ nguồn', 'Tệp <c>docs/bao-cao/anh-sua.drawio</c> (draw.io, 33 trang gồm use case, BPMN, trạng thái, DFD, ERD) và ảnh PNG đã xuất trong các thư mục <c>hinh-*</c>'],
      ['Thiết kế giao diện', 'Tệp Figma của nhóm (mã tệp <c>5400kTYJUL0uqy8MqnEHYp</c>) gồm ba trang Mua, Bán, Admin; bản mẫu HTML ở <c>design/mockups/</c>'],
      ['Tài liệu kỹ thuật', '<c>docs/post-contract.md</c> (hợp đồng dữ liệu bài đăng), <c>docs/admin.md</c> (khu quản trị), <c>docs/test-server-that.md</c> (hướng dẫn thử với server thật), <c>server/README.md</c>, Swagger tại <c>/api-docs</c>'],
      ['Lệnh đo', '<c>npm test</c> (145 bài thử server), <c>npm run eval:search</c>, <c>npm run eval:recommend</c> trong <c>server/</c>; <c>ng test</c> (226 bài thử) trong <c>client/</c>']],
     'left'),
    ('h3', 'A.1. Cách chạy thử'),
    ('p', 'Cần cài Node.js và MongoDB. Ở thư mục <c>server</c>, chạy <c>npm install</c>, sao chép <c>.env.example</c> thành <c>.env</c> rồi đặt <c>MONGODB_URI</c>, <c>SESSION_SECRET</c> và <c>SEED_PASSWORD</c>; chạy <c>npm run seed</c> để nạp dữ liệu mẫu và <c>npm start</c> để mở server ở cổng 3000. Ở thư mục <c>client</c>, chạy <c>npm install</c> rồi <c>ng serve</c>, và mở <c>http://localhost:4200</c> đúng cổng này vì đăng nhập bằng Google đã khai báo địa chỉ đó. Mặc định ứng dụng dùng dữ liệu mẫu; thêm <c>?mock=0</c> vào địa chỉ để gọi server thật và <c>?mock=1</c> để quay lại dữ liệu mẫu.'),
    ('tbl', 'tkm', 'Tài khoản mẫu sau khi chạy seed', [3000, 2200, 4441],
     ['Vai trò', 'Số điện thoại', 'Ghi chú'],
     [['Người mua', '0900000001', 'Ngọc Thủy'],
      ['Người bán (đã xác minh)', '0900000002', 'Bếp Cô Lan'],
      ['Quản trị viên', '0900000099', 'Đăng nhập ở <c>/admin/login</c>']],
     'left'),
    ('p', 'Mật khẩu của các tài khoản mẫu là giá trị <c>SEED_PASSWORD</c> mà người chạy đặt trong <c>.env</c>. Đây là tài khoản mẫu chỉ dùng để thử, không dùng cho tài khoản thật. Mã OTP chưa gửi qua SMS thật nên được hiện trên màn hình ở môi trường phát triển.'),
]
