// Dữ liệu mẫu cho `npm run seed`, lấy từ design/mockups (shared/catalog.js, home-v5.html).
// Ảnh: Unsplash (ID đã kiểm tra ở bản mẫu), chỉ để minh họa.
const img = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=70`;
// Ảnh chân dung người dùng mẫu (Unsplash, đã kiểm tra HTTP 200 và xem từng ảnh); cắt vuông quanh khuôn mặt
const face = (id) => `https://images.unsplash.com/photo-${id}?w=200&h=200&fit=crop&crop=faces&q=70`;
const AVATAR = {
  thuy: '1494790108377-be9c29b29330',
  lan: '1508214751196-bcfd4ca60f91',
  may: '1534528741775-53994a69daeb',
  hoa: '1438761681033-6461ffad8d80',
  quoc: '1500648767791-00dcc994a43e',
  linh: '1544005313-94ddf0286df2',
  admin: '1560250097-0b93528c311a',
  minh: '1507591064344-4c6ce005b128',
  phuong: '1580489944761-15a19d654956',
  tu: '1567532939604-b6b5b0db2604',
  sach: '1517841905240-472988babdf9',
  ngan: '1524504388940-b1c1722653e1',
  tuan: '1507003211169-0a1dd7228f2d',
  khoa: '1506794778202-cad84cf45f1d',
  ha: '1573496359142-b8d87734a5a2',
  tung: '1535713875002-d1d0cf377fde',
  ba: '1554151228-14d9def656e4',
  vp: '1472099645785-5658abf4ff4e',
};
const IMG = {
  com: '1504674900247-0877df9cc836', pho: '1569718212165-3a8278d5f624', mi: '1585032226651-759b368d7246',
  dau: '1604908176997-125f25cc6f3d', salad: '1540189549336-e6e99c3679fe', rau: '1542838132-92c53300491e',
  cafe: '1509042239860-f550ce710b93', trasua: '1558857563-b371033873b8',
  taiNghe: '1505740420928-5e560c06d30e', sofa: '1555041469-a586c61ea9bc', xeDap: '1485965120184-e220f721d03e',
  ghe: '1592078615290-033ee584e267', noi: '1556909114-f6e7ad7d3136',
  giat: '1582735689369-4fe89db7114c', don: '1581578731548-c64695cc6952', cho: '1587300003388-59208cc962cb',
  mayLanh: '1563453392212-326f5e854473', laptop: '1581092918056-0c4c3acd3789',
};

// key dùng để tham chiếu trong seed.js; 7 tài khoản đầu giữ nguyên số điện thoại cũ
const USERS = [
  { key: 'thuy', avatar: face(AVATAR.thuy), name: 'Ngọc Thủy', phone: '0900000001', area: 'B' },            // người dùng chính (người mua + nhận việc)
  { key: 'lan', avatar: face(AVATAR.lan), name: 'Bếp Cô Lan', phone: '0900000002', area: 'B' },
  { key: 'may', avatar: face(AVATAR.may), name: 'Quán Nhà Mây', phone: '0900000003', area: 'B' },
  { key: 'hoa', avatar: face(AVATAR.hoa), name: 'Chị Hoa', phone: '0900000004', area: 'B' },
  { key: 'quoc', avatar: face(AVATAR.quoc), name: 'Quốc Anh', phone: '0900000005', area: 'B' },
  { key: 'linh', avatar: face(AVATAR.linh), name: 'Giặt sấy Mỹ Linh', phone: '0900000006', area: 'C' },
  { key: 'admin', avatar: face(AVATAR.admin), name: 'Quản trị viên', phone: '0900000099', area: 'B', role: 'admin' }, // admin chỉ tạo bằng seed
  { key: 'minh', avatar: face(AVATAR.minh), name: 'Minh', phone: '0900000007', area: 'B' },
  { key: 'phuong', avatar: face(AVATAR.phuong), name: 'Phương', phone: '0900000008', area: 'D' },
  { key: 'tu', avatar: face(AVATAR.tu), name: 'Quán Phở Bà Tư', phone: '0900000009', area: 'D' },
  { key: 'sach', avatar: face(AVATAR.sach), name: 'Tiệm Sạch Thơm', phone: '0900000010', area: 'A' },
  { key: 'ngan', avatar: face(AVATAR.ngan), name: 'Chị Ngân', phone: '0900000011', area: 'B' },
  { key: 'tuan', avatar: face(AVATAR.tuan), name: 'Anh Tuấn', phone: '0900000012', area: 'D' },
  { key: 'khoa', avatar: face(AVATAR.khoa), name: 'Minh Khoa', phone: '0900000013', area: 'D' },
  { key: 'ha', avatar: face(AVATAR.ha), name: 'Thu Hà', phone: '0900000014', area: 'B' },
  { key: 'tung', avatar: face(AVATAR.tung), name: 'Anh Tùng', phone: '0900000015', area: 'C' },
  { key: 'ba', avatar: face(AVATAR.ba), name: 'Cô Ba', phone: '0900000016', area: 'A' },
  { key: 'vp', avatar: face(AVATAR.vp), name: 'Tài khoản vi phạm (mẫu)', phone: '0900000030', area: 'C', status: 'locked', lockedReason: 'Đăng tin lừa đảo (dữ liệu mẫu cho trang Quản trị)' },
];

const MEAL = [
  { name: 'Món mặn', required: true, choices: [{ label: 'Gà kho gừng' }, { label: 'Sườn rim', price: 10000 }, { label: 'Cá kho', price: 5000 }] },
  { name: 'Thêm', multi: true, choices: [{ label: 'Trứng', price: 5000 }, { label: 'Canh', price: 8000 }] },
];
const DRINK = [
  { name: 'Size', required: true, choices: [{ label: 'M' }, { label: 'L', price: 6000 }] },
  { name: 'Độ ngọt', required: true, choices: [{ label: '50%' }, { label: '100%' }] },
  { name: 'Topping', multi: true, choices: [{ label: 'Trân châu', price: 5000 }, { label: 'Pudding', price: 7000 }] },
];
const DELIVER = { fulfillmentModes: ['delivery', 'pickup'] };

// seller: key trong USERS. `daysAgo` rải ngày đăng để sắp xếp "mới nhất" có ý nghĩa.
const POSTS = [
  // ---- Đồ ăn ----
  { key: 'com', type: 'food', category: 'Đồ ăn', title: 'Cơm nhà làm, thực đơn đổi mỗi ngày', description: 'Cơm nhà nấu bữa trưa, có món mặn, canh và rau, ăn no bụng.', price: 35000, unit: 'phần', seller: 'lan', area: 'B', distance: 150, acceptsXu: true, images: [IMG.com], ...DELIVER, deliveryFee: 7000, optionGroups: MEAL, daysAgo: 1 },
  { key: 'pho', type: 'food', category: 'Đồ ăn', title: 'Phở bò tái, nước dùng hầm xương', description: 'Phở bò tái, món nước nóng cho bữa trưa, nước dùng hầm xương nhiều giờ.', price: 45000, unit: 'tô', seller: 'tu', area: 'D', distance: 250, acceptsXu: true, images: [IMG.pho], ...DELIVER, deliveryFee: 8000, optionGroups: [{ name: 'Thêm', multi: true, choices: [{ label: 'Tái nạm', price: 10000 }, { label: 'Quẩy', price: 3000 }] }], daysAgo: 2 },
  { key: 'mi', type: 'food', category: 'Đồ ăn', title: 'Mì xào hải sản', description: 'Mì xào tôm mực rau củ, nóng giòn, phần vừa ăn một người.', price: 40000, unit: 'phần', seller: 'tu', area: 'C', distance: 400, images: [IMG.mi], ...DELIVER, deliveryFee: 8000, daysAgo: 3 },
  { key: 'dau', type: 'food', category: 'Đồ ăn', title: 'Đậu sốt cà chua', description: 'Đậu hũ sốt cà chua món chay, ăn cùng cơm nóng.', price: 30000, unit: 'phần', seller: 'lan', area: 'A', distance: 300, images: [IMG.dau], ...DELIVER, deliveryFee: 7000, daysAgo: 4 },
  { key: 'salad', type: 'food', category: 'Đồ ăn', title: 'Salad ức gà', description: 'Salad ức gà áp chảo, rau xanh và sốt mè, món ăn nhẹ ít calo.', price: 45000, unit: 'hộp', seller: 'sach', area: 'B', distance: 180, images: [IMG.salad], ...DELIVER, deliveryFee: 7000, daysAgo: 5 },
  { key: 'banhmi', type: 'food', category: 'Đồ ăn', title: 'Bánh mì que pate nhà làm', description: 'Bánh mì que giòn, nhân pate tự làm, ăn sáng nhanh gọn.', price: 12000, unit: 'cái', seller: 'ba', area: 'A', distance: 350, images: [IMG.com], fulfillmentModes: ['pickup'], daysAgo: 6 },
  { key: 'chao', type: 'food', category: 'Đồ ăn', title: 'Cháo sườn sáng, nấu mỗi ngày', description: 'Cháo sườn nóng cho bữa sáng, thêm hành phi và quẩy.', price: 25000, unit: 'tô', seller: 'ba', area: 'A', distance: 360, images: [IMG.pho], ...DELIVER, deliveryFee: 6000, daysAgo: 7 },
  { key: 'bunbo', type: 'food', category: 'Đồ ăn', title: 'Bún bò Huế cay vừa', description: 'Bún bò Huế nước dùng đậm đà, món nước cay vừa ăn cho bữa trưa.', price: 48000, unit: 'tô', seller: 'tu', area: 'D', distance: 260, images: [IMG.pho], ...DELIVER, deliveryFee: 8000, daysAgo: 8 },
  { key: 'cafe', type: 'food', category: 'Đồ uống', title: 'Cà phê sữa đá', description: 'Cà phê phin pha sữa đá, đậm vị, uống tỉnh táo buổi sáng.', price: 25000, unit: 'ly', seller: 'may', area: 'Shop 3', distance: 200, images: [IMG.cafe], ...DELIVER, deliveryFee: 5000, optionGroups: [{ name: 'Đá', required: true, choices: [{ label: 'Nhiều đá' }, { label: 'Ít đá' }] }], daysAgo: 2 },
  { key: 'trasua', type: 'food', category: 'Đồ uống', title: 'Trà sữa trân châu đường đen', description: 'Đồ uống mát, trà sữa trân châu đường đen, chọn size và độ ngọt.', price: 30000, unit: 'ly', seller: 'may', area: 'Shop 5', distance: 300, acceptsXu: true, images: [IMG.trasua], ...DELIVER, deliveryFee: 5000, optionGroups: DRINK, daysAgo: 3 },
  { key: 'epcam', type: 'food', category: 'Đồ uống', title: 'Nước ép cam tươi', description: 'Nước ép cam vắt tươi không đường, đồ uống mát giàu vitamin C.', price: 28000, unit: 'ly', seller: 'may', area: 'Shop 3', distance: 210, images: [IMG.cafe], ...DELIVER, deliveryFee: 5000, daysAgo: 9 },

  // ---- Đồ dùng ----
  { key: 'taiNghe', type: 'goods', category: 'Đồ dùng', title: 'Tai nghe chụp tai, còn bảo hành 8 tháng', description: 'Tai nghe chụp tai cũ còn bảo hành, âm thanh tốt, đồ điện tử.', price: 650000, unit: 'cái', seller: 'hoa', area: 'C', distance: 350, images: [IMG.taiNghe], fulfillmentModes: ['pickup'], stock: 1, oneTime: true, daysAgo: 2 },
  { key: 'sofa', type: 'goods', category: 'Đồ dùng', title: 'Sofa vải 3 chỗ, chuyển nhà cần nhượng', description: 'Sofa vải ba chỗ ngồi, nội thất phòng khách, chuyển nhà cần nhượng lại.', price: 2500000, unit: 'cái', seller: 'ngan', area: 'A', distance: 400, images: [IMG.sofa], fulfillmentModes: ['pickup'], oneTime: true, daysAgo: 4 },
  { key: 'xeDap', type: 'goods', category: 'Đồ dùng', title: 'Xe đạp thể thao, đi được 1 năm', description: 'Xe đạp thể thao cũ đi được một năm, còn tốt.', price: 1800000, unit: 'chiếc', seller: 'quoc', area: 'D', distance: 500, images: [IMG.xeDap], ...DELIVER, deliveryFee: 30000, oneTime: true, daysAgo: 5 },
  { key: 'ghe', type: 'goods', category: 'Đồ dùng', title: 'Ghế ăn nhựa chân gỗ, bộ 2 cái', description: 'Bộ hai ghế ăn nhựa chân gỗ, nội thất phòng bếp, còn mới.', price: 300000, unit: 'bộ', seller: 'tuan', area: 'B', distance: 200, images: [IMG.ghe], fulfillmentModes: ['pickup'], oneTime: true, daysAgo: 6 },
  { key: 'noi', type: 'goods', category: 'Đồ dùng', title: 'Nồi chiên không dầu 5L, dùng 6 tháng', description: 'Nồi chiên không dầu dung tích 5 lít, đồ gia dụng nhà bếp dùng 6 tháng.', price: 650000, unit: 'cái', seller: 'hoa', area: 'A', distance: 450, images: [IMG.noi], fulfillmentModes: ['pickup'], oneTime: true, daysAgo: 7 },
  { key: 'rau', type: 'goods', category: 'Đồ dùng', title: 'Rau củ sạch theo combo', description: 'Combo rau củ sạch trồng tại vườn, giao trong ngày, nấu bữa cơm gia đình.', price: 40000, unit: 'combo', seller: 'sach', area: 'A', distance: 500, images: [IMG.rau], ...DELIVER, deliveryFee: 8000, stock: 20, daysAgo: 1 },
  { key: 'quat', type: 'goods', category: 'Đồ dùng', title: 'Quạt đứng 3 tốc độ, còn chạy êm', description: 'Quạt đứng ba tốc độ, đồ gia dụng còn chạy êm, nhượng lại giá rẻ.', price: 180000, unit: 'cái', seller: 'khoa', area: 'D', distance: 520, images: [IMG.ghe], fulfillmentModes: ['pickup'], oneTime: true, daysAgo: 10 },

  // ---- Dịch vụ ----
  { key: 'giat', type: 'service', category: 'Dịch vụ', title: 'Giặt sấy gấp, lấy và trả tận cửa', description: 'Giặt sấy gấp quần áo, lấy và trả tận cửa nhà.', price: 18000, unit: 'kg', seller: 'linh', area: 'Shop 12', distance: 300, acceptsXu: true, images: [IMG.giat], fulfillmentModes: ['delivery'], needSchedule: true, questions: [{ label: 'Khối lượng ước tính (kg)', required: true }], daysAgo: 3 },
  { key: 'don', type: 'service', category: 'Dịch vụ', title: 'Dọn nhà theo giờ', description: 'Dọn dẹp nhà cửa theo giờ, lau sàn, dọn bếp và phòng tắm.', price: 120000, unit: 'giờ', seller: 'quoc', area: 'A', distance: 450, images: [IMG.don], fulfillmentModes: ['delivery'], needSchedule: true, daysAgo: 4 },
  { key: 'cho', type: 'service', category: 'Dịch vụ', title: 'Dắt chó đi dạo buổi chiều', description: 'Dắt chó đi dạo trong khu buổi chiều, cho uống nước, báo ảnh chủ nhà.', price: 50000, unit: 'lượt', seller: 'minh', area: 'B', distance: 250, images: [IMG.cho], fulfillmentModes: ['delivery'], needSchedule: true, daysAgo: 6 },
  { key: 'mayLanh', type: 'service', category: 'Dịch vụ', title: 'Vệ sinh máy lạnh', description: 'Vệ sinh máy lạnh tại nhà, rửa dàn lạnh, kiểm tra gas, thợ đến nhà.', price: 150000, unit: 'máy', seller: 'tung', area: 'D', distance: 600, images: [IMG.mayLanh], fulfillmentModes: ['delivery'], needSchedule: true, questions: [{ label: 'Số lượng máy lạnh', required: true }], daysAgo: 5 },
  { key: 'laptop', type: 'service', category: 'Dịch vụ', title: 'Sửa laptop, điện thoại — kiểm tra tận nơi', description: 'Sửa laptop điện thoại, kiểm tra tận nơi, báo giá trước khi sửa.', price: 50000, unit: 'kiểm tra', seller: 'tung', area: 'Shop 7', distance: 600, images: [IMG.laptop], fulfillmentModes: ['delivery'], needSchedule: true, questions: [{ label: 'Mô tả lỗi', required: true }], daysAgo: 8 },
  { key: 'giaonhan', type: 'service', category: 'Dịch vụ', title: 'Giao nhận hộ trong khu', description: 'Lấy giúp và giao hộ đồ trong khu, đồ dưới 10kg, nhận hộ shipper.', price: 20000, unit: 'lượt', seller: 'minh', area: 'B', distance: 200, images: [IMG.don], fulfillmentModes: ['delivery'], questions: [{ label: 'Kích thước đồ (dưới 10kg?)', required: true }], daysAgo: 9 },

  // ---- Bài bị gỡ (dữ liệu mẫu cho trang Quản trị) ----
  { key: 'vipham', type: 'goods', category: 'Đồ dùng', title: 'Điện thoại giá rẻ bất ngờ, chuyển khoản trước', description: 'Bài mẫu bị gỡ vì yêu cầu chuyển khoản trước, nghi ngờ lừa đảo.', price: 500000, unit: 'cái', seller: 'vp', area: 'C', distance: 700, images: [IMG.taiNghe], fulfillmentModes: ['pickup'], status: 'hidden', hiddenReason: 'Yêu cầu chuyển khoản trước, nghi ngờ lừa đảo', statusBeforeHidden: 'open', daysAgo: 12 },
];

// poster: key trong USERS. windows = số ngày tới + giờ để tạo khung giờ chọn.
const JOBS = [
  { key: 'comCong', title: 'Lấy giúp phần cơm ở cổng sau', category: 'Mua hộ', desc: 'Shipper để ở cổng sau, mang lên giúp tận cửa tầng 2.', pay: 30000, unit: 'lần', workTime: 'Hôm nay · 11:30', area: 'B', distance: 200, poster: 'ha', exactAddress: 'Căn B-0203, tầng 2 Block B', windows: [[1, 11], [1, 12]], daysAgo: 0 },
  { key: 'donPhong', title: 'Dọn phòng cuối tuần', category: 'Việc nhà', desc: 'Phòng ngủ và phòng khách khoảng 40m², dụng cụ có sẵn.', pay: 80000, unit: 'buổi', workTime: 'CN · 9:00', area: 'B', distance: 300, poster: 'quoc', exactAddress: 'Căn B-1105, Block B', headcount: 2, daysAgo: 0 },
  { key: 'meo', title: 'Cho mèo ăn 3 ngày khi đi vắng', category: 'Thú cưng', desc: '2 bé mèo, cho ăn sáng tối và dọn cát mỗi ngày.', pay: 150000, unit: '3 ngày', workTime: '3 ngày liên tiếp', area: 'B', distance: 150, poster: 'ngan', exactAddress: 'Căn B-0807, Block B', daysAgo: 1 },
  { key: 'toan', title: 'Kèm Toán lớp 8, 2 buổi mỗi tuần', category: 'Gia sư', desc: 'Bé cần ôn hình học, học tại nhà, mỗi buổi 90 phút.', pay: 100000, unit: 'buổi', workTime: 'Tối T3 & T5', area: 'D', distance: 500, poster: 'khoa', exactAddress: 'Căn D-0501, Block D', daysAgo: 1 },
  { key: 'thung', title: 'Chuyển 2 thùng đồ sang Block A', category: 'Vận chuyển', desc: 'Thùng sách và đồ bếp, có xe đẩy sẵn ở sảnh.', pay: 80000, unit: 'lần', workTime: 'Tối nay · 19:00', area: 'D', distance: 500, poster: 'tuan', exactAddress: 'Sảnh Block D', daysAgo: 0 },
  { key: 'tuoiCay', title: 'Tìm người tưới cây ban công 3 ngày', category: 'Việc nhà', desc: 'Khoảng 10 chậu cây ban công, tưới mỗi sáng, có vòi nước sẵn.', pay: 90000, unit: '3 ngày', workTime: '3 ngày liên tiếp', area: 'B', distance: 220, poster: 'hoa', exactAddress: 'Căn B-0310, Block B', daysAgo: 2 },
  { key: 'tuLanh', title: 'Khiêng giúp tủ lạnh lên tầng 5', category: 'Vận chuyển', desc: 'Tủ lạnh 150 lít, cần hai người khiêng, không có thang máy.', pay: 200000, unit: 'lần', workTime: 'Thứ bảy · 8:00', area: 'C', distance: 380, poster: 'tung', exactAddress: 'Căn C-0501, Block C', headcount: 2, daysAgo: 2 },
  { key: 'choToi', title: 'Dắt chó đi dạo buổi tối', category: 'Thú cưng', desc: 'Chó poodle nhỏ, đi dạo 30 phút trong khu, ngoan và quen người.', pay: 40000, unit: 'buổi', workTime: 'Hằng ngày · 19:00', area: 'B', distance: 180, poster: 'ngan', exactAddress: 'Căn B-0807, Block B', daysAgo: 3 },
  { key: 'tohop', title: 'Phát tờ rơi quán mới trong khu', category: 'Việc vặt', desc: 'Phát 200 tờ rơi cho các căn hộ trong Block B, có người dẫn đường.', pay: 120000, unit: 'buổi', workTime: 'Chủ nhật · 8:00', area: 'B', distance: 250, poster: 'may', exactAddress: 'Quán Nhà Mây, Shop 5', daysAgo: 3 },
  { key: 'anh', title: 'Chụp ảnh sản phẩm tại nhà', category: 'Việc vặt', desc: 'Chụp khoảng 15 món đồ thủ công để đăng bán, có đèn và phông sẵn.', pay: 250000, unit: 'buổi', workTime: 'Cuối tuần', area: 'A', distance: 480, poster: 'ba', exactAddress: 'Căn A-0204, Block A', daysAgo: 4 },
  { key: 'anhVan', title: 'Dạy tiếng Anh giao tiếp cho bé lớp 3', category: 'Gia sư', desc: 'Bé cần luyện nói tiếng Anh cơ bản, mỗi buổi 60 phút tại nhà.', pay: 120000, unit: 'buổi', workTime: 'Tối T2 & T4', area: 'D', distance: 510, poster: 'khoa', exactAddress: 'Căn D-0501, Block D', daysAgo: 5 },
  { key: 'xong', title: 'Nhận hộ gói hàng khi vắng nhà', category: 'Mua hộ', desc: 'Nhận hộ một gói hàng lúc 15:00 và để ở sảnh, mình về lấy sau.', pay: 25000, unit: 'lần', workTime: 'Hôm qua · 15:00', area: 'C', distance: 330, poster: 'tung', exactAddress: 'Căn C-0102, Block C', status: 'done', daysAgo: 6 },
];

module.exports = { USERS, POSTS, JOBS, img };
