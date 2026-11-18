// Đợt đánh giá thứ hai cho dữ liệu mẫu: dày hơn, nhiều giọng văn (ngắn/dài, khen, chê nhẹ, có phản hồi) để trang bài nhìn sôi nổi.
// Cùng định dạng và cách dùng với REVIEWS trong activity-extra.js: [người đánh giá, số sao, nhận xét, số ngày trước, phản hồi người bán?].
// addActivity() tự bỏ qua nếu người đó đã đánh giá bài này rồi hoặc chính là người bán.

const REVIEWS_MORE = {
  /* ---------- Đồ ăn ---------- */
  'Cơm nhà làm, thực đơn đổi mỗi ngày': [
    ['Anh Tùng', 5, 'Ngon, đúng vị cơm nhà. Cô Lan còn gói thêm ít dưa muối tặng.', 3],
    ['Quốc Anh', 4, 'Món ngon nhưng hôm mình đặt hết món gà nên phải đổi sang cá kho.', 9],
    ['Minh Khoa', 5, 'Ăn 3 ngày liền, ngày nào cũng khác món mà đều vừa miệng.', 14],
    ['Cô Ba', 5, 'Cô cũng nấu ăn nhưng phải công nhận cơm cô Lan ngon, canh chua ngọt thanh.', 33],
    ['Chị Ngân', 5, 'Giao đúng 11 rưỡi, cơm còn nóng hổi. Sẽ đặt thường xuyên.', 40],
  ],
  'Phở bò tái, nước dùng hầm xương': [
    ['Anh Tuấn', 5, 'Sáng chủ nhật đặt, nước dùng trong và thơm quế hồi. Bò tái đúng độ chín.', 4],
    ['Chị Hoa', 5, 'Phở ngon nhất trong các quán gần khu mình biết. Đóng nước riêng nên bánh không nở.', 11],
    ['Thu Hà', 4, 'Ngon, nhưng phần bánh phở hơi ít, lần sau mình gọi tô lớn.', 18],
    ['Cô Ba', 5, 'Hương vị phở Bắc chuẩn, không dùng bột ngọt quá tay.', 27],
  ],
  'Mì xào hải sản': [
    ['Anh Tùng', 5, 'Tôm mực nhiều thật sự, mì xào săn không bị bết. Đáng giá.', 5],
    ['Quốc Anh', 4, 'Ngon, hơi mặn với mình. Giao hơi chậm một chút vì giờ cao điểm.', 12],
    ['Cô Ba', 5, 'Phần hải sản tươi, nêm vừa miệng. Khách nhà mình khen.', 21],
  ],
  'Đậu sốt cà chua': [
    ['Chị Hoa', 5, 'Đậu mềm, sốt cà chua đậm đà. Ăn kèm cơm là hết sạch.', 6],
    ['Quốc Anh', 4, 'Ngon nhưng phần hơi ít cho 2 người ăn.', 15],
    ['Minh Khoa', 5, 'Món bình dân mà làm khéo, sốt không bị loãng.', 26],
  ],
  'Salad ức gà': [
    ['Thu Hà', 5, 'Ức gà luộc mềm, rau giòn tươi, sốt vừa không ngấy. Hợp người ăn kiêng.', 3],
    ['Anh Tùng', 3, 'Ổn nhưng với mình hơi ít, ăn xong chưa no. Có thể thêm trứng luộc.', 12, 'Cảm ơn góp ý, tiệm sẽ thêm lựa chọn tăng phần cho bạn.'],
    ['Quốc Anh', 4, 'Rau sạch, đóng hộp gọn. Mình mua cho bữa trưa văn phòng.', 22],
  ],
  'Cà phê sữa đá': [
    ['Chị Hoa', 5, 'Cà phê thơm, vị đậm đà đúng gu. Mình ghiền món này mỗi sáng.', 2],
    ['Anh Tuấn', 4, 'Ngon, ít ngọt hơn quán mình hay uống. Đá không bị tan quá nhanh.', 8],
    ['Thu Hà', 5, 'Đặt giao sáng sớm, vẫn còn lạnh. Ly và nắp chắc.', 16],
    ['Cô Ba', 5, 'Cà phê pha đúng kiểu, thơm mùi rang. Cô uống hợp.', 29],
  ],
  'Trà sữa trân châu đường đen': [
    ['Anh Tùng', 4, 'Trà sữa ngon, trân châu dẻo. Hơi nhiều đá một chút.', 7],
    ['Quốc Anh', 5, 'Đường đen thơm khét nhẹ, uống không bị ngọt gắt. Rất đã.', 13],
    ['Chị Ngân', 5, 'Con gái mình ghiền, tuần nào cũng đặt hai ly.', 19, 'Cảm ơn chị và bé nhé!'],
    ['Minh Khoa', 3, 'Vị ổn nhưng hôm mình đặt trân châu hơi cứng, chắc nấu từ sáng.', 31, 'Quán xin lỗi bạn, từ nay trân châu nấu mới mỗi 3 tiếng.'],
  ],
  'Cà phê hạt rang mộc': [
    ['Chị Hoa', 5, 'Mua pha phin ở nhà, thơm cả nhà. Hậu vị béo nhẹ.', 6],
    ['Thu Hà', 4, 'Ngon, hơi đậm với mình, lần sau chọn loại pha trộn nhẹ hơn.', 15],
  ],
  'Nước ép cam tươi': [
    ['Minh Khoa', 5, 'Cam vắt thật, uống thấy sảng khoái. Không có hạt, không đắng.', 6],
    ['Anh Tùng', 4, 'Ngon nhưng giá hơi cao hơn nước ép bán ngoài chợ, đổi lại tươi.', 14],
    ['Quốc Anh', 5, 'Sáng nào mình cũng đặt một ly trước khi đi làm.', 23],
  ],
  'Sữa chua nếp cẩm tự làm': [
    ['Chị Hoa', 5, 'Vị chua nhẹ, nếp cẩm bùi, rất giải nhiệt ngày nóng.', 3],
    ['Quốc Anh', 4, 'Ngon, hũ hơi nhỏ so với mình nghĩ.', 10],
    ['Anh Tùng', 5, 'Ăn xong muốn đặt lần nữa. Vị tự làm khác hẳn mua sẵn.', 21],
  ],
  'Bánh flan caramel hộp 4 cái': [
    ['Thu Hà', 5, 'Mịn như kem, không bị rỗ. Caramel không đắng gắt.', 4],
    ['Chị Ngân', 4, 'Đẹp và ngon, giao còn lạnh. Hơi ngọt với người lớn tuổi.', 11],
    ['Quốc Anh', 5, 'Mình mua làm quà cho đồng nghiệp, ai cũng hỏi mua ở đâu.', 25],
  ],
  'Bánh mì que pate nhà làm': [
    ['Chị Ngân', 5, 'Giòn rụm, pate béo thơm, đúng kiểu bánh mì que. Mình mua mỗi sáng 5 cái.', 4],
    ['Quốc Anh', 4, 'Ngon, giá rất rẻ. Hơi nhiều bột nên mình ăn 2 cái là no.', 12],
    ['Minh Khoa', 5, 'Tự đến lấy tại sạp, cô gói sẵn còn nóng. Rất đáng ghé.', 22],
  ],
  'Cháo sườn sáng, nấu mỗi ngày': [
    ['Chị Hoa', 5, 'Cháo ngon, sườn không dai. Mẹ mình ăn rất thích.', 5],
    ['Thu Hà', 4, 'Ngon, mong cô để thêm hành phi riêng thì tuyệt.', 13],
    ['Minh', 5, 'Sáng mưa đặt bát cháo nóng, thật là hạnh phúc.', 24],
  ],
  'Xôi mặn sáng, đủ topping': [
    ['Thu Hà', 5, 'Topping đầy đặn, trứng cút béo. Xôi dẻo, không bị khô.', 7],
    ['Anh Tuấn', 4, 'Ngon, giá hợp lý. Hơi nhiều chà bông với mình.', 15],
    ['Quốc Anh', 5, 'Sáng nào cũng ghé lấy, cô nhớ khẩu vị mình luôn.', 28],
  ],
  'Bún bò Huế cay vừa': [
    ['Chị Hoa', 5, 'Đúng vị bún bò Huế, mắm ruốc thơm. Cay vừa đủ ăn.', 6],
    ['Chị Ngân', 4, 'Ngon nhưng nước hơi nhiều dầu ớt, lần sau mình dặn ít.', 14],
    ['Anh Tùng', 5, 'Tô lớn với giò heo chất lượng, ăn no cả trưa.', 25],
  ],
  'Bún chả Hà Nội, nem rán giòn': [
    ['Quốc Anh', 5, 'Chả nướng thơm lừng, nem rán giòn lâu. Nước chấm chua ngọt chuẩn.', 8],
    ['Minh Khoa', 4, 'Ngon, mình thêm nem rán thì hơi ngấy. Tốt nhất ăn một suất.', 17],
    ['Thu Hà', 5, 'Đặt cho cả phòng 5 suất, ai cũng khen. Đóng gói cẩn thận.', 26],
  ],
  'Cơm chay thập cẩm': [
    ['Anh Tuấn', 4, 'Món chay đa dạng, đậu hũ chiên giòn. Cơm hơi nhão một chút.', 9],
    ['Thu Hà', 5, 'Ngày rằm nào cũng đặt, cô nêm vừa miệng, không ngán.', 20],
    ['Quốc Anh', 5, 'Canh nấm ngọt thanh, ăn nhẹ bụng. Rất hợp những ngày ăn chay.', 30],
  ],
  'Bowl rau củ healthy, giao trưa': [
    ['Thu Hà', 5, 'Rau củ nhiều màu, nhìn đẹp và ăn ngon. Hộp có chia ngăn.', 4],
    ['Chị Ngân', 4, 'Phần ăn vừa phải, sốt mè ngon. Mong thêm đậu hũ.', 12],
    ['Quốc Anh', 5, 'Mình ăn kiêng tinh bột, bowl này vừa đủ mà không đói.', 22],
  ],
  'Tiệm xôi Yuumi - Nhận đơn đồ ăn sáng 29/10': [
    ['Anh Tùng', 5, 'Đặt tối hôm trước, sáng có xôi đúng giờ. Ngon, nhiều hành phi.', 8],
    ['Quốc Anh', 4, 'Ổn, xôi dẻo. Giá phải chăng cho bữa sáng.', 17],
    ['Chị Hoa', 5, 'Mình mua cho cả nhà, trẻ con thích xôi xéo.', 27],
  ],
  'Canh chua cá': [
    ['Anh Tuấn', 5, 'Canh chua ngọt nước, rau thơm nhiều. Cá không bị tanh.', 12],
    ['Minh Khoa', 4, 'Ngon, tiếc là món bán nhanh hết, mong cô nấu nhiều hơn.', 21],
  ],
  'Cơm gà kho gừng': [
    ['Chị Hoa', 5, 'Gà kho gừng đậm vị, thịt mềm tơi. Gừng thơm vừa không hăng.', 10],
    ['Anh Tuấn', 5, 'Phần cơm đầy, gà nhiều thịt. Đáng đồng tiền.', 19],
    ['Quốc Anh', 4, 'Ngon, hơi mặn với mình. Dưa chua ăn kèm rất hợp.', 29],
  ],
  'Cơm sườn rim': [
    ['Anh Tuấn', 5, 'Sườn rim mềm, nước sốt thấm cơm. Giao nóng.', 9],
    ['Minh Khoa', 4, 'Ngon, hơi ngọt với mình. Phần cơm hơi nhiều.', 18],
    ['Thu Hà', 5, 'Cả nhà mình ăn hết sạch. Sườn dày thịt.', 28],
  ],
  'Combo bữa trưa nhà làm: cơm + đậu sốt cà chua + bánh flan': [
    ['Chị Ngân', 5, 'Có cả tráng miệng, bữa trưa trọn vẹn. Rất hài lòng.', 8],
    ['Quốc Anh', 5, 'Giá tốt hơn mua lẻ, giao đúng giờ.', 18],
    ['Minh Khoa', 4, 'Ngon, nhưng đậu hơi ít so với cơm.', 27],
  ],
  'Combo bữa tối gia đình: 3 món + canh': [
    ['Anh Tuấn', 5, 'Tối đi làm về muộn có ngay bữa cơm gia đình, rất tiện.', 9],
    ['Thu Hà', 4, 'Món ngon, nhiều. Canh hơi nhạt so với khẩu vị miền Nam.', 20],
    ['Quốc Anh', 5, 'Nhà mình 4 người ăn vừa đủ, còn dư ít canh.', 31],
  ],
  'Combo cơm trưa 5 ngày, đặt cả tuần': [
    ['Chị Hoa', 5, 'Mỗi ngày một món, không bị lặp. Tiện cho dân văn phòng.', 15],
    ['Quốc Anh', 5, 'Giá rẻ hơn mua lẻ nhiều. Hết tuần mình đặt tiếp tuần sau.', 29],
  ],
  'Combo hai người: phở bò tái + bún chả': [
    ['Thu Hà', 5, 'Vợ chồng mình mỗi người một món, đều ngon. Giá vừa phải.', 9],
    ['Minh Khoa', 4, 'Combo hợp lý, giao hơi lâu nhưng món còn nóng.', 19],
  ],
  'Combo giải khát: cà phê sữa đá + trà sữa trân châu': [
    ['Anh Tuấn', 5, 'Hai ly vừa đủ cho chiều văn phòng. Rẻ hơn mua lẻ.', 6],
    ['Thu Hà', 4, 'Cà phê ngon, trà sữa hơi ngọt. Tổng thể ổn.', 14],
  ],
  'Combo sáng no bụng: xôi mặn + cháo sườn + 2 bánh mì que': [
    ['Chị Ngân', 5, 'Cả nhà 3 người ăn sáng đủ no. Món nào cũng nóng.', 8],
    ['Anh Tuấn', 4, 'Ngon, hơi nhiều tinh bột, nhưng đủ no tới trưa.', 18],
  ],

  /* ---------- Đồ dùng ---------- */
  'Bếp từ đơn Sunhouse, còn bảo hành': [
    ['Anh Tuấn', 4, 'Bếp đúng như mô tả. Giao dịch nhanh, người bán thân thiện.', 11],
  ],
  'Bộ hộp cơm inox ×6': [
    ['Chị Ngân', 5, 'Hộp chắc, không có mùi kim loại. Mình đã dùng để chia thức ăn tuần.', 8],
    ['Thu Hà', 5, 'Giá hợp lý, đủ dùng cả tuần.', 17],
  ],
  'Rau củ sạch theo combo': [
    ['Chị Ngân', 5, 'Rau tươi, không héo, nhiều loại. Cả nhà ăn cả tuần.', 5],
    ['Thu Hà', 4, 'Ổn, mong có thêm tùy chọn rau lá.', 11],
    ['Anh Tùng', 5, 'Giao nhanh, rau sạch đất, có cả rau thơm tặng.', 19],
  ],

  /* ---------- Dịch vụ ---------- */
  'Combo dọn nhà 3 buổi, giảm 15%': [
    ['Chị Hoa', 5, 'Nhà sạch thơm, bạn dọn kỹ cả những góc khuất. Rất hài lòng.', 13],
    ['Thu Hà', 5, 'Đặt gói 3 buổi tiết kiệm hơn hẳn. Buổi nào cũng đúng giờ.', 24],
    ['Quốc Anh', 4, 'Dọn tốt, có một buổi người làm đến trễ 15 phút nhưng đã báo trước.', 35],
  ],
  'Combo giặt sấy 4 lần trong tháng': [
    ['Chị Ngân', 5, 'Gói tháng rất tiện, đỡ phải nhớ đặt mỗi tuần. Đồ sạch và gấp đẹp.', 12],
    ['Thu Hà', 5, 'Lấy đúng lịch, trả trong ngày hôm sau. Rất yên tâm.', 25],
  ],
  'Cắt tóc nam tại nhà': [
    ['Minh Khoa', 5, 'Cắt đẹp, gọn gàng. Bạn trải bạt sạch nên không phải dọn tóc vụn.', 4],
    ['Anh Tùng', 5, 'Hai bố con cùng cắt tại nhà, tiết kiệm thời gian cho cả hai.', 11],
    ['Chị Hoa', 4, 'Đặt cho chồng, anh ấy hài lòng. Hơi lâu hơn dự kiến nhưng chấp nhận được.', 23],
    ['Thu Hà', 5, 'Bé nhà mình ngoan, bạn khéo nên bé không quấy.', 36],
  ],
  'Dắt chó đi dạo buổi chiều': [
    ['Chị Hoa', 5, 'Bạn thân thiện, gửi ảnh chó chơi ngoài công viên. Chó nhà mình rất phấn khích.', 6],
    ['Anh Tuấn', 4, 'Đúng giờ, chăm sóc cẩn thận. Mong có gói dắt theo tuần.', 15],
    ['Minh Khoa', 5, 'Mình đi làm cả ngày nên dịch vụ này rất hữu ích.', 24],
  ],
  'Dọn nhà theo giờ': [
    ['Anh Tuấn', 5, 'Dọn nhanh gọn, lau bếp sạch dầu mỡ. Làm đúng 3 tiếng như đặt.', 7],
    ['Quốc Anh', 4, 'Bạn dọn tốt. Mình có thể nhờ thêm giặt rèm lần sau.', 19],
    ['Minh Khoa', 5, 'Tiện cho gia đình có con nhỏ, nhà luôn sạch. Sẽ đặt định kỳ.', 30],
  ],
  'GIẶT SẤY JALY: GIAO NHẬN TẬN TOÀ - TRẢ LUÔN TRONG NGÀY': [
    ['Chị Ngân', 5, 'Trả đồ trong ngày thật sự, đóng gói riêng từng túi. Rất tiện.', 9],
    ['Thu Hà', 4, 'Giặt sạch, thơm. Mình nhờ ủi thêm nhưng chưa phẳng lắm.', 20],
    ['Anh Tuấn', 5, 'Giao nhận tận tòa, không cần xuống sảnh. Quá tiện.', 31],
  ],
  'Giao nhận hộ trong khu': [
    ['Thu Hà', 5, 'Nhờ lấy hộ cơm ở quán đầu khu, 10 phút là có. Giá hợp lý.', 5],
    ['Quốc Anh', 5, 'Bạn nhắn tin rất rõ ràng, giao đúng chỗ mình dặn.', 13],
    ['Minh Khoa', 4, 'Ổn, nhanh. Mong thêm tùy chọn chụp ảnh khi giao.', 24],
  ],
  'Giặt hấp đồ vest': [
    ['Anh Tùng', 5, 'Vest được hấp phẳng phiu, đường may nguyên vẹn. Mặc đi dự đám cưới rất lịch sự.', 10],
    ['Minh Khoa', 4, 'Làm kỹ, trả đúng hẹn. Giá nhỉnh hơn giặt thường nhưng xứng đáng.', 21],
  ],
  'Giặt sấy gấp, lấy và trả tận cửa': [
    ['Chị Ngân', 5, 'Quần áo thơm, gấp ngay ngắn. Nhân viên lịch sự.', 5],
    ['Thu Hà', 4, 'Ổn, trả hơi trễ nửa ngày nhưng có nhắn báo.', 14],
    ['Anh Tuấn', 5, 'Lấy ở cửa, cân trước mặt mình, giá rõ ràng. Rất tin tưởng.', 26],
  ],
  'Giặt sấy gấp, lấy và trả tận cửa trong ngày': [
    ['Chị Hoa', 5, 'Dùng nhiều lần rồi, chưa lần nào thất vọng. Sạch và thơm.', 8],
    ['Anh Tuấn', 4, 'Nhanh, giá hợp lý. Hơi nhàu một chiếc áo sơ mi.', 19],
    ['Quốc Anh', 5, 'Đồ trả đúng như hẹn. Nhân viên thân thiện.', 32],
  ],
  'Làm móng tay, sơn gel tại nhà': [
    ['Phương', 5, 'Mình thích bộ mẫu bạn vẽ, rất tinh tế. Bền cả 2 tuần.', 4],
    ['Chị Ngân', 5, 'Tại nhà thoải mái, bạn nhẹ nhàng. Sẽ gọi lại.', 10],
    ['Thu Hà', 4, 'Đẹp nhưng mình mong có thêm mẫu theo mùa.', 21],
  ],
  'Lấy đồ hộ, giao nhận trong khu': [
    ['Thu Hà', 5, 'Bạn lấy giúp gói hàng ở cổng, giao tận cửa. Rất tiện khi vắng nhà.', 7],
    ['Quốc Anh', 4, 'Nhanh, có nhắn tin cập nhật. Giá hợp lý.', 16],
    ['Minh Khoa', 5, 'Lấy giúp đồ ở nhà ga, bạn rất cẩn thận.', 27],
  ],
  'Nấu cơm gia đình': [
    ['Chị Hoa', 5, 'Cô nấu ngon, đi chợ chọn đồ tươi. Bếp dọn sạch sau khi nấu.', 8],
    ['Anh Tuấn', 4, 'Ngon, cô nấu hơi lâu hơn dự kiến nhưng món rất kỹ.', 18],
    ['Quốc Anh', 5, 'Cả nhà khen món cá kho. Sẽ đặt cô nấu mỗi cuối tuần.', 32],
  ],
  'Nấu cơm theo tuần': [
    ['Chị Ngân', 5, 'Đặt gói tuần cho cả nhà, mỗi ngày một món, giao đúng 11 giờ.', 16],
    ['Quốc Anh', 4, 'Tiện lợi. Mong đổi lịch món linh hoạt hơn.', 26],
  ],
  'Nấu cỗ tại nhà': [
    ['Chị Hoa', 5, 'Cỗ tân gia 10 người, món đẹp, đủ đầy. Dọn dẹp sạch sau khi xong.', 24],
    ['Anh Tuấn', 5, 'Cô nấu cỗ rất chuyên nghiệp, khách nhà mình khen không ngớt.', 38],
  ],
  'Sửa laptop, điện thoại — kiểm tra tận nơi': [
    ['Anh Tuấn', 5, 'Thợ đến nhà, chẩn đoán đúng bệnh, thay pin nhanh. Báo giá rõ.', 6],
    ['Thu Hà', 4, 'Sửa tốt, bảo hành 1 tháng. Phí kiểm tra trừ vào tiền sửa như hứa.', 17],
    ['Minh Khoa', 5, 'Máy hỏng nguồn, bạn kiểm tra rồi sửa luôn tại chỗ. Rất đáng.', 28],
  ],
  'Tắm và cắt tỉa lông thú cưng tại nhà': [
    ['Chị Hoa', 5, 'Mèo nhà mình rất nhát mà vẫn hợp tác. Lông mềm, thơm.', 6],
    ['Anh Tuấn', 4, 'Làm tốt, hơi lâu vì chó nhà mình lông dày.', 15],
    ['Minh Khoa', 5, 'Cắt tỉa gọn gàng, chó nhìn trẻ ra hẳn.', 26],
  ],
  'Vệ sinh máy lạnh': [
    ['Anh Tuấn', 5, 'Thợ chuyên nghiệp, rửa dàn nóng và lạnh, báo tình trạng gas. Máy chạy êm.', 9],
    ['Thu Hà', 4, 'Làm sạch, hơi tốn thời gian nhưng kỹ.', 20],
  ],
  'Đi siêu thị hộ, giao tận cửa': [
    ['Thu Hà', 5, 'Bạn chọn đúng loại mình dặn, gửi ảnh từng món. Rất đáng tin.', 7],
    ['Chị Ngân', 5, 'Tiện lúc bé ốm không ra ngoài được. Giao nhanh.', 16],
    ['Quốc Anh', 4, 'Ổn, có một món thay thế vì hết hàng nhưng bạn báo trước.', 25],
  ],
  'Điện lạnh Gia Hân - nhận vệ sinh và sửa chữa các thiết bị điện': [
    ['Chị Ngân', 5, 'Sửa tủ lạnh nhanh, thợ giải thích rõ nguyên nhân. Báo giá hợp lý.', 13],
    ['Quốc Anh', 5, 'Thợ đến đúng hẹn, làm sạch gọn không để bụi bẩn.', 27],
    ['Minh Khoa', 4, 'Ổn, có bảo hành. Mong cập nhật bảng giá rõ hơn.', 37],
  ],
};

module.exports = { REVIEWS_MORE };
