// Bổ sung thông tin cho các bài mẫu "trơ" (chỉ có tên/giá/ảnh) để nhìn như bài người bán đăng thật theo form mới
// (docs/post-contract.md). Khóa = tiêu đề bài. Dùng ở 2 nơi:
//  - seeds/seed.js: trộn vào bài khi seed;
//  - scripts/enrich-posts.js: điền vào DB đang chạy (chỉ điền trường còn thiếu, không đè dữ liệu có sẵn).
// Mỗi bài có bộ trường RIÊNG (không điền hàng loạt giống nhau) — đúng quyết định "bài chuẩn mẫu, trường do người bán tự thêm".

const DATES = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
const BCONS = ['Bcons'];
const VGP = ['Vinhomes Grand Park'];
const CT = ['cash', 'transfer'];
const CTX = ['cash', 'transfer', 'xu'];

// Tài khoản nhận chuyển khoản MẪU theo tên người bán (số giả, chủ tài khoản ghi "(MAU)")
const BANK_BY_NAME = {
  'Bếp Cô Lan': { bankName: 'MBBank', no: '0123456789', holder: 'BEP CO LAN (MAU)' },
  'Quán Phở Bà Tư': { bankName: 'ACB', no: '0000100548', holder: 'CHI HOA (MAU)' },
  'Tiệm Sạch Thơm': { bankName: 'Vietcombank', no: '0123456789', holder: 'TIEM SACH THOM (MAU)' },
  'Quán Nhà Mây': { bankName: 'MBBank', no: '0000101233', holder: 'QUAN NHA MAY (MAU)' },
  'Chị Ngân': { bankName: 'VietinBank', no: '0000101781', holder: 'CHI NGAN (MAU)' },
  'Anh Tuấn': { bankName: 'ACB', no: '0000100548', holder: 'ANH TUAN (MAU)' },
  Minh: { bankName: 'BIDV', no: '0000101370', holder: 'MINH (MAU)' },
  'Minh Khoa': { bankName: 'ACB', no: '0000101644', holder: 'MINH KHOA (MAU)' },
  'Anh Tùng': { bankName: 'Techcombank', no: '0000101507', holder: 'ANH TUNG (MAU)' },
  'Phương': { bankName: 'Vietcombank', no: '0000101096', holder: 'PHUONG (MAU)' },
  'Giặt sấy Mỹ Linh': { bankName: 'Vietcombank', no: '0123456789', holder: 'GIAT SAY MY LINH (MAU)' },
  'Cô Ba': { bankName: 'TPBank', no: '0000100822', holder: 'CO BA (MAU)' },
};

const food = (o) => ({ areas: BCONS, payMethods: CT, priceType: 'fixed', dates: DATES, freeShipFrom: 100000, ...o });
const goods = (o) => ({ areas: BCONS, payMethods: CT, priceType: 'fixed', dates: DATES, ...o });
const service = (o) => ({ areas: BCONS, payMethods: CT, dates: DATES, noteEnabled: true, ...o });
const g = (name, choices, extra = {}) => ({ name, multi: false, required: false, choices: choices.map(([label, price = 0]) => ({ label, price })), ...extra });

const ENRICH = {
  /* ---------- Đồ ăn & uống ---------- */
  'Bánh mì que pate nhà làm': food({
    freeShipFrom: undefined,
    orderWindow: { from: '05:30', to: '09:00', days: [] }, prepMinutes: 10, handover: { from: '06:00', to: '09:30' },
    optionGroups: [
      g('Nhân', [['Pate trứng'], ['Pate chà bông', 2000], ['Pate xúc xích', 3000]], { required: true }),
      g('Thêm', [['Tương ớt'], ['Dưa leo'], ['Ngò rí']], { multi: true }),
    ],
    quickOptions: ['Nhiều rau', 'Không cay'],
    info: [
      { label: 'Nguyên liệu', value: 'Pate tự làm trong ngày, bánh nướng giòn lúc nhận đơn' },
      { label: 'Cách nhận', value: 'Chỉ tự đến lấy tại sạp Cô Ba trước cổng Block B' },
    ],
  }),
  'Cháo sườn sáng, nấu mỗi ngày': food({
    orderWindow: { from: '05:30', to: '09:30', days: [] }, prepMinutes: 15, handover: { from: '06:00', to: '10:00' },
    optionGroups: [
      g('Khẩu phần', [['Tô thường'], ['Tô lớn', 8000]], { required: true }),
      g('Ăn kèm', [['Quẩy', 3000], ['Trứng muối', 5000], ['Hành phi']], { multi: true }),
    ],
    quickOptions: ['Ít hành', 'Nhiều tiêu'],
    info: [{ label: 'Nguyên liệu', value: 'Sườn heo non hầm mềm, gạo nấu nhừ, không dùng bột ngọt' }],
  }),
  'Bún bò Huế cay vừa': food({
    orderWindow: { from: '06:00', to: '13:00', days: [] }, prepMinutes: 20, handover: { from: '06:30', to: '13:30' },
    optionGroups: [
      g('Phần ăn', [['Tô thường'], ['Đặc biệt giò heo', 15000]], { required: true }),
      g('Thêm', [['Chả cua', 8000], ['Huyết', 5000], ['Rau sống']], { multi: true }),
    ],
    quickOptions: ['Không hành', 'Ít cay', 'Cay nhiều'],
    info: [
      { label: 'Nước dùng', value: 'Hầm xương 6 tiếng, nêm mắm ruốc Huế' },
      { label: 'Giao hàng', value: 'Nước dùng được đóng riêng để bún không bị nhũn' },
    ],
  }),
  'Nước ép cam tươi': food({
    orderWindow: { from: '07:00', to: '20:00', days: [] }, prepMinutes: 8, handover: { from: '07:30', to: '20:30' },
    optionGroups: [
      g('Độ ngọt', [['Không đường'], ['Ít đường'], ['Bình thường']], { required: true }),
      g('Đá', [['Không đá'], ['Ít đá'], ['Nhiều đá']], { required: true }),
    ],
    quickOptions: ['Lấy ống hút', 'Đóng chai riêng'],
    info: [{ label: 'Nguyên liệu', value: 'Cam sành vắt tươi từng ly, không pha nước đóng chai' }],
  }),
  'Xôi mặn sáng, đủ topping': food({
    orderWindow: { from: '05:00', to: '09:00', days: [] }, prepMinutes: 10, handover: { from: '05:30', to: '09:30' },
    optionGroups: [
      g('Topping', [['Chà bông'], ['Trứng cút', 4000], ['Pate', 3000], ['Lạp xưởng', 6000]], { multi: true }),
    ],
    quickOptions: ['Thêm hành phi', 'Không hành'],
    info: [{ label: 'Lưu ý', value: 'Xôi nấu mỗi sáng, hết là nghỉ — nên đặt trước 8 giờ' }],
  }),
  'Bún chả Hà Nội, nem rán giòn': food({
    orderWindow: { from: '10:00', to: '13:30', days: [] }, prepMinutes: 20, handover: { from: '10:30', to: '14:00' },
    optionGroups: [
      g('Thêm', [['2 chiếc nem rán', 12000], ['Chả viên', 10000], ['Bún thêm', 5000]], { multi: true }),
    ],
    quickOptions: ['Thêm rau sống', 'Ít nước chấm'],
    info: [
      { label: 'Nguyên liệu', value: 'Thịt nướng than hoa, nước chấm pha theo kiểu Hà Nội' },
      { label: 'Giao hàng', value: 'Thịt nướng và bún đóng riêng, giao nóng trong 15 phút' },
    ],
  }),
  'Cơm chay thập cẩm': food({
    areas: VGP, orderWindow: { from: '10:00', to: '13:00', days: [] }, prepMinutes: 25, handover: { from: '11:00', to: '13:30' },
    optionGroups: [
      g('Loại cơm', [['Gạo trắng'], ['Gạo lứt', 3000]], { required: true }),
      g('Món thêm', [['Đậu hũ chiên', 8000], ['Canh nấm', 10000]], { multi: true }),
    ],
    quickOptions: ['Không cay', 'Lấy dụng cụ ăn uống'],
    info: [{ label: 'Thành phần', value: 'Chay thuần thực vật, không trứng sữa, nêm gia vị tự nhiên' }],
  }),
  'Sữa chua nếp cẩm tự làm': food({
    freeShipFrom: undefined,
    orderWindow: { from: '08:00', to: '20:00', days: [] }, prepMinutes: 5, handover: { from: '08:30', to: '20:30' },
    optionGroups: [g('Đóng gói', [['Hũ thường'], ['Hộp quà 4 hũ', 15000]])],
    quickOptions: ['Lấy thìa nhựa'],
    info: [
      { label: 'Bảo quản', value: 'Giữ ngăn mát, dùng ngon nhất trong 2 ngày' },
      { label: 'Nguyên liệu', value: 'Sữa chua tự ủ, nếp cẩm nấu mềm, ít đường' },
    ],
  }),
  'Bánh flan caramel hộp 4 cái': food({
    orderWindow: { from: '08:00', to: '19:00', days: [] }, prepMinutes: 15, handover: { from: '09:00', to: '20:00' },
    optionGroups: [g('Đóng gói', [['Hộp thường'], ['Hộp quà', 5000]])],
    quickOptions: ['Lấy thìa nhựa', 'Thêm đá lạnh'],
    info: [{ label: 'Hạn dùng', value: 'Giữ ngăn mát, ngon nhất trong 2 ngày kể từ lúc nhận' }],
  }),
  'Tiệm xôi Yuumi - Nhận đơn đồ ăn sáng': food({
    orderWindow: { from: '05:00', to: '09:30', days: [] }, prepMinutes: 10, handover: { from: '05:30', to: '10:00' },
    quickOptions: ['Thêm hành phi', 'Lấy dụng cụ ăn uống'],
    info: [{ label: 'Lưu ý', value: 'Đặt trước 8 giờ sáng để kịp phần, quá giờ có thể hết xôi' }],
  }),

  /* ---------- Combo ---------- */
  'Combo bữa trưa nhà làm: cơm + đậu sốt cà chua + bánh flan': food({
    orderWindow: { from: '10:00', to: '13:00', days: [] }, prepMinutes: 30, handover: { from: '11:00', to: '13:30' },
    quickOptions: ['Lấy dụng cụ ăn uống', 'Ít cơm'],
    info: [{ label: 'Gồm', value: '1 phần cơm nhà làm, 1 đậu sốt cà chua, 1 hộp bánh flan' }],
  }),
  'Combo hai người: phở bò tái + bún chả': food({
    orderWindow: { from: '10:00', to: '13:30', days: [] }, prepMinutes: 25, handover: { from: '10:30', to: '14:00' },
    quickOptions: ['Không hành', 'Thêm rau sống'],
    info: [{ label: 'Gồm', value: '1 tô phở bò tái và 1 suất bún chả cho hai người ăn' }],
  }),
  'Combo giải khát: cà phê sữa đá + trà sữa trân châu': food({
    orderWindow: { from: '07:00', to: '20:00', days: [] }, prepMinutes: 10, handover: { from: '07:30', to: '20:30' },
    quickOptions: ['Lấy ống hút', 'Ít đá'],
    info: [{ label: 'Gồm', value: '1 ly cà phê sữa đá và 1 ly trà sữa trân châu size vừa' }],
  }),
  'Combo sáng no bụng: xôi mặn + cháo sườn + 2 bánh mì que': food({
    orderWindow: { from: '05:30', to: '09:00', days: [] }, prepMinutes: 15, handover: { from: '06:00', to: '09:30' },
    quickOptions: ['Ít hành', 'Lấy dụng cụ ăn uống'],
    info: [{ label: 'Gồm', value: '1 xôi mặn, 1 cháo sườn và 2 bánh mì que pate' }],
  }),

  /* ---------- Đồ dùng ---------- */
  'Quạt đứng 3 tốc độ, còn chạy êm': goods({
    handover: { from: '17:00', to: '21:00' },
    condition: { level: '80', note: 'Dùng 1 mùa hè, chạy êm, chân đế chắc. Có vài vết xước nhỏ ở thân quạt.' },
    info: [
      { label: 'Tình trạng chi tiết', value: 'Cả 3 tốc độ đều chạy tốt, không kêu, cánh quạt sạch' },
      { label: 'Lý do bán', value: 'Mới mua máy lạnh nên không dùng đến' },
      { label: 'Bảo hành', value: 'Không còn bảo hành, cho thử máy khi đến xem' },
    ],
  }),
  'Bếp từ đơn Sunhouse, còn bảo hành': goods({
    payMethods: CTX, handover: { from: '18:00', to: '22:00' },
    condition: { level: '90', note: 'Dùng khoảng 4 tháng, mặt kính không trầy, đủ phím bấm.' },
    info: [
      { label: 'Bảo hành', value: 'Còn bảo hành chính hãng đến tháng 3/2027' },
      { label: 'Phụ kiện đi kèm', value: 'Dây nguồn, sách hướng dẫn và hộp gốc' },
      { label: 'Lý do bán', value: 'Chuyển sang dùng bếp âm nên nhượng lại' },
    ],
  }),
  'Giày chạy bộ size 41, mới đi 3 lần': goods({
    handover: { from: '17:30', to: '21:30' },
    condition: { level: '95', note: 'Đi 3 buổi chạy trong nhà, đế còn gai, chưa sờn.' },
    info: [
      { label: 'Kích cỡ', value: 'Size 41 (EU), vừa chân dài khoảng 26 cm' },
      { label: 'Tình trạng chi tiết', value: 'Đã vệ sinh sạch, không mùi, đủ dây và lót giày' },
    ],
  }),
  'Điện thoại giá rẻ bất ngờ, chuyển khoản trước': goods({
    payMethods: ['transfer'],
    info: [{ label: 'Tình trạng', value: 'Máy cũ, không hóa đơn, không bảo hành' }],
  }),

  /* ---------- Dịch vụ ---------- */
  'Giặt sấy gấp, lấy và trả tận cửa': service({
    areas: VGP, payMethods: CTX, priceType: 'unit', estimate: true, timeMode: 'slot', place: { mode: 'buyer' }, handover: { from: '08:00', to: '18:00' },
    serviceInfo: { turnaround: 'Trả đồ trong 24 giờ', warranty: 'Đền bù nếu làm hư hỏng', area: 'Trong Vinhomes Grand Park' },
    highlights: [
      { icon: 'clock', label: 'Thời gian trả', value: '24 giờ' },
      { icon: 'pin', label: 'Cách nhận', value: 'Lấy và trả tận cửa' },
      { icon: 'receipt', label: 'Tính tiền', value: 'Theo kg, chốt lúc cân' },
    ],
    questions: [
      { type: 'text', label: 'Khối lượng ước tính (kg)', required: true },
      { type: 'choice', label: 'Có đồ cần giặt riêng không?', required: false, opts: ['Không', 'Có (len, vest, đồ màu dễ phai)'] },
    ],
    info: [
      { label: 'Điều kiện hủy', value: 'Báo trước giờ lấy đồ 2 tiếng, hủy sau khi đã lấy đồ sẽ tính phí vận chuyển' },
      { label: 'Lưu ý cho khách', value: 'Vui lòng kiểm tra túi áo, quần trước khi giao' },
    ],
  }),
  'Sửa laptop, điện thoại — kiểm tra tận nơi': service({
    priceType: 'quote', inspectFee: 50000, timeMode: 'slot', place: { mode: 'buyer' }, handover: { from: '09:00', to: '20:00' },
    serviceInfo: { turnaround: 'Báo giá ngay sau khi kiểm tra', warranty: 'Bảo hành linh kiện đã thay 1 tháng', area: 'Trong Bcons' },
    highlights: [
      { icon: 'receipt', label: 'Phí kiểm tra', value: '50.000đ, trừ vào tiền sửa nếu đồng ý' },
      { icon: 'pin', label: 'Cách làm', value: 'Thợ đến tận nhà' },
      { icon: 'check', label: 'Bảo hành', value: '1 tháng linh kiện' },
    ],
    questions: [
      { type: 'choice', label: 'Thiết bị cần sửa', required: true, opts: ['Laptop', 'Điện thoại', 'Máy tính bảng', 'Khác'] },
      { type: 'text', label: 'Mô tả lỗi', required: true, long: true, ph: 'Ví dụ: máy không lên nguồn, màn hình sọc…' },
      { type: 'photo', label: 'Ảnh thiết bị hoặc màn hình lỗi', required: false },
    ],
    info: [
      { label: 'Cách tính giá', value: 'Trả phí kiểm tra trước, sau đó thợ báo giá sửa — bạn đồng ý mới làm' },
      { label: 'Điều kiện hủy', value: 'Hủy trước giờ hẹn miễn phí, sau khi thợ đến sẽ tính phí kiểm tra' },
    ],
  }),
  'Giao nhận hộ trong khu': service({
    payMethods: CTX, priceType: 'from', noSchedule: true, place: { mode: 'ab' }, handover: { from: '07:00', to: '21:00' },
    serviceInfo: { turnaround: '15–30 phút trong khu', warranty: 'Không', area: 'Trong Bcons' },
    highlights: [
      { icon: 'bolt', label: 'Thời gian', value: '15–30 phút' },
      { icon: 'pin', label: 'Phạm vi', value: 'Trong khu Bcons' },
      { icon: 'receipt', label: 'Giá từ', value: '20.000đ mỗi lượt' },
    ],
    questions: [
      { type: 'text', label: 'Cần lấy món gì?', required: true, ph: 'Ví dụ: 1 bịch thuốc ở nhà thuốc cổng A' },
      { type: 'choice', label: 'Kích thước món đồ', required: true, opts: ['Nhỏ, dưới 5kg', 'Vừa, 5–10kg'], hint: 'Chọn nhầm thì người làm báo phụ thu để bạn đồng ý' },
    ],
    info: [
      { label: 'Lưu ý', value: 'Đồ trên 10kg hoặc cần xe tải nhỏ vui lòng nhắn hỏi trước' },
      { label: 'Điều kiện hủy', value: 'Hủy trước khi người làm nhận đồ thì không mất phí' },
    ],
  }),
  'Cắt tóc nam tại nhà': service({
    priceType: 'fixed', timeMode: 'slot', place: { mode: 'buyer' }, handover: { from: '08:00', to: '20:00' },
    optionGroups: [
      g('Gói', [['Cắt tóc'], ['Cắt + gội sấy', 20000]], { required: true }),
      g('Thêm', [['Cạo râu', 15000], ['Tạo kiểu', 10000]], { multi: true }),
    ],
    serviceInfo: { turnaround: '30–40 phút', warranty: 'Không hài lòng thì chỉnh lại miễn phí trong ngày', area: 'Trong Bcons' },
    highlights: [
      { icon: 'clock', label: 'Thời lượng', value: '30–40 phút' },
      { icon: 'pin', label: 'Cách làm', value: 'Đến tận nhà' },
      { icon: 'check', label: 'Dụng cụ', value: 'Khử khuẩn mỗi lần' },
    ],
    info: [
      { label: 'Dụng cụ', value: 'Tự mang tông đơ, kéo và khăn choàng, khử khuẩn trước mỗi khách' },
      { label: 'Điều kiện hủy', value: 'Báo trước giờ hẹn 1 tiếng' },
    ],
  }),
  'Làm móng tay, sơn gel tại nhà': service({
    payMethods: CTX, priceType: 'fixed', timeMode: 'slot', place: { mode: 'buyer' }, handover: { from: '09:00', to: '19:00' },
    optionGroups: [
      g('Gói', [['Sơn gel trơn'], ['Sơn gel vẽ họa tiết', 50000], ['Úp móng', 80000]], { required: true }),
      g('Thêm', [['Tháo gel cũ', 30000], ['Dưỡng móng', 20000]], { multi: true }),
    ],
    serviceInfo: { turnaround: '60–90 phút', warranty: 'Bong gel trong 7 ngày được sửa miễn phí', area: 'Trong Bcons' },
    highlights: [
      { icon: 'clock', label: 'Thời lượng', value: '60–90 phút' },
      { icon: 'pin', label: 'Cách làm', value: 'Đến tận nhà' },
      { icon: 'check', label: 'Bảo hành', value: 'Gel 7 ngày' },
    ],
    questions: [
      { type: 'photo', label: 'Ảnh mẫu bạn thích', required: false },
      { type: 'text', label: 'Dị ứng sản phẩm làm móng (nếu có)', required: false, ph: 'Không có thì để trống' },
    ],
    info: [
      { label: 'Dụng cụ', value: 'Dụng cụ khử trùng riêng từng khách, sơn gel không mùi' },
      { label: 'Điều kiện hủy', value: 'Báo trước giờ hẹn 2 tiếng' },
    ],
  }),
};

module.exports = { ENRICH, BANK_BY_NAME };
