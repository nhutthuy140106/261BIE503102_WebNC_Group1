// Dữ liệu mẫu cho các collection "hoạt động" (đơn, đề nghị, tin nhắn…) để xem đồ án chạy được ngay.
// Đây là dữ liệu mô phỏng, chỉ để minh họa luồng. Được gọi từ seed.js, xóa rồi tạo lại nên chạy lặp lại không nhân đôi.
const Address = require('../modules/buyer/address/address.model');
const Saved = require('../modules/buyer/saved/saved.model');
const Order = require('../modules/buyer/order/order.model');
const Offer = require('../modules/buyer/offer/offer.model');
const Question = require('../modules/buyer/question/question.model');
const Review = require('../modules/buyer/review/review.model');
const Report = require('../modules/buyer/report/report.model');
const Notification = require('../modules/buyer/notification/notification.model');
const { Conversation, Message } = require('../modules/buyer/chat/chat.model');
const Job = require('../modules/shared/job.model');
const { nextCode } = require('../modules/shared/counter.model');

const ago = (hours) => new Date(Date.now() - hours * 3600 * 1000);
const later = (days, h) => { const x = new Date(); x.setDate(x.getDate() + days); x.setHours(h, 0, 0, 0); return x; };

async function seedDemo({ users, posts, jobs }) {
  const { thuy, lan, hoa, linh } = users;
  const [pCom, pPho, , , , , pGiat] = posts;
  const [jCom, jDon, jMeo, jToan] = jobs;

  await Promise.all([
    Address.deleteMany({}), Saved.deleteMany({}), Order.deleteMany({}), Offer.deleteMany({}), Question.deleteMany({}),
    Review.deleteMany({}), Report.deleteMany({}), Notification.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({}),
  ]);

  // ---- Sổ địa chỉ của Ngọc Thủy
  await Address.insertMany([
    { user: thuy._id, name: 'Ngọc Thủy', phone: '0900000001', block: 'B', unit: 'B-1204', note: 'Gọi trước khi tới', label: 'home', isDefault: true },
    { user: thuy._id, name: 'Mẹ — Cô Lan Anh', phone: '0900000010', block: 'A', unit: 'A-0302', label: 'family', isDefault: false },
  ]);
  const addr = { name: 'Ngọc Thủy', phone: '0900000001', block: 'B', unit: 'B-1204', note: 'Gọi trước khi tới', label: 'home' };

  // ---- Bài đã lưu
  await Saved.insertMany([
    { user: thuy._id, targetId: pCom._id, targetModel: 'Post', type: pCom.type },
    { user: thuy._id, targetId: posts[3]._id, targetModel: 'Post', type: posts[3].type },
    { user: thuy._id, targetId: jDon._id, targetModel: 'Job', type: 'job' },
  ]);

  // ---- Đơn đã đặt (Ngọc Thủy là người mua)
  const snap = (p, seller) => ({ title: p.title, type: p.type, image: p.images?.[0], sellerName: seller.name, unitPrice: p.price, unit: p.unit });
  const mkOrder = async (post, seller, extra) => Order.create({
    code: await nextCode('order', 'AG-O', 3000), buyer: thuy._id, seller: seller._id, post: post._id, snapshot: snap(post, seller),
    selections: [], answers: [], address: addr, ...extra,
  });
  const o1 = await mkOrder(pCom, lan, {
    quantity: 2, fulfillment: 'delivery', payment: 'cash', utensils: true, note: 'Ít cay giúp mình',
    breakdown: { items: 70000, deliveryFee: 7000, discount: 0 }, total: 77000, state: 'preparing',
    history: [{ state: 'waiting', at: ago(2) }, { state: 'confirmed', at: ago(1.8) }, { state: 'preparing', at: ago(1.5) }],
  });
  const o2 = await mkOrder(pGiat, linh, {
    quantity: 3, fulfillment: 'delivery', payment: 'transfer', scheduledAt: later(1, 9),
    answers: [{ question: 'Khối lượng ước tính (kg)', value: '3' }],
    breakdown: { items: 54000, deliveryFee: 0, discount: 0 }, total: 54000, state: 'waiting',
    history: [{ state: 'waiting', at: ago(0.5) }],
  });
  const o3 = await mkOrder(pPho, lan, {
    quantity: 1, fulfillment: 'pickup', payment: 'cash', reviewed: true,
    breakdown: { items: 45000, deliveryFee: 0, discount: 0 }, total: 45000, state: 'done',
    history: [{ state: 'waiting', at: ago(96) }, { state: 'confirmed', at: ago(95.5) }, { state: 'ready', at: ago(95) }, { state: 'done', at: ago(94) }],
  });

  // ---- Việc đã nhận (Ngọc Thủy là người nhận việc) + đề nghị của người khác
  const mkOffer = async (job, worker, extra) => Offer.create({ code: await nextCode('offer', 'AG-J', 1990), job: job._id, worker: worker._id, ...extra });
  const f1 = await mkOffer(jDon, thuy, {
    intro: 'Mình ở cùng Block, khỏe và đúng giờ, có thể làm ngay chủ nhật.', slots: [later(5, 9)], state: 'offered',
    history: [{ state: 'offered', at: ago(5) }],
  });
  const f2 = await mkOffer(jMeo, thuy, {
    intro: 'Mình có nuôi mèo nên quen việc cho ăn và dọn khay cát.', slots: [], state: 'chosen',
    history: [{ state: 'offered', at: ago(30) }, { state: 'chosen', at: ago(20) }],
  });
  const f3 = await mkOffer(jCom, thuy, {
    intro: 'Mình ở tầng 3 nên lên rất nhanh.', slots: [], state: 'done', paidAt: ago(70),
    report: { note: 'Đã mang cơm lên tận cửa tầng 2.', images: [], at: ago(72) },
    history: [{ state: 'offered', at: ago(100) }, { state: 'chosen', at: ago(98) }, { state: 'working', at: ago(73) }, { state: 'reported', at: ago(72) }, { state: 'done', at: ago(70) }],
  });
  await mkOffer(jToan, hoa, {
    intro: 'Mình từng kèm Toán cho học sinh cấp 2, có thể dạy tối T3 và T5.', slots: [], state: 'offered',
    history: [{ state: 'offered', at: ago(3) }],
  });
  // việc có người nhận thì đóng; việc còn chờ chọn thì đếm đề nghị
  await Job.updateOne({ _id: jMeo._id }, { status: 'closed', offerCount: 0 });
  await Job.updateOne({ _id: jCom._id }, { status: 'done', offerCount: 0 });
  await Job.updateOne({ _id: jDon._id }, { offerCount: 1 });
  await Job.updateOne({ _id: jToan._id }, { offerCount: 1 });

  // ---- Hỏi đáp công khai
  await Question.insertMany([
    { job: jDon._id, author: thuy._id, text: 'Căn nhà có thang máy không ạ, mình cần mang theo dụng cụ gì?', answer: { text: 'Có thang máy, dụng cụ nhà có sẵn bạn nhé.', by: jDon.poster, at: ago(4) } },
    { job: jDon._id, author: hoa._id, text: 'Làm trong khoảng bao lâu vậy chị?' },
  ]);

  // ---- Đánh giá (Thủy đánh giá món phở đã nhận) + phản hồi của người bán
  await Review.create({
    reviewer: thuy._id, target: lan._id, targetType: 'order', targetId: o3._id, post: pPho._id, rating: 5,
    comment: 'Nước dùng thơm, thịt mềm, giao đúng hẹn. Sẽ đặt lại!', reply: { text: 'Cảm ơn bạn nhiều nhé!', at: ago(90) },
  });

  // ---- Hội thoại + tin nhắn
  const c1 = await Conversation.create({ participants: [thuy._id, lan._id], context: { type: 'order', id: o1._id } });
  const m1 = await Message.insertMany([
    { conversation: c1._id, sender: thuy._id, text: 'Chào cô, cho mình hỏi cơm giao khoảng mấy giờ ạ?', readBy: [thuy._id, lan._id], createdAt: ago(1.9) },
    { conversation: c1._id, sender: lan._id, text: 'Khoảng 15 phút nữa cô giao tới nhé.', readBy: [lan._id], createdAt: ago(0.3) },
  ]);
  await Conversation.updateOne({ _id: c1._id }, { lastMessage: { text: m1[1].text, at: m1[1].createdAt, sender: lan._id } });
  const c2 = await Conversation.create({ participants: [thuy._id, hoa._id], context: { type: 'offer', id: f2._id } });
  const m2 = await Message.insertMany([
    { conversation: c2._id, sender: hoa._id, text: 'Cảm ơn bạn, chị chọn bạn nhé. Chìa khóa gửi ở bảo vệ.', readBy: [hoa._id, thuy._id], createdAt: ago(19) },
    { conversation: c2._id, sender: thuy._id, text: 'Dạ vâng, mai em sang cho mèo ăn ạ.', readBy: [thuy._id, hoa._id], createdAt: ago(18) },
  ]);
  await Conversation.updateOne({ _id: c2._id }, { lastMessage: { text: m2[1].text, at: m2[1].createdAt, sender: thuy._id } });

  // ---- Thông báo
  await Notification.insertMany([
    { user: thuy._id, type: 'order', title: 'Bếp Cô Lan đang chuẩn bị món của bạn', body: o1.code, link: { type: 'order', id: o1._id }, read: false, createdAt: ago(1.5) },
    { user: thuy._id, type: 'message', title: 'Bếp Cô Lan: Khoảng 15 phút nữa cô giao tới nhé.', link: { type: 'conversation', id: c1._id }, read: false, createdAt: ago(0.3) },
    { user: thuy._id, type: 'offer', title: 'Chị Hoa đã chọn bạn làm việc "Cho mèo ăn 3 ngày"', body: f2.code, link: { type: 'offer', id: f2._id }, read: true, createdAt: ago(20) },
    { user: thuy._id, type: 'order', title: 'Đơn phở bò đã hoàn thành', body: o3.code, link: { type: 'order', id: o3._id }, read: true, createdAt: ago(94) },
  ]);

  // ---- Báo cáo vấn đề (để Admin có việc xử lý)
  await Report.create({
    reporter: thuy._id, targetType: 'order', targetId: o2._id, reason: 'payment',
    detail: 'Người bán nhắn đổi hình thức thanh toán so với lúc đặt, mình muốn hỏi lại quy định.',
    history: [{ state: 'open', at: ago(0.4), note: '' }],
  });

  return { addresses: 2, saved: 3, orders: [o1, o2, o3].length, offers: [f1, f2, f3].length + 1, conversations: 2 };
}

module.exports = seedDemo;
