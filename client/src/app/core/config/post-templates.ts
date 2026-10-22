import { PostTemplate, TemplateKey } from '../models/post-template';

/** Ảnh: ID Unsplash (đã kiểm tra) — dùng qua `unsplash(id)` */
export function unsplash(id: string, w = 500, h = 375): string {
  return id.includes(':') || id.startsWith('http') ? id : `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=70`;
}

/** 7 mẫu bài của bản mẫu (design/mockups/detail.html). Khóa khớp `Post.template`. */
export const POST_TEMPLATES: Record<TemplateKey, PostTemplate> = {
  food: {
    key: 'food',
    kind: 'Đồ ăn',
    cat: 'Đồ ăn & thức uống',
    action: 'Đặt món',
    xuOk: true,
    title: 'Cơm nhà làm, thực đơn đổi mỗi ngày',
    imgs: [
      '1504674900247-0877df9cc836',
      '1546069901-ba9599a7e63c',
      '1512621776951-a57141f2eefd',
      '1540189549336-e6e99c3679fe',
      '1604908176997-125f25cc6f3d'
    ],
    seller: {
      av: '1494790108377-be9c29b29330',
      name: 'Bếp Cô Lan',
      since: 'Hàng xóm từ 2023 · Block B, tầng 5',
      reply: 'Thường trả lời trong 10 phút'
    },
    facts: [
      [
        'clock',
        'Giờ nhận đặt',
        'Trước 10:30 mỗi ngày'
      ],
      [
        'pin',
        'Cách nhận',
        'Giao trong khu hoặc tự lấy'
      ],
      [
        'bolt',
        'Thời gian chuẩn bị',
        'Giao 11:30 – 12:15'
      ]
    ],
    desc: [
      'Cơm nhà nấu như ở nhà mình: ít dầu, nêm vừa, rau luộc theo mùa. Thực đơn đổi mỗi ngày, mình đăng món của hôm sau vào buổi tối.',
      'Mỗi phần gồm cơm trắng, 1 món mặn, 1 món rau, canh và trái cây tráng miệng.'
    ],
    list: [
      'Hộp giấy dùng một lần, có thể mang hộp riêng',
      'Giao 11:30 – 12:15 tại sảnh hoặc trước cửa nhà'
    ],
    price: {
      type: 'fixed',
      amount: 35000,
      unit: 'phần'
    },
    qty: {
      label: 'Số lượng (phần)',
      min: 1,
      max: 20
    },
    time: {
      mode: 'slot',
      label: 'Nhận lúc',
      win: [
        '11:00',
        '13:00'
      ]
    },
    place: {
      mode: 'choice',
      label: 'Cách nhận',
      choices: [
        [
          'Giao tận cửa',
          5000
        ],
        [
          'Tự đến lấy',
          0
        ]
      ]
    },
    opts: [
      {
        name: 'Món mặn hôm nay',
        choices: [
          'Sườn ram',
          'Cá kho tộ',
          'Gà chiên mắm'
        ]
      },
      {
        name: 'Phần cơm',
        choices: [
          'Vừa',
          'Nhiều cơm|+5.000đ'
        ]
      }
    ],
    qs: [],
    stock: {
      mode: 'limit',
      left: 8,
      sched: 'Nhận đặt 6:00 – 10:30 mỗi ngày'
    },
    notePh: 'Ví dụ: ít cơm, không hành…',
    steps: [
      'Đã gửi',
      'Chờ xác nhận',
      'Đang giao',
      'Hoàn thành'
    ]
  },
  drink: {
    key: 'drink',
    kind: 'Đồ uống',
    cat: 'Đồ ăn & thức uống',
    action: 'Đặt món',
    xuOk: true,
    title: 'Trà sữa trân châu đường đen',
    explain: 'Quán Nhà Mây pha khi có đơn — bạn đặt, quán làm xong rồi giao hoặc để bạn ghé lấy.',
    imgs: [
      '1558857563-b371033873b8',
      '1525803377221-4f6ccdaa5133',
      '1541696490-8744a5dc0228',
      '1556679343-c7306c1976bc',
      '1622597467836-f3285f2131b8'
    ],
    seller: {
      av: '1438761681033-6461ffad8d80',
      name: 'Quán Nhà Mây',
      since: 'Quán nước trong khu · Shop 5',
      reply: 'Thường trả lời trong 5 phút'
    },
    facts: [
      [
        'clock',
        'Giờ mở cửa',
        '8:00 – 22:00 mỗi ngày'
      ],
      [
        'pin',
        'Cách nhận',
        'Giao trong khu hoặc ghé quán'
      ],
      [
        'bolt',
        'Thời gian pha',
        'Khoảng 10 – 15 phút'
      ]
    ],
    desc: [
      'Trà sữa pha từ trà đen ủ mỗi sáng, trân châu đường đen nấu theo mẻ nhỏ nên lúc nào cũng mềm dẻo.',
      'Chọn size, độ ngọt, lượng đá và topping theo ý bạn. Ly có nắp dán kín, mang đi không bị đổ.'
    ],
    list: [
      'Đơn từ 2 ly giao miễn phí trong khu',
      'Có ly giấy nếu bạn không dùng ly nhựa — ghi chú giúp quán'
    ],
    price: {
      type: 'fixed',
      amount: 30000,
      unit: 'ly'
    },
    qty: {
      label: 'Số lượng (ly)',
      min: 1,
      max: 20
    },
    time: {
      mode: 'slot',
      label: 'Nhận lúc',
      win: [
        '08:00',
        '22:00'
      ]
    },
    place: {
      mode: 'choice',
      label: 'Cách nhận',
      choices: [
        [
          'Giao tận cửa',
          5000
        ],
        [
          'Tự đến lấy',
          0
        ]
      ]
    },
    opts: [
      {
        name: 'Size',
        choices: [
          'Vừa (M)',
          'Lớn (L)|+6.000đ'
        ]
      },
      {
        name: 'Độ ngọt',
        choices: [
          'Ngọt vừa (100%)',
          'Ít ngọt (70%)',
          'Nửa ngọt (50%)',
          'Không đường'
        ]
      },
      {
        name: 'Đá',
        choices: [
          'Đá vừa',
          'Ít đá',
          'Không đá'
        ]
      }
    ],
    qs: [
      {
        type: 'multi',
        label: 'Thêm topping',
        opts: [
          'Trân châu đen|+5.000đ',
          'Thạch trái cây|+5.000đ',
          'Kem cheese|+8.000đ',
          'Pudding trứng|+7.000đ'
        ]
      }
    ],
    stock: {
      mode: 'open',
      sched: 'Nhận đơn 8:00 – 21:30 mỗi ngày'
    },
    notePh: 'Ví dụ: dùng ly giấy, ít trân châu…',
    steps: [
      'Đã gửi',
      'Chờ xác nhận',
      'Đang giao',
      'Hoàn thành'
    ]
  },
  goods: {
    key: 'goods',
    kind: 'Hàng hóa',
    cat: 'Đồ gia dụng',
    action: 'Mua',
    title: 'Nồi chiên không dầu 5L, dùng 6 tháng',
    imgs: [
      '1570222094114-d054a817e56b',
      '1573080496219-bb080dd4f877',
      '1527477396000-e27163b481c2',
      '1556911220-bff31c812dba',
      '1556909114-f6e7ad7d3136'
    ],
    seller: {
      av: '1500648767791-00dcc994a43e',
      name: 'Anh Quân',
      since: 'Hàng xóm từ 2022 · Block A',
      reply: 'Thường trả lời trong 1 giờ'
    },
    facts: [
      [
        'check',
        'Tình trạng',
        'Đã dùng · còn 95%'
      ],
      [
        'pin',
        'Cách nhận',
        'Tự đến lấy ở Block A'
      ],
      [
        'clock',
        'Ngày đăng',
        '2 ngày trước'
      ]
    ],
    desc: [
      'Mình chuyển nhà nên pass lại nồi chiên, mua tháng 4, dùng ít, còn bảo hành chính hãng đến tháng 4 năm sau.',
      'Có thể qua xem và thử máy trước khi lấy.'
    ],
    list: [
      'Kèm khay, giấy bảo hành và hộp',
      'Không giao, hàng xóm qua lấy giúp mình nhé'
    ],
    price: {
      type: 'fixed',
      amount: 650000,
      unit: 'cái'
    },
    qty: null,
    time: {
      mode: 'slot',
      label: 'Hẹn qua lấy',
      win: [
        '17:00',
        '21:00'
      ]
    },
    place: {
      mode: 'seller',
      label: 'Nơi nhận hàng',
      where: 'Block A · căn 08.11'
    },
    opts: [],
    qs: [],
    stock: {
      mode: 'once'
    },
    notePh: 'Ví dụ: mình muốn xem máy trước…',
    steps: [
      'Đã gửi',
      'Chờ xác nhận',
      'Hẹn lấy hàng',
      'Hoàn thành'
    ]
  },
  svc: {
    key: 'svc',
    kind: 'Dịch vụ',
    cat: 'Giặt sấy',
    action: 'Đặt lấy đồ',
    xuOk: true,
    title: 'Giặt sấy gấp, lấy và trả tận cửa',
    imgs: [
      '1582735689369-4fe89db7114c',
      '1545173168-9f1947eebb7f',
      '1517677208171-0bc6725a3e60',
      '1626806787461-102c1bfaaea1',
      '1610557892470-55d9e80c0bce'
    ],
    seller: {
      av: '1438761681033-6461ffad8d80',
      name: 'Tiệm Sạch Thơm',
      since: 'Cửa hàng trong khu · Shop 12',
      reply: 'Thường trả lời trong 15 phút'
    },
    facts: [
      [
        'clock',
        'Thời gian hoàn thành',
        'Trong ngày nếu gửi trước 10h'
      ],
      [
        'pin',
        'Phạm vi phục vụ',
        'Lấy & trả tận cửa trong khu'
      ],
      [
        'receipt',
        'Cách tính giá',
        'Theo kg sau khi cân'
      ]
    ],
    desc: [
      'Giặt máy, sấy khô, gấp gọn. Đồ trắng và đồ màu giặt riêng.',
      'Giá tính theo kg thực tế sau khi cân, tiệm sẽ nhắn báo giá trước khi giặt.'
    ],
    list: [
      'Không nhận đồ da, đồ cần giặt khô',
      'Đồ dưới 3kg tính tròn 3kg'
    ],
    price: {
      type: 'unit',
      amount: 18000,
      unit: 'kg',
      estimate: true
    },
    qty: {
      label: 'Khối lượng ước tính (kg)',
      min: 3,
      max: 30
    },
    time: {
      mode: 'slot',
      label: 'Lấy đồ lúc',
      win: [
        '08:00',
        '18:00'
      ]
    },
    place: {
      mode: 'buyer',
      label: 'Lấy & trả tại'
    },
    opts: [
      {
        name: 'Nước xả',
        choices: [
          'Hương nhẹ',
          'Không mùi'
        ]
      },
      {
        name: 'Gấp đồ',
        choices: [
          'Gấp gọn',
          'Treo móc|+10.000đ'
        ]
      }
    ],
    qs: [
      {
        type: 'choice',
        label: 'Có đồ trắng cần giặt riêng?',
        opts: [
          'Không',
          'Có'
        ]
      }
    ],
    stock: {
      mode: 'open',
      sched: 'Nhận đồ 8:00 – 18:00 mỗi ngày'
    },
    notePh: 'Ví dụ: có 1 áo len giặt nhẹ tay…',
    steps: [
      'Đã gửi',
      'Đến lấy đồ',
      'Cân & báo giá',
      'Đang giặt',
      'Trả đồ'
    ]
  },
  fix: {
    key: 'fix',
    kind: 'Dịch vụ',
    cat: 'Sửa chữa',
    action: 'Gửi yêu cầu kiểm tra',
    title: 'Sửa laptop, điện thoại — kiểm tra tận nơi',
    imgs: [
      '1581092918056-0c4c3acd3789',
      '1597424216809-3ba9864aeb18',
      '1517336714731-489689fd1ca8',
      '1512054502232-10a0a035d672',
      '1520607162513-77705c0f0d4a'
    ],
    seller: {
      av: '1507003211169-0a1dd7228f2d',
      name: 'Anh Tùng',
      since: 'Thợ sửa máy trong khu · Shop 7',
      reply: 'Thường trả lời trong 30 phút'
    },
    facts: [
      [
        'receipt',
        'Phí kiểm tra',
        '50.000đ · trừ vào tiền sửa'
      ],
      [
        'clock',
        'Thời gian sửa',
        '1 – 3 ngày tùy lỗi'
      ],
      [
        'shield',
        'Bảo hành',
        '3 tháng cho linh kiện thay'
      ]
    ],
    desc: [
      'Nhận sửa laptop, điện thoại các hãng: chạy chậm, không lên nguồn, thay pin, thay màn, cài lại máy, cứu dữ liệu.',
      'Mình kiểm tra trước và báo giá. Bạn đồng ý thì mới sửa, không đồng ý chỉ trả phí kiểm tra.'
    ],
    list: [
      'Báo giá rõ từng linh kiện trước khi làm',
      'Không tự ý thay linh kiện khi chưa hỏi'
    ],
    price: {
      type: 'quote',
      inspect: 50000
    },
    qty: null,
    time: {
      mode: 'slot',
      label: 'Hẹn kiểm tra lúc',
      win: [
        '09:00',
        '20:00'
      ]
    },
    place: {
      mode: 'choice',
      label: 'Kiểm tra ở đâu',
      choices: [
        [
          'Mang tới tiệm (Shop 7)',
          0
        ],
        [
          'Thợ đến nhà',
          30000
        ]
      ]
    },
    opts: [],
    qs: [
      {
        type: 'text',
        label: 'Hãng / dòng máy',
        ph: 'Ví dụ: Dell Inspiron 15, iPhone 12',
        req: true
      },
      {
        type: 'text',
        label: 'Máy bị sao?',
        ph: 'Ví dụ: bật không lên, sạc không vào…',
        req: true,
        long: true
      },
      {
        type: 'photo',
        label: 'Ảnh lỗi (nếu có)'
      },
      {
        type: 'choice',
        label: 'Cần sao lưu dữ liệu trước?',
        opts: [
          'Không',
          'Có'
        ]
      }
    ],
    stock: {
      mode: 'open',
      sched: 'Nhận máy 9:00 – 20:00, nghỉ Chủ nhật'
    },
    notePh: 'Thêm thông tin cho thợ (không bắt buộc)…',
    steps: [
      'Đã gửi',
      'Hẹn kiểm tra',
      'Báo giá',
      'Bạn đồng ý',
      'Đang sửa',
      'Hoàn thành'
    ]
  },
  clean: {
    key: 'clean',
    kind: 'Dịch vụ',
    cat: 'Dọn dẹp',
    action: 'Đặt lịch',
    xuOk: true,
    title: 'Dọn nhà theo giờ, có thể đặt hằng tuần',
    imgs: [
      '1581578731548-c64695cc6952',
      '1527515637462-cff94eecc1ac',
      '1584622650111-993a426fbf0a',
      '1628177142898-93e36e4e3a50',
      '1556911220-bff31c812dba'
    ],
    seller: {
      av: '1438761681033-6461ffad8d80',
      name: 'Cô Ba',
      since: 'Hàng xóm từ 2021 · Block A',
      reply: 'Thường trả lời trong 1 giờ'
    },
    facts: [
      [
        'clock',
        'Thời lượng tối thiểu',
        '2 giờ mỗi lần'
      ],
      [
        'pin',
        'Khu phục vụ',
        'Block A – D'
      ],
      [
        'check',
        'Dụng cụ',
        'Cô mang theo dụng cụ cơ bản'
      ]
    ],
    desc: [
      'Lau nhà, hút bụi, vệ sinh bếp và nhà tắm, gấp đồ. Làm kỹ, nhanh, đã dọn cho nhiều nhà trong khu.',
      'Đặt lịch lặp lại hằng tuần thì cô giữ cố định khung giờ cho nhà mình.'
    ],
    list: [
      'Hóa chất tẩy rửa mạnh: nhà tự chuẩn bị nếu cần',
      'Báo trước 12 tiếng nếu đổi lịch'
    ],
    price: {
      type: 'unit',
      amount: 120000,
      unit: 'giờ'
    },
    qty: null,
    time: {
      mode: 'datedur',
      label: 'Ngày & giờ',
      win: [
        '07:00',
        '17:00'
      ],
      dur: [
        2,
        6
      ],
      repeat: true
    },
    place: {
      mode: 'buyer',
      label: 'Địa chỉ dọn'
    },
    opts: [],
    qs: [
      {
        type: 'choice',
        label: 'Diện tích nhà',
        opts: [
          'Dưới 50m²',
          '50 – 80m²',
          'Trên 80m²'
        ]
      },
      {
        type: 'multi',
        label: 'Việc cần làm',
        opts: [
          'Lau nhà',
          'Vệ sinh bếp',
          'Vệ sinh nhà tắm',
          'Gấp đồ'
        ]
      },
      {
        type: 'choice',
        label: 'Nhà có nuôi thú cưng?',
        opts: [
          'Không',
          'Có'
        ]
      }
    ],
    stock: {
      mode: 'open',
      sched: 'Nhận lịch 7:00 – 17:00, thứ 2 – thứ 7'
    },
    notePh: 'Ví dụ: chìa khóa gửi ở quầy lễ tân…',
    safety: true,
    steps: [
      'Đã gửi',
      'Chờ xác nhận',
      'Đến lịch',
      'Hoàn thành'
    ]
  },
  trip: {
    key: 'trip',
    kind: 'Dịch vụ',
    cat: 'Giao nhận hộ',
    action: 'Đặt lấy hộ',
    explain: 'Minh nhận lấy đồ hộ — bạn đặt, Minh đi lấy và giao tận cửa cho bạn.',
    title: 'Lấy đồ hộ, giao nhận trong khu',
    imgs: [
      '1617347454431-f49d7ff5c3b1',
      '1580674285054-bed31e145f59',
      '1542838132-92c53300491e',
      '1601598851547-4302969d0614',
      '1586528116311-ad8dd3c8310d'
    ],
    seller: {
      av: '1500648767791-00dcc994a43e',
      name: 'Minh',
      since: 'Sinh viên, hàng xóm Block B',
      reply: 'Thường trả lời trong 5 phút'
    },
    facts: [
      [
        'receipt',
        'Giá mỗi lượt',
        '15.000đ trong khu'
      ],
      [
        'pin',
        'Phạm vi',
        'Trong khu & cổng chính'
      ],
      [
        'bolt',
        'Thời gian',
        'Thường trong 20 phút'
      ]
    ],
    desc: [
      'Mình nhận lấy đồ hộ: hàng ship ở cổng, đồ ăn ở quầy, gửi đồ sang block khác. Có thể ứng tiền trả giùm, bạn trả lại khi nhận.'
    ],
    list: [
      'Đồ to, nặng (trên 10kg) phụ thu 10.000đ',
      'Không nhận đồ dễ vỡ không đóng gói'
    ],
    price: {
      type: 'fixed',
      amount: 15000,
      unit: 'lượt'
    },
    qty: null,
    time: {
      mode: 'slot',
      label: 'Lúc nào',
      win: [
        '07:00',
        '22:00'
      ]
    },
    place: {
      mode: 'ab',
      label: 'Lấy & giao'
    },
    opts: [],
    qs: [
      {
        type: 'text',
        label: 'Lấy món gì?',
        ph: 'Ví dụ: 1 thùng hàng Shopee tên Thu Hà',
        req: true
      },
      {
        type: 'choice',
        label: 'Kích thước',
        opts: [
          'Nhỏ, dưới 10kg',
          'To / nặng từ 10kg|+10.000đ'
        ],
        hint: 'Chọn nhầm cũng không sao: nếu đồ thực tế to hơn, Minh sẽ báo phụ thu để bạn đồng ý trước khi mang lên.'
      },
      {
        type: 'choice',
        label: 'Cần trả tiền giùm?',
        opts: [
          'Không',
          'Có'
        ],
        pay: true
      }
    ],
    stock: {
      mode: 'open',
      sched: 'Nhận đơn 7:00 – 22:00'
    },
    notePh: 'Ví dụ: gọi mình khi tới cổng…',
    steps: [
      'Đã gửi',
      'Minh đã nhận đơn',
      'Đang đi lấy',
      'Đã giao'
    ]
  }
} as unknown as Record<TemplateKey, PostTemplate>;
