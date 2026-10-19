// Bộ dữ liệu NHỎ và CỐ ĐỊNH chỉ để chạy test (7 người dùng, 8 bài, 5 việc). Bộ dữ liệu mẫu đầy đủ ở src/seeds/seed.js.
const bcrypt = require('bcryptjs');
const User = require('../src/modules/shared/user.model');
const Post = require('../src/modules/shared/post.model');
const Job = require('../src/modules/shared/job.model');
const { Counter } = require('../src/modules/shared/counter.model');

// Mật khẩu tài khoản mẫu lấy từ biến môi trường SEED_PASSWORD (.env), không viết cứng trong repo
const getPassword = () => {
  const pw = process.env.SEED_PASSWORD;
  if (!pw || pw.length < 6) throw new Error('Cần đặt SEED_PASSWORD (tối thiểu 6 ký tự) trong server/.env trước khi chạy seed');
  return pw;
};
const img = (id) => `https://images.unsplash.com/photo-${id}?w=800`;

const USERS = [
  { name: 'Ngọc Thủy', phone: '0900000001', area: 'B' },           // người dùng chính (người mua)
  { name: 'Bếp Cô Lan', phone: '0900000002', area: 'B' },
  { name: 'Quán Nhà Mây', phone: '0900000003', area: 'B' },
  { name: 'Chị Hoa', phone: '0900000004', area: 'B' },
  { name: 'Quốc Anh', phone: '0900000005', area: 'B' },
  { name: 'Giặt sấy Mỹ Linh', phone: '0900000006', area: 'C' },
  { name: 'Quản trị viên', phone: '0900000099', area: 'B', role: 'admin' }, // admin tạo bằng seed, không đăng ký công khai được
];

async function seed() {
  // chỉ xóa 3 collection do seed tạo; user chạy lại theo số điện thoại
  await Promise.all([Post.deleteMany({}), Job.deleteMany({}), Counter.deleteMany({})]);
  const password = getPassword();
  const hash = await bcrypt.hash(password, 10);
  const u = {};
  for (const d of USERS) {
    u[d.phone] = await User.findOneAndUpdate({ phone: d.phone }, { role: 'enduser', status: 'active', ...d, password: hash }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
  }
  const [thuy, lan, may, hoa, quoc, linh] = USERS.slice(0, 6).map((d) => u[d.phone]);

  const posts = [
    { type: 'food', category: 'Đồ ăn', title: 'Cơm nhà làm, thực đơn đổi mỗi ngày', description: 'Cơm nhà nấu bữa trưa, có món mặn, canh và rau, ăn no bụng.', price: 35000, unit: 'phần', seller: lan, area: 'B', distance: 150, acceptsXu: true,
      images: [img('1504674900247-0877df9cc836')], fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 7000,
      optionGroups: [
        { name: 'Món mặn', required: true, multi: false, choices: [{ label: 'Gà kho gừng', price: 0 }, { label: 'Sườn rim', price: 10000 }] },
        { name: 'Thêm', multi: true, choices: [{ label: 'Trứng', price: 5000 }, { label: 'Canh', price: 8000 }] },
      ] },
    { type: 'food', category: 'Đồ ăn', title: 'Phở bò tái, nước dùng hầm xương', description: 'Phở bò tái, món nước nóng cho bữa trưa, nước dùng hầm xương nhiều giờ.', price: 45000, unit: 'tô', seller: lan, area: 'D', distance: 250, acceptsXu: true,
      images: [img('1569718212165-3a8278d5f624')], fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 8000 },
    { type: 'food', category: 'Đồ uống', title: 'Trà sữa trân châu đường đen', description: 'Đồ uống mát, trà sữa trân châu đường đen, chọn size và độ ngọt.', price: 30000, unit: 'ly', seller: may, area: 'Shop 5', distance: 300, acceptsXu: true,
      images: [img('1558857563-b371033873b8')], fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 5000,
      optionGroups: [
        { name: 'Size', required: true, choices: [{ label: 'M', price: 0 }, { label: 'L', price: 6000 }] },
        { name: 'Độ ngọt', required: true, choices: [{ label: '50%' }, { label: '100%' }] },
        { name: 'Topping', multi: true, choices: [{ label: 'Trân châu', price: 5000 }, { label: 'Pudding', price: 7000 }] },
      ] },
    { type: 'goods', category: 'Đồ dùng', title: 'Tai nghe chụp tai, còn bảo hành 8 tháng', description: 'Tai nghe chụp tai cũ còn bảo hành, âm thanh tốt, đồ điện tử.', price: 650000, unit: 'cái', seller: hoa, area: 'C', distance: 350,
      images: [img('1505740420928-5e560c06d30e')], fulfillmentModes: ['pickup'], stock: 1, oneTime: true },
    { type: 'goods', category: 'Đồ dùng', title: 'Xe đạp thể thao, đi được 1 năm', description: 'Xe đạp thể thao cũ đi được một năm, còn tốt.', price: 1800000, unit: 'chiếc', seller: quoc, area: 'D', distance: 500,
      images: [img('1485965120184-e220f721d03e')], fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 30000, oneTime: true },
    { type: 'goods', category: 'Đồ dùng', title: 'Nồi chiên không dầu 5L, dùng 6 tháng', description: 'Nồi chiên không dầu dung tích 5 lít, đồ gia dụng nhà bếp dùng 6 tháng.', price: 650000, unit: 'cái', seller: hoa, area: 'A', distance: 450,
      images: [img('1556909114-f6e7ad7d3136')], fulfillmentModes: ['pickup'], oneTime: true },
    { type: 'service', category: 'Dịch vụ', title: 'Giặt sấy gấp, lấy và trả tận cửa', description: 'Giặt sấy gấp quần áo, lấy và trả tận cửa nhà.', price: 18000, unit: 'kg', seller: linh, area: 'Shop 12', distance: 300, acceptsXu: true,
      images: [img('1582735689369-4fe89db7114c')], fulfillmentModes: ['delivery'], deliveryFee: 0, needSchedule: true,
      questions: [{ label: 'Khối lượng ước tính (kg)', required: true }] },
    { type: 'service', category: 'Dịch vụ', title: 'Dọn nhà theo giờ', description: 'Dọn dẹp nhà cửa theo giờ, lau sàn, dọn bếp và phòng tắm.', price: 120000, unit: 'giờ', seller: quoc, area: 'A', distance: 450,
      images: [img('1581578731548-c64695cc6952')], fulfillmentModes: ['delivery'], needSchedule: true },
  ];
  const postDocs = await Post.insertMany(posts.map((p) => ({ ...p, seller: p.seller._id })));

  const day = (d, h) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x; };
  const jobs = [
    { title: 'Lấy giúp phần cơm ở cổng sau', category: 'Mua hộ', desc: 'Shipper để ở cổng sau, mang lên giúp tận cửa tầng 2.', pay: 30000, unit: 'lần', workTime: 'Hôm nay · 11:30', area: 'B', distance: 200, poster: hoa, exactAddress: 'Căn B-0203, tầng 2 Block B', windows: [day(1, 11), day(1, 12)] },
    { title: 'Dọn phòng cuối tuần', category: 'Việc nhà', desc: 'Phòng ngủ và phòng khách khoảng 40m², dụng cụ có sẵn.', pay: 80000, unit: 'buổi', workTime: 'CN · 9:00', area: 'B', distance: 300, poster: quoc, exactAddress: 'Căn B-1105, Block B', headcount: 2 },
    { title: 'Cho mèo ăn 3 ngày khi đi vắng', category: 'Thú cưng', desc: '2 bé mèo, cho ăn sáng tối và dọn cát mỗi ngày.', pay: 150000, unit: '3 ngày', workTime: '3 ngày liên tiếp', area: 'B', distance: 150, poster: hoa, exactAddress: 'Căn B-0807, Block B' },
    { title: 'Kèm Toán lớp 8, 2 buổi mỗi tuần', category: 'Gia sư', desc: 'Bé cần ôn hình học, học tại nhà, mỗi buổi 90 phút.', pay: 100000, unit: 'buổi', workTime: 'Tối T3 & T5', area: 'D', distance: 500, poster: lan, exactAddress: 'Căn D-0501, Block D' },
    { title: 'Chuyển 2 thùng đồ sang Block A', category: 'Vận chuyển', desc: 'Thùng sách và đồ bếp, có xe đẩy sẵn ở sảnh.', pay: 80000, unit: 'lần', workTime: 'Tối nay · 19:00', area: 'D', distance: 500, poster: quoc, exactAddress: 'Sảnh Block D' },
  ];
  const jobDocs = await Job.insertMany(jobs.map((j) => ({ ...j, poster: j.poster._id })));

  return { users: USERS.length, posts: postDocs.length, jobs: jobDocs.length };
}

module.exports = seed;
