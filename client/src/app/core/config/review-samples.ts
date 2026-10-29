import { SampleReview, TemplateKey } from '../models/post-template';

/** Đánh giá mẫu riêng từng loại bài (văn phong đúng loại hàng / dịch vụ). */
export const REVIEW_SAMPLES: Record<TemplateKey, SampleReview[]> = {
  food: [
    [
      '1500648767791-00dcc994a43e',
      'Quốc Anh',
      'Block B',
      '2 tuần trước',
      5,
      'Đồ ăn vừa miệng, giao đúng giờ. Cô Lan còn nhắn hỏi mình ăn cay được không.',
      [
        '1504674900247-0877df9cc836'
      ],
      'Cảm ơn con nhiều, hôm nào muốn cay thêm cứ ghi chú nha!'
    ],
    [
      '1507003211169-0a1dd7228f2d',
      'Bác Sơn',
      'Block C',
      '1 tháng trước',
      5,
      'Phần ăn đầy đặn, giá hợp lý. Mình đặt cho cả nhà mấy lần rồi.',
      [],
      ''
    ],
    [
      '1438761681033-6461ffad8d80',
      'Minh Khoa',
      'Block A',
      '1 tháng trước',
      4,
      'Rau tươi, canh ngọt. Hôm nào món mặn hết sớm thì cô nhắn đổi món khác.',
      [
        '1546069901-ba9599a7e63c',
        '1540189549336-e6e99c3679fe'
      ],
      ''
    ],
    [
      '1494790108377-be9c29b29330',
      'Thu Hà',
      'Block B',
      '2 tháng trước',
      5,
      'Đặt dễ, hỏi gì cũng trả lời nhanh. Sẽ ủng hộ tiếp.',
      [],
      ''
    ],
    [
      '1500648767791-00dcc994a43e',
      'Lê Nam',
      'Block D',
      '2 tháng trước',
      3,
      'Hôm đó giao trễ khoảng 20 phút, đồ ăn hơi nguội. Bù lại cô xin lỗi và tặng thêm trái cây.',
      [],
      'Cô xin lỗi con, hôm đó đơn nhiều quá. Cô đã chia lại giờ giao rồi nha.'
    ],
    [
      '1507003211169-0a1dd7228f2d',
      'Chị Ngân',
      'Block B',
      '3 tháng trước',
      5,
      'Cá kho tộ đậm đà, ăn rất đưa cơm. Hộp đựng gọn, không bị đổ.',
      [
        '1604908176997-125f25cc6f3d'
      ],
      ''
    ],
    [
      '1438761681033-6461ffad8d80',
      'Phương',
      'Sảnh A',
      '3 tháng trước',
      4,
      'Ngon, giá ổn. Mong có thêm món chay vào thứ Hai.',
      [],
      'Thứ Hai tuần sau cô thêm món chay nha!'
    ],
    [
      '1494790108377-be9c29b29330',
      'Hoài An',
      'Block C',
      '4 tháng trước',
      5,
      'Đặt cho bố mẹ ở nhà, ông bà khen nấu giống cơm nhà.',
      [],
      ''
    ],
    [
      '1500648767791-00dcc994a43e',
      'Tuấn',
      'Block A',
      '4 tháng trước',
      2,
      'Phần cơm hôm mình đặt hơi ít so với giá. Hy vọng lần sau tốt hơn.',
      [],
      ''
    ],
    [
      '1507003211169-0a1dd7228f2d',
      'Mai Linh',
      'Block D',
      '5 tháng trước',
      5,
      'Sườn ram mềm, nước mắm pha vừa. Giao tận cửa rất tiện.',
      [
        '1512621776951-a57141f2eefd'
      ],
      ''
    ]
  ],
  drink: [
    [
      '1544005313-94ddf0286df2',
      'Chị Mai',
      'Block D',
      '3 ngày trước',
      5,
      'Trân châu mềm, đường đen thơm mà không bị gắt. Mình chọn ít ngọt là vừa.',
      [
        '1558857563-b371033873b8'
      ],
      ''
    ],
    [
      '1500648767791-00dcc994a43e',
      'Quốc Anh',
      'Block B',
      '1 tuần trước',
      5,
      'Đặt 4 ly cho cả phòng, giao nhanh, ly dán kín nên không đổ giọt nào.',
      [],
      ''
    ],
    [
      '1438761681033-6461ffad8d80',
      'Minh Khoa',
      'Block A',
      '2 tuần trước',
      4,
      'Ngon, size L đáng tiền. Hôm đó hết pudding nên quán nhắn đổi sang thạch.',
      [],
      'Cảm ơn bạn đã đồng ý đổi topping nha!'
    ],
    [
      '1494790108377-be9c29b29330',
      'Thu Hà',
      'Block B',
      '1 tháng trước',
      5,
      'Kem cheese béo mà không ngấy. Ghi chú dùng ly giấy quán cũng làm theo.',
      [
        '1525803377221-4f6ccdaa5133'
      ],
      ''
    ],
    [
      '1506794778202-cad84cf45f1d',
      'Bác Sơn',
      'Block C',
      '1 tháng trước',
      3,
      'Hơi ngọt so với mình dù đã chọn 70%. Lần sau sẽ chọn 50%.',
      [],
      'Dạ lần sau quán pha nhạt hơn cho bác nha.'
    ]
  ],
  goods: [
    [
      '1500648767791-00dcc994a43e',
      'Quốc Anh',
      'Block B',
      '1 tuần trước',
      5,
      'Nồi còn rất mới, anh Quân chỉ cách dùng luôn. Giá mềm hơn mua mới nhiều.',
      [
        '1556909114-f6e7ad7d3136'
      ],
      ''
    ],
    [
      '1544005313-94ddf0286df2',
      'Chị Mai',
      'Block D',
      '3 tuần trước',
      5,
      'Hẹn lấy ở sảnh đúng giờ, đồ đúng như ảnh, có cả hộp và sách hướng dẫn.',
      [],
      ''
    ],
    [
      '1438761681033-6461ffad8d80',
      'Minh Khoa',
      'Block A',
      '1 tháng trước',
      4,
      'Đồ ổn, có vết xước nhỏ ở nắp nhưng anh đã nói trước trong tin nhắn.',
      [],
      'Cảm ơn bạn đã thông cảm, mình ghi rõ hơn trong bài rồi nha.'
    ],
    [
      '1506794778202-cad84cf45f1d',
      'Bác Sơn',
      'Block C',
      '2 tháng trước',
      5,
      'Mua cái ghế cho cháu, chắc chắn, anh còn mang lên tận nhà giúp.',
      [],
      ''
    ],
    [
      '1494790108377-be9c29b29330',
      'Thu Hà',
      'Block B',
      '3 tháng trước',
      3,
      'Hàng dùng được nhưng pin yếu hơn mình nghĩ. Nên hỏi kỹ trước khi mua.',
      [],
      ''
    ]
  ],
  svc: [
    [
      '1500648767791-00dcc994a43e',
      'Quốc Anh',
      'Block B',
      '5 ngày trước',
      5,
      'Đồ thơm, gấp gọn từng món, trả đúng giờ hẹn. Áo trắng giặt riêng nên không bị lem.',
      [
        '1545173168-9f1947eebb7f'
      ],
      ''
    ],
    [
      '1494790108377-be9c29b29330',
      'Thu Hà',
      'Block B',
      '2 tuần trước',
      5,
      'Lấy đồ tận cửa lúc 8h, chiều đã có. Tiện cho người đi làm.',
      [],
      ''
    ],
    [
      '1507003211169-0a1dd7228f2d',
      'Bác Sơn',
      'Block C',
      '1 tháng trước',
      4,
      'Giặt sạch, cân đúng ký. Hôm mưa trả trễ 1 tiếng nhưng có nhắn báo trước.',
      [],
      'Cảm ơn bác đã thông cảm, hôm đó máy sấy quá tải ạ.'
    ],
    [
      '1544005313-94ddf0286df2',
      'Chị Mai',
      'Block D',
      '1 tháng trước',
      5,
      'Gửi cả chăn mền cũng nhận, giá rõ ràng từ đầu.',
      [],
      ''
    ],
    [
      '1438761681033-6461ffad8d80',
      'Phương',
      'Sảnh A',
      '2 tháng trước',
      3,
      'Một chiếc áo len bị co nhẹ. Tiệm có hỏi lại và giảm tiền cho mình.',
      [],
      'Tiệm xin lỗi chị, lần sau đồ len tiệm sẽ giặt tay riêng ạ.'
    ]
  ],
  fix: [
    [
      '1500648767791-00dcc994a43e',
      'Quốc Anh',
      'Block B',
      '1 tuần trước',
      5,
      'Laptop không lên nguồn, anh Tùng kiểm tra tại nhà 15 phút là ra lỗi sạc. Báo giá trước rồi mới thay.',
      [
        '1581092918056-0c4c3acd3789'
      ],
      ''
    ],
    [
      '1506794778202-cad84cf45f1d',
      'Tuấn',
      'Block A',
      '3 tuần trước',
      5,
      'Vệ sinh máy lạnh kỹ, có chụp ảnh trước và sau. Máy chạy êm hẳn.',
      [],
      ''
    ],
    [
      '1438761681033-6461ffad8d80',
      'Minh Khoa',
      'Block A',
      '1 tháng trước',
      4,
      'Sửa điện thoại thay màn hình nhanh, giá hợp lý. Phải chờ linh kiện 1 ngày.',
      [],
      'Cảm ơn bạn, màn chính hãng nên phải đặt trước ạ.'
    ],
    [
      '1494790108377-be9c29b29330',
      'Hoài An',
      'Block C',
      '2 tháng trước',
      5,
      'Kiểm tra xong báo không cần thay gì, chỉ lấy phí kiểm tra. Rất thật thà.',
      [],
      ''
    ],
    [
      '1544005313-94ddf0286df2',
      'Mai Linh',
      'Block D',
      '3 tháng trước',
      3,
      'Sửa được nhưng hẹn 2 giờ chiều mà 3 giờ mới tới.',
      [],
      ''
    ]
  ],
  clean: [
    [
      '1494790108377-be9c29b29330',
      'Thu Hà',
      'Block B',
      '4 ngày trước',
      5,
      'Cô Ba dọn kỹ bếp và nhà tắm, lau cả cửa kính. Mình đặt lặp lại hằng tuần luôn.',
      [
        '1581578731548-c64695cc6952'
      ],
      ''
    ],
    [
      '1507003211169-0a1dd7228f2d',
      'Bác Sơn',
      'Block C',
      '2 tuần trước',
      5,
      'Đúng giờ, làm nhanh mà sạch. Tự mang theo dụng cụ nên nhà không cần chuẩn bị gì.',
      [],
      ''
    ],
    [
      '1500648767791-00dcc994a43e',
      'Quốc Anh',
      'Block B',
      '1 tháng trước',
      4,
      'Sạch sẽ, chỉ quên lau gầm giường. Nhắn là hôm sau cô qua làm lại.',
      [],
      'Cô xin lỗi con, lần sau cô kiểm lại kỹ hơn nha.'
    ],
    [
      '1544005313-94ddf0286df2',
      'Chị Mai',
      'Block D',
      '1 tháng trước',
      5,
      'Nhà có mèo mà cô vẫn dọn rất cẩn thận, không làm bé sợ.',
      [],
      ''
    ],
    [
      '1438761681033-6461ffad8d80',
      'Phương',
      'Sảnh A',
      '2 tháng trước',
      4,
      'Làm tốt, giá theo giờ hợp lý. Mong có thêm khung giờ buổi tối.',
      [],
      ''
    ]
  ],
  trip: [
    [
      '1544005313-94ddf0286df2',
      'Chị Mai',
      'Block D',
      '2 ngày trước',
      5,
      'Minh lấy giúp thùng hàng ở cổng, mang lên tận tầng 6, còn chụp ảnh gửi mình.',
      [
        '1580674285054-bed31e145f59'
      ],
      ''
    ],
    [
      '1500648767791-00dcc994a43e',
      'Quốc Anh',
      'Block B',
      '1 tuần trước',
      5,
      'Nhờ đi siêu thị hộ, Minh gửi ảnh hóa đơn rõ ràng, trả lại tiền thừa đủ.',
      [],
      ''
    ],
    [
      '1506794778202-cad84cf45f1d',
      'Bác Sơn',
      'Block C',
      '3 tuần trước',
      5,
      'Mưa to mà vẫn lấy cơm giúp đúng giờ, đồ không bị ướt.',
      [],
      ''
    ],
    [
      '1494790108377-be9c29b29330',
      'Thu Hà',
      'Block B',
      '1 tháng trước',
      4,
      'Nhanh, nhiệt tình. Hôm đó lấy nhầm túi của nhà bên nhưng đã đổi lại ngay.',
      [],
      'Mình xin lỗi chị, giờ mình luôn đọc tên trên túi trước khi lấy ạ.'
    ],
    [
      '1438761681033-6461ffad8d80',
      'Minh Khoa',
      'Block A',
      '1 tháng trước',
      5,
      'Gửi tài liệu sang Block D giúp mình trong 10 phút. Rất tiện.',
      [],
      ''
    ]
  ]
} as unknown as Record<TemplateKey, SampleReview[]>;
