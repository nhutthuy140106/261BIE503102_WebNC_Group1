// Hoạt động "đã dùng lâu" cho dữ liệu mẫu: thêm đánh giá cho bài và đề nghị nhận việc cho việc làm, để web nhìn như có người dùng thật.
// Dùng ở seeds/seed.js (cuối seed) và scripts/add-activity.js (thêm vào DB đang chạy, chạy lại không nhân đôi).
// Khóa theo TIÊU ĐỀ bài / việc và TÊN người dùng — không phụ thuộc id, nên dùng được cho cả DB đã có.
// Đánh giá: [người đánh giá, số sao, nhận xét, số ngày trước, phản hồi người bán?]. Chỉ dùng tài khoản mẫu, không bao giờ là chính người bán.

const REVIEWS = {
  /* ---------- Đồ ăn ---------- */
  'Cơm nhà làm, thực đơn đổi mỗi ngày': [
    ['Chị Hoa', 5, 'Hôm nào cũng đổi món nên ăn cả tuần không ngán. Canh nấu vừa miệng, cơm nóng.', 12],
    ['Anh Tuấn', 4, 'Phần hơi ít với mình, lần sau lấy thêm trứng. Giao đúng giờ trưa.', 17],
    ['Thu Hà', 5, 'Đặt cho cả văn phòng nhỏ 4 phần, ai cũng khen. Cô Lan còn dặn ít muối giúp mẹ mình.', 25, 'Cảm ơn Hà nhé, lần sau cô nấu nhạt hơn cho mẹ con.'],
  ],
  'Phở bò tái, nước dùng hầm xương': [
    ['Chị Ngân', 5, 'Nước dùng trong, ngọt xương, bò tái còn hồng. Đúng vị quán phở lâu năm.', 9],
    ['Quốc Anh', 4, 'Ngon, giao đến hơi nguội một chút nhưng nước còn nóng sau khi hâm lại.', 20],
    ['Minh Khoa', 5, 'Mình đặt sáng cuối tuần, bánh phở mềm không nát. Sẽ đặt tiếp.', 31, 'Quán cảm ơn bạn Khoa, sáng cuối tuần quán nấu nhiều hơn nên nước đậm hơn đó.'],
  ],
  'Mì xào hải sản': [
    ['Minh', 4, 'Hải sản tươi, mì giòn không bị mềm. Hơi nhiều dầu nên mình dặn ít dầu lần sau.', 6],
    ['Phương', 5, 'Tôm mực nhiều, vừa miệng. Một phần ăn no cho hai người lớn nhỏ.', 15],
    ['Chị Hoa', 3, 'Ngon nhưng giao hơi chậm so với giờ hẹn, mì để lâu bị dính.', 23, 'Hôm đó quán đông, quán xin lỗi bạn và sẽ giao sớm hơn.'],
  ],
  'Đậu sốt cà chua': [
    ['Thu Hà', 5, 'Đậu chiên giòn vẫn thấm sốt, ăn với cơm trắng rất đưa cơm.', 8],
    ['Anh Tùng', 4, 'Món đơn giản mà ngon, hơi chua hơn mình quen nhưng vẫn ổn.', 19],
  ],
  'Salad ức gà': [
    ['Chị Hoa', 5, 'Ức gà mềm không khô, sốt mè thơm. Mình ăn kiêng nên rất hợp.', 5],
    ['Chị Ngân', 4, 'Rau tươi giòn, phần ăn gọn. Mong có thêm lựa chọn sốt ít béo.', 14],
  ],
  'Cà phê sữa đá': [
    ['Anh Tùng', 5, 'Đậm vị cà phê, không quá ngọt. Mỗi sáng mình đặt một ly.', 4],
    ['Minh Khoa', 4, 'Ngon, đá giữ lạnh tốt dù giao xa. Ly đóng kín không đổ.', 13],
    ['Quốc Anh', 5, 'Đúng gu cà phê phin truyền thống. Có thể đặt thêm ít đường.', 22],
  ],
  'Trà sữa trân châu đường đen': [
    ['Chị Hoa', 5, 'Trân châu dẻo, đường đen thơm, trà đậm. Uống không bị gắt.', 3],
    ['Thu Hà', 4, 'Ngon nhưng mình chọn 100% đường thấy hơi ngọt, lần sau chọn 70%.', 11],
  ],
  'Cà phê hạt rang mộc': [
    ['Anh Tùng', 5, 'Hạt rang vừa, thơm, pha máy hay phin đều ngon. Gói chắc chắn.', 7],
    ['Minh Khoa', 4, 'Chất lượng tốt cho giá này. Mong có thêm gói 250g.', 18],
    ['Quốc Anh', 5, 'Mua tặng bố mình, bố khen. Có van một chiều giữ mùi.', 27],
  ],
  'Nước ép cam tươi': [
    ['Phương', 5, 'Cam vắt tươi thật, không có vị nước đường. Uống mát và thơm.', 4],
    ['Chị Hoa', 4, 'Hơi nhiều đá, lần sau mình dặn ít đá. Cam ngọt tự nhiên.', 9],
    ['Anh Tuấn', 5, 'Giao nhanh, vẫn lạnh. Mình đặt cho cả nhà uống sau bữa trưa.', 16],
  ],
  'Sữa chua nếp cẩm tự làm': [
    ['Chị Ngân', 5, 'Sữa chua mịn, chua nhẹ, nếp cẩm dẻo. Con mình ăn hết hũ.', 6],
    ['Thu Hà', 5, 'Ít ngọt đúng ý mình. Hũ thủy tinh đẹp, trả lại quán được.', 14],
  ],
  'Bánh flan caramel hộp 4 cái': [
    ['Chị Hoa', 5, 'Flan mềm mịn, caramel đắng nhẹ. Hộp quà đẹp, mình mang đi biếu.', 5],
    ['Minh', 4, 'Ngon, hơi ngọt với người ăn nhạt. Giao còn lạnh.', 12],
    ['Anh Tuấn', 5, 'Mua sinh nhật cho vợ, cả nhà ăn hết sạch. Sẽ đặt lại.', 21, 'Cảm ơn anh, chúc chị sinh nhật vui nhé!'],
  ],
  'Bánh mì que pate nhà làm': [
    ['Minh', 5, 'Vỏ giòn, pate thơm béo, ăn nóng rất ngon. Mình ghé lấy mỗi sáng.', 3],
    ['Thu Hà', 4, 'Ngon, nhân hơi ít hơn so với ảnh nhưng giá mềm.', 10],
    ['Anh Tùng', 5, 'Bánh mì nướng giòn lúc nhận, đúng kiểu bánh mì que Hải Phòng.', 19],
  ],
  'Cháo sườn sáng, nấu mỗi ngày': [
    ['Chị Ngân', 5, 'Cháo nhừ, sườn mềm, hành phi thơm. Ăn sáng ấm bụng.', 6],
    ['Quốc Anh', 4, 'Ngon, mong có thêm quẩy tặng kèm. Giao đúng giờ.', 15],
  ],
  'Xôi mặn sáng, đủ topping': [
    ['Minh Khoa', 5, 'Xôi dẻo, chà bông và hành phi nhiều. Phần đầy đặn, no tới trưa.', 4],
    ['Phương', 4, 'Ngon, hơi khô một chút nếu để lâu. Nên ăn ngay.', 11],
    ['Chị Hoa', 5, 'Hôm nào cũng đặt, cô nấu ổn định, không bao giờ nhạt.', 20],
  ],
  'Bún bò Huế cay vừa': [
    ['Quốc Anh', 5, 'Nước dùng đúng vị mắm ruốc, cay vừa. Giò heo mềm.', 5],
    ['Minh', 4, 'Ngon nhưng mình ăn cay nên dặn thêm ớt. Nước đóng riêng nên bún không nhũn.', 13],
    ['Thu Hà', 5, 'Tô lớn đầy đặn, chả cua thơm. Đáng tiền.', 24],
  ],
  'Bún chả Hà Nội, nem rán giòn': [
    ['Anh Tùng', 5, 'Thịt nướng thơm khói than, nem rán giòn lâu. Nước chấm đúng kiểu Hà Nội.', 7],
    ['Chị Hoa', 4, 'Ngon, giao đến vẫn còn nóng. Rau sống hơi ít.', 16],
  ],
  'Cơm chay thập cẩm': [
    ['Chị Ngân', 5, 'Món chay đa dạng, đậu hũ chiên giòn, canh nấm ngọt. Mẹ mình ăn rất hợp.', 8],
    ['Phương', 4, 'Ngon, gạo lứt hơi cứng với mình nhưng tốt cho sức khỏe.', 17],
  ],
  'Bowl rau củ healthy, giao trưa': [
    ['Phương', 5, 'Rau tươi, sốt vừa ăn. Ăn xong không bị nặng bụng.', 5],
    ['Anh Tuấn', 4, 'Ổn, mong có thêm protein. Đóng hộp gọn và sạch.', 14],
  ],
  'Tiệm xôi Yuumi - Nhận đơn đồ ăn sáng 29/10': [
    ['Minh', 5, 'Xôi nóng, nhiều topping, giá hợp lý cho bữa sáng.', 6],
    ['Thu Hà', 5, 'Đặt trước 7 giờ, 8 giờ có xôi tận tay. Rất tiện cho nhân viên văn phòng.', 15],
    ['Chị Ngân', 4, 'Ngon, hơi nhiều dầu hành nên mình dặn bớt lần sau.', 22],
  ],
  'Canh chua cá': [
    ['Chị Hoa', 5, 'Canh chua vừa, cá tươi không tanh. Ăn với cơm nóng rất ngon.', 10],
  ],
  'Cơm gà kho gừng': [
    ['Minh Khoa', 5, 'Gà kho thấm, gừng thơm, cơm nóng. Chuẩn cơm mẹ nấu.', 9],
    ['Thu Hà', 4, 'Ngon, hơi mặn với mình. Phần gà nhiều.', 18],
  ],
  'Cơm sườn rim': [
    ['Quốc Anh', 5, 'Sườn rim mềm, mặn ngọt vừa, hành phi thơm. Đáng tiền.', 8],
    ['Chị Ngân', 5, 'Phần cơm đầy, sườn dày thịt. Sẽ đặt lại.', 21],
  ],
  'Combo bữa trưa nhà làm: cơm + đậu sốt cà chua + bánh flan': [
    ['Anh Tuấn', 5, 'Combo vừa đủ ăn trưa, có cả tráng miệng. Rẻ hơn mua lẻ.', 6],
    ['Phương', 4, 'Ngon, tiện đặt một lần. Mong đổi món theo ngày.', 14],
  ],
  'Combo bữa tối gia đình: 3 món + canh': [
    ['Chị Hoa', 5, 'Đặt cho gia đình 4 người, món đủ đầy, canh nóng. Tiện lúc đi làm về muộn.', 11],
    ['Minh Khoa', 5, 'Ba món cân bằng mặn rau, canh vừa. Cả nhà khen.', 24, 'Cảm ơn bạn, tối thứ sáu có món mới đó ạ.'],
  ],
  'Combo cơm trưa 5 ngày, đặt cả tuần': [
    ['Thu Hà', 5, 'Đặt cả tuần cho khỏi nghĩ trưa nay ăn gì. Món đổi mỗi ngày, giao đúng giờ.', 13],
    ['Anh Tùng', 4, 'Tiện lợi, giá mềm. Hai ngày đầu hơi chậm, sau đó đúng giờ.', 26],
  ],
  'Combo hai người: phở bò tái + bún chả': [
    ['Anh Tuấn', 5, 'Hai người hai món khác nhau, ai cũng vừa. Giá tốt hơn gọi lẻ.', 7],
    ['Chị Ngân', 4, 'Ngon cả hai món, giao hơi lâu một chút.', 17],
  ],
  'Combo giải khát: cà phê sữa đá + trà sữa trân châu': [
    ['Chị Hoa', 5, 'Hai ly đóng riêng, đá không bị tan loãng. Combo hợp lý.', 5],
    ['Minh Khoa', 4, 'Ngon, trân châu dẻo. Giao nhanh trong khu.', 12],
  ],
  'Combo sáng no bụng: xôi mặn + cháo sườn + 2 bánh mì que': [
    ['Quốc Anh', 5, 'Đặt cho cả nhà bữa sáng, ăn no tới trưa. Rất tiện.', 6],
    ['Minh', 5, 'Ba món đều ngon, bánh mì giòn. Rẻ hơn mua riêng.', 16],
  ],

  /* ---------- Đồ dùng (hàng đã bán xong có 1 đánh giá; hàng còn bán một lần thì chưa có) ---------- */
  'Bếp từ đơn Sunhouse, còn bảo hành': [
    ['Chị Hoa', 5, 'Bếp đúng như mô tả, còn bảo hành, mặt kính sạch. Người bán nhiệt tình hướng dẫn.', 9],
  ],
  'Bộ hộp cơm inox ×6': [
    ['Phương', 5, 'Hộp inox dày, nắp kín, mang cơm trưa không bị chảy nước. Rất đáng tiền.', 10],
    ['Anh Tùng', 4, 'Chắc chắn, nặng hơn mình nghĩ. Giao nhanh.', 20],
  ],
  'Rau củ sạch theo combo': [
    ['Chị Hoa', 5, 'Rau tươi như mới hái, nhiều hơn mình nghĩ. Giao trong buổi sáng.', 4],
    ['Minh', 4, 'Tươi, sạch. Mong có thêm lựa chọn rau gia vị.', 13],
    ['Quốc Anh', 5, 'Mình đặt đều mỗi tuần, chất lượng ổn định.', 25],
  ],

  /* ---------- Dịch vụ ---------- */
  'Combo dọn nhà 3 buổi, giảm 15%': [
    ['Chị Ngân', 5, 'Đặt 3 buổi cho đỡ lẻ tẻ, giá hời hơn. Nhà sạch bóng, không sót góc.', 12],
    ['Minh Khoa', 4, 'Làm kỹ, có buổi hơi trễ nhưng báo trước.', 28],
  ],
  'Combo giặt sấy 4 lần trong tháng': [
    ['Phương', 5, 'Đặt gói tháng rất tiện, lấy trả đúng lịch. Quần áo thơm và gấp gọn.', 10],
    ['Anh Tuấn', 4, 'Giá tốt, hơi tiếc là chưa đổi lịch linh hoạt được.', 23],
  ],
  'Cắt tóc nam tại nhà': [
    ['Anh Tuấn', 5, 'Cắt gọn, đúng kiểu mình muốn, dọn sạch tóc vụn. Rất tiện không phải ra tiệm.', 6],
    ['Quốc Anh', 4, 'Ổn, làm nhanh 30 phút. Mong có thêm kiểu tóc để chọn.', 15],
    ['Anh Tùng', 5, 'Dụng cụ sạch, có khử khuẩn. Sẽ gọi lại.', 29, 'Cảm ơn anh, lần sau anh nhắn trước để em xếp lịch sớm nhé.'],
  ],
  'Dắt chó đi dạo buổi chiều': [
    ['Chị Ngân', 5, 'Bạn dắt chó nhà mình đi dạo đúng giờ, có gửi ảnh. Chó về mệt nhưng vui.', 5],
    ['Thu Hà', 5, 'Cẩn thận, nhặt phân đàng hoàng. Chó nhà mình quen rất nhanh.', 14],
  ],
  'Dọn nhà theo giờ': [
    ['Chị Ngân', 5, 'Dọn kỹ, lau sàn bóng, bếp và nhà tắm sạch. Làm nhanh.', 6],
    ['Thu Hà', 4, 'Ổn, đến đúng giờ. Mình có thể nhờ thêm lau cửa kính.', 18],
  ],
  'GIẶT SẤY JALY: GIAO NHẬN TẬN TOÀ - TRẢ LUÔN TRONG NGÀY': [
    ['Phương', 5, 'Trả trong ngày thật, quần áo sạch thơm. Tiện cho người đi làm.', 7],
    ['Minh', 4, 'Giao nhận đúng hẹn. Có một áo còn vết nhỏ nhưng giặt lại miễn phí.', 19, 'Cảm ơn bạn, mong bạn thông cảm, tiệm đã xử lý lại cho áo đó.'],
  ],
  'Giao nhận hộ trong khu': [
    ['Chị Hoa', 5, 'Nhờ lấy hộ gói hàng ở cổng, 15 phút là có. Giá hợp lý.', 4],
    ['Anh Tuấn', 4, 'Nhanh, nhắn tin rõ ràng. Mong thêm tùy chọn gửi ảnh khi giao.', 12],
  ],
  'Giặt hấp đồ vest': [
    ['Anh Tuấn', 5, 'Vest được hấp phẳng, không bóng vải. Mặc đi họp rất lịch sự.', 9],
    ['Quốc Anh', 5, 'Làm kỹ phần cổ áo, trả đúng hẹn hai ngày.', 22],
  ],
  'Giặt sấy gấp, lấy và trả tận cửa': [
    ['Phương', 5, 'Lấy và trả đúng hẹn, đồ thơm và gấp ngay ngắn.', 6],
    ['Chị Hoa', 4, 'Ổn, tính tiền minh bạch theo kg khi cân. Hơi chậm một ngày so với dự kiến.', 16],
  ],
  'Giặt sấy gấp, lấy và trả tận cửa trong ngày': [
    ['Chị Ngân', 5, 'Lấy buổi sáng, chiều có đồ, quá nhanh. Giặt sạch và thơm.', 7],
    ['Thu Hà', 4, 'Dịch vụ tốt, mong cân đồ trước mặt mình khi lấy.', 17],
    ['Minh Khoa', 5, 'Dùng nhiều lần rồi, ổn định, nhân viên lịch sự.', 30],
  ],
  'Làm móng tay, sơn gel tại nhà': [
    ['Chị Hoa', 5, 'Sơn đều, gel bền, bạn làm nhẹ tay không đau. Mẫu vẽ đẹp.', 5],
    ['Thu Hà', 5, 'Làm tại nhà rất tiện, dụng cụ sạch, mùi nhẹ. Sẽ đặt tiếp.', 13],
    ['Chị Ngân', 4, 'Đẹp, bền hơn một tuần. Hơi lâu một chút vì mình chọn vẽ họa tiết.', 24],
  ],
  'Lấy đồ hộ, giao nhận trong khu': [
    ['Chị Hoa', 5, 'Nhờ lấy đồ ở bưu cục gần khu, bạn đi giúp rất nhanh.', 8],
    ['Anh Tùng', 4, 'Ổn, có báo trước khi đến. Giá hợp lý.', 18],
  ],
  'Nấu cơm gia đình': [
    ['Chị Ngân', 5, 'Cô nấu đúng khẩu vị miền Nam, canh ngọt, thịt kho thấm. Cả nhà ăn ngon.', 9],
    ['Thu Hà', 5, 'Cô đi chợ và nấu tại nhà mình, bếp dọn sạch sau khi xong.', 21, 'Cô cảm ơn Hà nhé, lần sau Hà báo trước để cô đi chợ chọn đồ ngon.'],
  ],
  'Nấu cơm theo tuần': [
    ['Minh Khoa', 5, 'Đặt tuần đầu thấy ổn, món đổi mỗi ngày, giao đúng giờ hẹn.', 14],
  ],
  'Nấu cỗ tại nhà': [
    ['Chị Ngân', 5, 'Nấu cỗ cho 8 người, món đẹp mắt, vị ngon. Dọn bếp sạch sau khi xong.', 20, 'Cảm ơn gia đình đã tin tưởng cô.'],
    ['Quốc Anh', 5, 'Cô lên thực đơn rất hợp ý, đi chợ và nấu chu đáo. Khách khen nhiều.', 33],
  ],
  'Sửa laptop, điện thoại — kiểm tra tận nơi': [
    ['Quốc Anh', 5, 'Thợ đến kiểm tra tận nhà, báo giá rõ ràng, sửa nhanh trong 1 giờ.', 8],
    ['Chị Ngân', 4, 'Sửa ổn, báo giá hợp lý. Phí kiểm tra được trừ vào tiền sửa như đã nói.', 19],
    ['Minh', 5, 'Máy mình bị chậm, bạn dọn và nâng RAM giúp. Chạy mượt hơn hẳn.', 30],
  ],
  'Tắm và cắt tỉa lông thú cưng tại nhà': [
    ['Chị Ngân', 5, 'Bé chó nhà mình rất sợ tắm nhưng bạn làm nhẹ nhàng, lông mềm thơm.', 7],
    ['Thu Hà', 5, 'Cắt tỉa đẹp, tắm sấy kỹ, mèo nhà mình không bị stress.', 18],
  ],
  'Vệ sinh máy lạnh': [
    ['Chị Hoa', 5, 'Thợ làm kỹ, rửa dàn lạnh, kiểm tra gas. Máy mát hơn hẳn.', 10],
    ['Chị Ngân', 4, 'Làm sạch, đến đúng giờ. Phải đợi hơi lâu vì máy nhiều bụi.', 22],
    ['Minh Khoa', 5, 'Giá hợp lý, thợ giải thích rõ tình trạng máy.', 34],
  ],
  'Đi siêu thị hộ, giao tận cửa': [
    ['Chị Hoa', 5, 'Bạn chọn rau củ tươi y như mình dặn, gửi ảnh hóa đơn rõ ràng.', 6],
    ['Anh Tùng', 4, 'Tiện lúc bận, bạn mua đúng danh sách. Giao nhanh.', 15],
  ],
  'Điện lạnh Gia Hân - nhận vệ sinh và sửa chữa các thiết bị điện': [
    ['Anh Tuấn', 5, 'Thợ đến đúng hẹn, sửa nhanh, báo giá trước khi làm.', 11],
    ['Phương', 4, 'Làm ổn, có bảo hành. Mong báo giờ đến chính xác hơn.', 25],
  ],
};

// Đề nghị nhận việc: [người làm, tên việc, lời giới thiệu, các bước [trạng thái, số giờ trước]]
const OFFERS = [
  ['Chị Hoa', 'Lấy giúp phần cơm ở cổng sau', 'Mình ở ngay cổng sau, lấy cơm giúp bạn trong 5 phút.', [['offered', 9]]],
  ['Anh Tuấn', 'Dọn phòng cuối tuần', 'Mình đã dọn phòng cho vài hộ trong khu, có máy hút bụi mini, sáng thứ Bảy làm được.', [['offered', 14]]],
  ['Thu Hà', 'Dọn phòng cuối tuần', 'Mình rảnh cả cuối tuần, làm kỹ phần bếp và nhà tắm.', [['offered', 12], ['rejected', 8]]],
  ['Minh Khoa', 'Khiêng giúp tủ lạnh lên tầng 5', 'Mình khỏe, có dây đai khiêng đồ, rủ thêm bạn nữa nên nhanh.', [['offered', 20]]],
  ['Quốc Anh', 'Khiêng giúp tủ lạnh lên tầng 5', 'Mình từng khiêng nhiều đồ nặng trong khu, có xe đẩy hàng.', [['offered', 18]]],
  ['Chị Hoa', 'Kèm Toán lớp 8, 2 buổi mỗi tuần', 'Mình từng kèm Toán cấp 2 cho các bạn trong khu, có tài liệu bài tập theo chương.', [['offered', 27]]],
  ['Phương', 'Kèm Toán lớp 8, 2 buổi mỗi tuần', 'Mình mới tốt nghiệp sư phạm, buổi tối rảnh hai buổi mỗi tuần.', [['offered', 22]]],
  ['Minh', 'Dắt chó đi dạo buổi tối', 'Mình nuôi chó nên hiểu cách dắt an toàn, tối nào cũng rảnh sau 6 giờ.', [['offered', 16]]],
  ['Phương', 'Dắt chó đi dạo buổi tối', 'Mình thích chó, quen đi dạo trong khu, có thể gửi ảnh khi dắt.', [['offered', 11]]],
  ['Anh Tùng', 'Dắt chó đi dạo buổi tối', 'Mình tập thể dục buổi tối trong khu nên tiện dắt chó cùng.', [['offered', 7]]],
  ['Chị Ngân', 'Phát tờ rơi quán mới trong khu', 'Mình nhiệt tình, quen nhiều hộ trong khu nên phát nhanh.', [['offered', 13]]],
  ['Minh', 'Phát tờ rơi quán mới trong khu', 'Mình có sẵn túi và đi bộ nhiều trong khu mỗi ngày.', [['offered', 10]]],
  ['Thu Hà', 'Chụp ảnh sản phẩm tại nhà', 'Mình có đèn softbox và nền chụp, từng chụp đồ ăn cho vài quán nhỏ.', [['offered', 26]]],
  ['Quốc Anh', 'Chụp ảnh sản phẩm tại nhà', 'Mình dùng máy ảnh mirrorless, chỉnh màu cơ bản, giao ảnh trong ngày.', [['offered', 21]]],
  ['Chị Hoa', 'Dạy tiếng Anh giao tiếp cho bé lớp 3', 'Mình dạy bé theo bài hát và trò chơi nên bé dễ hứng thú.', [['offered', 31]]],
  ['Phương', 'Nấu giúp bữa tối cho 4 người', 'Mình nấu ăn gia đình quen tay, đi chợ hộ được nếu bạn cần.', [['offered', 15]]],
  ['Cô Ba', 'Nấu giúp bữa tối cho 4 người', 'Cô nấu cơm gia đình nhiều năm, món Bắc Nam đều làm được.', [['offered', 12]]],
  ['Anh Tuấn', 'Lắp giúp tủ quần áo IKEA', 'Mình có bộ dụng cụ đầy đủ, đã lắp tủ IKEA nhiều lần, khoảng 2 tiếng là xong.', [['offered', 17]]],
  ['Minh Khoa', 'Lắp giúp tủ quần áo IKEA', 'Mình lắp đồ nội thất thạo, có thể đến trong tối nay.', [['offered', 8]]],
  ['Quốc Anh', 'Mua thuốc cho người bệnh', 'Mình ở gần nhà thuốc cổng A, đi ngay được và gửi hóa đơn.', [['offered', 5]]],
  ['Minh', 'Mua thuốc cho người bệnh', 'Mình rảnh ngay bây giờ, mua xong sẽ nhắn bạn trước khi giao.', [['offered', 4]]],
  ['Anh Tùng', 'Cần người giao cơm trưa 11:00–12:00', 'Mình đi xe máy, giao trong khu nhanh, đúng khung giờ trưa.', [['offered', 19]]],
  ['Phương', 'Cần người giao cơm trưa 11:00–12:00', 'Mình rảnh khung trưa các ngày trong tuần, có túi giữ nhiệt.', [['offered', 14]]],
  ['Thu Hà', 'Dọn bếp cuối tuần', 'Mình dọn bếp kỹ, có sẵn dụng cụ tẩy dầu mỡ.', [['offered', 22]]],
  ['Chị Ngân', 'Dọn bếp cuối tuần', 'Mình làm cẩn thận, ưu tiên khu bếp và hút mùi.', [['offered', 16]]],
  ['Minh Khoa', 'Phụ bếp nấu cỗ 8 người', 'Mình biết sơ chế, rửa rau, thái thịt, hỗ trợ cô suốt buổi.', [['offered', 24]]],
  ['Chị Hoa', 'Phụ bếp nấu cỗ 8 người', 'Mình từng phụ bếp ở nhà hàng nhỏ, làm nhanh và gọn.', [['offered', 18]]],
];

// Bài quảng bá (Nổi bật trong khu) và Giờ vàng thêm cho trang chủ đông hơn — khớp client/public/datasets/posts.json
const PROMOTED_TITLES = ['Phở bò tái, nước dùng hầm xương', 'Cà phê sữa đá', 'Trà sữa trân châu đường đen', 'Dọn nhà theo giờ', 'Tắm và cắt tỉa lông thú cưng tại nhà', 'Cơm nhà làm, thực đơn đổi mỗi ngày', 'Bowl rau củ healthy, giao trưa', 'Giặt sấy gấp, lấy và trả tận cửa trong ngày'];
const ALL_DAY = ['00:00', '23:59'];
const gold = (value, from, to) => ({ kind: 'percent', value, from, to, days: [0, 1, 2, 3, 4, 5, 6], active: true });
const DEALS = {
  'Dọn nhà theo giờ': gold(10, ...ALL_DAY),
  'Tắm và cắt tỉa lông thú cưng tại nhà': gold(15, ...ALL_DAY),
  'Đậu sốt cà chua': gold(10, ...ALL_DAY),
  'Cà phê hạt rang mộc': gold(8, ...ALL_DAY),
  'Giặt hấp đồ vest': gold(10, ...ALL_DAY),
  'Combo cơm trưa 5 ngày, đặt cả tuần': gold(12, ...ALL_DAY),
  'Cơm gà kho gừng': gold(8, ...ALL_DAY),
  'Nấu cơm gia đình': gold(10, ...ALL_DAY),
  'Cơm sườn rim': gold(10, ...ALL_DAY),
  'Vệ sinh máy lạnh': gold(10, ...ALL_DAY),
  'Combo bữa tối gia đình: 3 món + canh': gold(15, ...ALL_DAY),
};

/**
 * Thêm đánh giá + đề nghị vào DB đang kết nối (idempotent: đánh giá có targetId cố định theo tiêu đề+người; đề nghị trùng thì bỏ qua).
 * Trả { reviews, offers, skipped }. dryRun = chỉ đếm.
 */
async function addActivity({ dryRun = false } = {}) {
  const crypto = require('crypto');
  const mongoose = require('mongoose');
  const User = require('../modules/shared/user.model');
  const Post = require('../modules/shared/post.model');
  const Job = require('../modules/shared/job.model');
  const Review = require('../modules/buyer/review/review.model');
  const offerService = require('../modules/buyer/offer/offer.service');
  const Offer = require('../modules/buyer/offer/offer.model');

  const DAY = 86400000; const HOUR = 3600000;
  const users = await User.find({ status: 'active' });
  const byName = new Map();
  for (const x of users) if (!byName.has(x.name)) byName.set(x.name, x); // trùng tên (tài khoản thật) → lấy tài khoản đầu = tài khoản mẫu
  const out = { reviews: 0, offers: 0, orders: 0, skipped: [] };

  /* Đánh giá */
  const posts = await Post.find({}).select('title seller');
  const postByTitle = new Map(posts.map((p) => [p.title, p]));
  const { REVIEWS_MORE } = require('./activity-more');
  const allReviews = {};
  for (const src of [REVIEWS, REVIEWS_MORE]) for (const [t, l] of Object.entries(src)) allReviews[t] = [...(allReviews[t] || []), ...l];
  for (const [title, list] of Object.entries(allReviews)) {
    const post = postByTitle.get(title);
    if (!post) { if (list.length) out.skipped.push(`bài: ${title}`); continue; }
    for (const [who, rating, comment, daysAgo, reply] of list) {
      const reviewer = byName.get(who);
      if (!reviewer || String(reviewer._id) === String(post.seller)) { out.skipped.push(`${title} / ${who}`); continue; }
      if (await Review.exists({ reviewer: reviewer._id, post: post._id })) continue; // mỗi người chỉ đánh giá một bài một lần (cũng làm chạy lại không nhân đôi)
      const targetId = new mongoose.Types.ObjectId(crypto.createHash('md5').update(`${title}|${who}`).digest('hex').slice(0, 24));
      const at = new Date(Date.now() - daysAgo * DAY);
      const doc = { reviewer: reviewer._id, target: post.seller, targetType: 'order', targetId, post: post._id, rating, comment, images: [], createdAt: at, updatedAt: at, __v: 0 };
      if (reply) doc.reply = { text: reply, at: new Date(at.getTime() + 6 * HOUR) };
      if (dryRun) { out.reviews++; continue; }
      const r = await Review.collection.updateOne({ targetType: 'order', targetId }, { $setOnInsert: doc }, { upsert: true });
      if (r.upsertedCount) out.reviews++;
    }
  }

  /* Đề nghị nhận việc (tạo qua service để kiểm luật thật, rồi dựng lịch sử trạng thái) */
  const jobs = await Job.find({});
  const jobByTitle = new Map(jobs.map((j) => [j.title, j]));
  for (const [who, jobTitle, intro, steps] of OFFERS) {
    const worker = byName.get(who); const job = jobByTitle.get(jobTitle);
    if (!worker || !job || job.status !== 'open' || String(job.poster) === String(worker._id)) { out.skipped.push(`việc: ${jobTitle} / ${who}`); continue; }
    if (await Offer.exists({ job: job._id, worker: worker._id })) { out.skipped.push(`việc: ${jobTitle} / ${who} (đã có đề nghị)`); continue; }
    if (dryRun) { out.offers++; continue; }
    try {
      const x = await offerService.create(worker, String(job._id), { intro, slots: [] });
      const history = steps.map(([state, hoursAgo]) => ({ state, at: new Date(Date.now() - hoursAgo * HOUR) }));
      await Offer.collection.updateOne({ _id: x._id }, { $set: { state: steps[steps.length - 1][0], history, createdAt: history[0].at, updatedAt: history[history.length - 1].at } });
      out.offers++;
    } catch (e) { out.skipped.push(`việc: ${jobTitle} / ${who} (${e.message})`); }
  }
  /* Lịch sử giao dịch: mỗi đánh giá mẫu trỏ tới một ĐƠN đã hoàn thành có thật (cùng id), để "đã bán", doanh thu, thống kê Hiệu quả có số thật */
  const { nextCode } = require('../modules/shared/counter.model');
  const Order = require('../modules/buyer/order/order.model');
  const { PostView, ShopFollow, dayKey } = require('../modules/seller/engagement.model');
  const Shop = require('../modules/seller/shop.model');
  const hash = (str) => { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const postById = new Map((await Post.find({}).select('title price unit images type seller fulfillmentModes payMethods deliveryFee')).map((p) => [String(p._id), p]));
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const sellerNameOf = (p) => (userById.get(String(p.seller)) || {}).name || '';
  // Mốc thời gian của đơn lịch sử (cố định theo id): rải trong 56 ngày, nghiêng về gần đây; đánh giá đến sau khi đơn xong
  const timing = (id) => {
    const h = hash(String(id));
    const ageDays = Math.floor(56 * ((h % 1000) / 1000) ** 1.35);
    const d = new Date(Date.now() - ageDays * DAY);
    d.setHours(8 + ((h >> 3) % 12), (h >> 5) % 60, 0, 0);
    if (d.getTime() > Date.now() - 40 * 60000) d.setDate(d.getDate() - 1); // giờ ngẫu nhiên rơi vào tương lai → lùi sang hôm trước (không dồn về "bây giờ")
    const done = d;
    const lastStep = 4 + (h % 6);
    const placed = new Date(done.getTime() - lastStep * 25 * 60000);
    // đánh giá đến sau khi đơn xong 3–42 giờ; nếu chưa tới lúc đó thì rải đều giữa lúc xong và bây giờ (không dồn cùng một phút)
    const span = Math.max(0, Date.now() - 5 * 60000 - done.getTime());
    const reviewAt = new Date(done.getTime() + Math.min((3 + (h % 40)) * HOUR, span * (0.3 + (h % 70) / 100)));
    return { h, placed, done, reviewAt, lastStep };
  };
  const historyOf = (fulfillment, t) => {
    const last = fulfillment === 'delivery' ? 'delivering' : 'ready';
    return [['waiting', 0], ['confirmed', 1], ['preparing', 2], [last, 3], ['done', t.lastStep]].map(([state, n]) => ({ state, at: new Date(t.placed.getTime() + n * 25 * 60000) }));
  };
  let ordersMade = 0;
  for (const r of await Review.find({ targetType: 'order', post: { $ne: null } }).select('reviewer target targetId post createdAt').lean()) {
    if (await Order.exists({ _id: r.targetId })) continue;
    const post = postById.get(String(r.post));
    const buyer = userById.get(String(r.reviewer));
    if (!post || !buyer) continue;
    if (dryRun) { ordersMade++; continue; }
    const t = timing(r.targetId);
    const h = t.h;
    const qty = 1 + (h % 7 === 0 ? 1 : 0);
    const modes = post.fulfillmentModes && post.fulfillmentModes.length ? post.fulfillmentModes : ['pickup'];
    const fulfillment = modes[h % modes.length];
    const fee = fulfillment === 'delivery' ? post.deliveryFee || 0 : 0;
    const total = post.price * qty + fee;
    const history = historyOf(fulfillment, t);
    await Order.collection.insertOne({
      _id: r.targetId, code: await nextCode('order', 'AG-O'), buyer: buyer._id, seller: r.target, post: post._id,
      snapshot: { title: post.title, type: post.type, image: post.images[0], sellerName: sellerNameOf(post), sellerAvatar: null, unitPrice: post.price, unit: post.unit },
      quantity: qty, selections: [], answers: [], fulfillment,
      address: fulfillment === 'delivery' ? { name: buyer.name, phone: buyer.phone, block: buyer.area, unit: '', note: '', label: 'home' } : undefined,
      utensils: false, note: '', payment: (post.payMethods || []).includes('transfer') && h % 3 === 0 ? 'transfer' : 'cash',
      breakdown: { items: post.price * qty, deliveryFee: fee, discount: 0, surcharge: 0, promoSaved: 0 }, total,
      state: 'done', history, reviewed: true, sample: true, createdAt: t.placed, updatedAt: t.done, __v: 0,
    });
    ordersMade++;
  }
  out.orders = ordersMade;
  if (!dryRun) {
    for (const [title, list] of Object.entries(allReviews)) {
      for (const [who] of list) {
        const targetId = new mongoose.Types.ObjectId(crypto.createHash('md5').update(`${title}|${who}`).digest('hex').slice(0, 24));
        const ord = await Order.collection.findOne({ _id: targetId });
        if (!ord) continue;
        const t = timing(targetId);
        await Order.collection.updateOne({ _id: targetId }, { $set: { createdAt: t.placed, updatedAt: t.done, history: historyOf(ord.fulfillment, t), sample: true } });
        const rv = await Review.collection.findOne({ targetType: 'order', targetId });
        if (rv) await Review.collection.updateOne({ _id: rv._id }, { $set: { createdAt: t.reviewAt, updatedAt: t.reviewAt, ...(rv.reply && rv.reply.text ? { 'reply.at': new Date(t.reviewAt.getTime() + 6 * HOUR) } : {}) } });
      }
    }
  }

  /* Lượt xem bài 60 ngày gần nhất (bài càng nhiều đánh giá càng nhiều người xem) + người theo dõi + hồ sơ gian hàng của người bán mẫu */
  const reviewsPerPost = new Map();
  for (const r of await Review.find({ targetType: 'order', post: { $ne: null } }).select('post').lean()) reviewsPerPost.set(String(r.post), (reviewsPerPost.get(String(r.post)) || 0) + 1);
  const ops = [];
  for (const p of postById.values()) {
    const base = 2 + (reviewsPerPost.get(String(p._id)) || 0) * 2;
    for (let age = 0; age < 60; age++) {
      const d = new Date(Date.now() - age * DAY);
      const count = Math.max(1, Math.round((base * (1 + (hash(`${p._id}${age}`) % 5))) / (1 + age / 40)));
      ops.push({ updateOne: { filter: { post: p._id, date: dayKey(d) }, update: { $setOnInsert: { seller: p.seller, count } }, upsert: true } });
    }
  }
  if (!dryRun && ops.length) await PostView.collection.bulkWrite(ops, { ordered: false });

  const fans = users.filter((u) => u.role !== 'admin' && /^09000000\d\d$/.test(u.phone));
  const KIND = { food: 'Đồ ăn nhà làm', goods: 'Đồ dùng còn tốt', service: 'Dịch vụ tại nhà' };
  const BIO = {
    food: 'Nấu và bán đồ ăn nhà làm cho hàng xóm trong khu: nguyên liệu tươi mỗi ngày, ít dầu, nêm vừa miệng. Đặt trước giờ nhận đơn là kịp bữa.',
    goods: 'Nhượng lại đồ dùng trong nhà còn tốt, mô tả đúng tình trạng, cho xem và thử trước khi mua. Ưu tiên hàng xóm cùng khu để giao nhận tiện.',
    service: 'Nhận làm dịch vụ tại nhà cho hàng xóm trong khu: đúng hẹn, báo giá rõ trước khi làm, làm xong dọn gọn.',
  };
  const BIO_OF = {
    'Bếp Cô Lan': 'Cô nấu cơm nhà mỗi ngày cho mấy cháu đi làm trong khu: ít dầu, nêm vừa, rau luộc theo mùa. Thực đơn ngày mai cô đăng vào buổi tối, đặt trước 10:30 là kịp trưa.',
    'Giặt sấy Mỹ Linh': 'Giặt sấy gấp, lấy và trả tận cửa trong khu Vinhomes. Cân trước mặt khách, tính giá minh bạch, đồ nhạy cảm giặt riêng.',
    'Tiệm Sạch Thơm': 'Tiệm giặt sấy và rau củ sạch cho cư dân Vinhomes Grand Park: giao nhận tận tòa, trả đồ trong ngày.',
    'Quán Nhà Mây': 'Quán nhỏ trong khu: cà phê, trà sữa, nước ép làm tươi từng ly. Giao nhanh trong khu, có combo cho văn phòng.',
  };
  const KIND_OF = { 'Bếp Cô Lan': 'Bếp nhà làm', 'Giặt sấy Mỹ Linh': 'Giặt sấy', 'Tiệm Sạch Thơm': 'Giặt sấy & rau sạch', 'Quán Nhà Mây': 'Quán cà phê, trà sữa', 'Quán Phở Bà Tư': 'Quán phở, bún', 'Cô Ba': 'Đồ ăn sáng' };
  const REPLY = ['Thường trả lời trong 10 phút', 'Thường trả lời trong 30 phút', 'Thường trả lời trong 1 giờ', 'Thường trả lời trong 15 phút'];
  const typeOf = new Map();
  for (const p of postById.values()) if (!typeOf.has(String(p.seller))) typeOf.set(String(p.seller), p.type);
  for (const u of users) {
    const type = typeOf.get(String(u._id));
    if (!type) continue;
    const h = hash(String(u._id));
    if (dryRun) continue;
    const pool = fans.filter((f) => String(f._id) !== String(u._id));
    for (let i = 0; i < 3 + (h % 8) && i < pool.length; i++) {
      const f = pool[(h + i * 5) % pool.length];
      await ShopFollow.updateOne({ user: f._id, shop: u._id }, { $setOnInsert: { user: f._id, shop: u._id } }, { upsert: true });
    }
    const lan = u.name === 'Bếp Cô Lan';
    await Shop.updateOne({ user: u._id }, { $setOnInsert: {
      user: u._id, name: u.name, kind: KIND_OF[u.name] || KIND[type], address: `Block ${u.area || 'B'}${lan ? ', tầng 5' : ''}`, bio: BIO_OF[u.name] || BIO[type], replyTime: REPLY[h % REPLY.length],
      hours: Array.from({ length: 7 }, (_, i) => ({ on: lan ? i !== 6 : true, from: lan ? '09:00' : '08:00', to: lan ? '13:00' : '20:00' })),
    } }, { upsert: true });
  }

  if (!dryRun) await require('../modules/shared/post-stats').refreshAll(); // điểm sao, số đánh giá, số đã bán lưu sẵn trên từng bài

  /* Xác minh người bán: ai đang có bài hoặc việc thì đã được duyệt sẵn (người mới đăng ký thì phải nộp hồ sơ và chờ admin) */
  const Verification = require('../modules/seller/verification.model');
  const owners = new Map();
  for (const p of await Post.find({}).select('seller type')) owners.set(String(p.seller), p.type);
  for (const j of jobs) if (!owners.has(String(j.poster))) owners.set(String(j.poster), 'service');
  for (const u of users) {
    const type = owners.get(String(u._id));
    if (!type || u.role === 'admin') continue;
    if (dryRun) continue;
    await Verification.updateOne({ user: u._id }, { $setOnInsert: { user: u._id, status: 'approved', reviewedAt: new Date(), submittedAt: new Date(),
      body: { fullName: u.name, idNumber: '000000000000', idFront: 'mau-mat-truoc.jpg', idBack: 'mau-mat-sau.jpg', selfie: 'mau-chan-dung.jpg', shopName: u.name, shopType: type, intro: '' } } }, { upsert: true });
  }

  /* Nổi bật + Giờ vàng: chỉ điền khi bài chưa có */
  for (const t of PROMOTED_TITLES) {
    const post = postByTitle.get(t);
    if (!post) continue;
    if (!dryRun) await Post.collection.updateOne({ _id: post._id, promoted: { $ne: true } }, { $set: { promoted: true } });
  }
  for (const [t, promo] of Object.entries(DEALS)) {
    const post = postByTitle.get(t);
    if (!post) { out.skipped.push(`giờ vàng: ${t}`); continue; }
    if (!dryRun) await Post.collection.updateOne({ _id: post._id, promo: { $exists: false } }, { $set: { promo } });
  }
  if (!dryRun) for (const j of jobs) await offerService.syncOfferCount(j._id);
  return out;
}

module.exports = { REVIEWS, OFFERS, addActivity };
