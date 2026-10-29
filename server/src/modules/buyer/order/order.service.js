const Order = require('./order.model');
const Post = require('../../shared/post.model');
const Address = require('../address/address.model');
const { nextCode } = require('../../shared/counter.model');
const { notify } = require('../../shared/notify');
const ApiError = require('../../../utils/ApiError');
const { parsePaging } = require('../../../utils/pagination');
const xu = require('../xu/xu.service');
const { compute: computeTracking, canTrack } = require('./tracking');

// Voucher AntXu tạm (Q11): sau này lấy từ model Voucher. Chỉ áp cho bài có acceptsXu.
const VOUCHERS = { XU10: { amount: 10000 }, XU5: { amount: 5000 } };

const CANCELABLE = ['waiting', 'confirmed', 'preparing'];
const RETURN_WINDOW_DAYS = 7; // giả định, chờ Q6

/** Tính tiền ở server từ giá bài hiện tại + lựa chọn; ném 422 nếu lựa chọn sai. */
function priceOrder(post, input, xuVoucher = null) {
  const details = [];
  const selections = [];
  let optionsPerUnit = 0;

  for (const g of post.optionGroups) {
    const picked = (input.selections.find((s) => s.group === g.name) || { choices: [] }).choices;
    if (g.required && picked.length === 0) details.push({ field: 'selections', message: `Cần chọn "${g.name}"` });
    if (!g.multi && picked.length > 1) details.push({ field: 'selections', message: `"${g.name}" chỉ được chọn 1` });
    const chosen = [];
    for (const label of picked) {
      const c = g.choices.find((x) => x.label === label);
      if (!c) { details.push({ field: 'selections', message: `"${label}" không có trong "${g.name}"` }); continue; }
      chosen.push({ label: c.label, price: c.price });
      optionsPerUnit += c.price;
    }
    if (chosen.length) selections.push({ group: g.name, choices: chosen });
  }
  for (const s of input.selections) {
    if (!post.optionGroups.some((g) => g.name === s.group)) details.push({ field: 'selections', message: `Không có nhóm "${s.group}"` });
  }

  const answers = [];
  for (const q of post.questions) {
    const a = input.answers.find((x) => x.question === q.label);
    if (q.required && (!a || !a.value.trim())) details.push({ field: 'answers', message: `Cần trả lời "${q.label}"` });
    if (a && a.value.trim()) answers.push({ question: q.label, value: a.value.trim() });
  }

  if (!post.fulfillmentModes.includes(input.fulfillment)) details.push({ field: 'fulfillment', message: 'Bài này không hỗ trợ cách nhận đã chọn' });
  if (input.fulfillment === 'delivery' && !input.addressId) details.push({ field: 'addressId', message: 'Cần chọn địa chỉ nhận hàng khi giao tận nơi' });
  if (post.needSchedule && !input.scheduledAt) details.push({ field: 'scheduledAt', message: 'Cần chọn ngày giờ' });
  if (input.scheduledAt && input.scheduledAt.getTime() < Date.now()) details.push({ field: 'scheduledAt', message: 'Thời gian đã ở quá khứ' });

  let discount = 0;
  let rule = null; // voucher đổi từ Xu (mã XU-…); mã cũ XU10/XU5 vẫn dùng được
  if (input.voucherCode) {
    const code = input.voucherCode.toUpperCase();
    if (xu.XU_CODE.test(code)) {
      if (!xuVoucher) details.push({ field: 'voucherCode', message: 'Voucher không hợp lệ, đã dùng hoặc đã hết hạn' });
      else if (!post.acceptsXu) details.push({ field: 'voucherCode', message: 'Bài này không dùng được Xu' });
      else rule = xuVoucher.def;
    } else {
      const v = VOUCHERS[code];
      if (!v) details.push({ field: 'voucherCode', message: 'Voucher không tồn tại' });
      else if (!post.acceptsXu) details.push({ field: 'voucherCode', message: 'Bài này không dùng được Xu' });
      else discount = v.amount;
    }
  }
  if (details.length) throw ApiError.validation('Đơn chưa hợp lệ', details);

  const items = (post.price + optionsPerUnit) * input.quantity;
  const deliveryFee = input.fulfillment === 'delivery' ? post.deliveryFee : 0;
  if (rule) {
    if (items < rule.min) throw ApiError.validation('Đơn chưa hợp lệ', [{ field: 'voucherCode', message: `Voucher này áp cho đơn từ ${rule.min.toLocaleString('vi-VN')}đ` }]);
    if (rule.ship && !(input.fulfillment === 'delivery' && post.type === 'food')) throw ApiError.validation('Đơn chưa hợp lệ', [{ field: 'voucherCode', message: 'Voucher miễn phí giao chỉ áp cho đơn đồ ăn giao tận nơi' }]);
    discount = rule.ship ? deliveryFee : rule.amount;
  }
  discount = Math.min(discount, items + deliveryFee);
  return { selections, answers, breakdown: { items, deliveryFee, discount, surcharge: 0 }, total: items + deliveryFee - discount };
}

// Bước 1: kiểm tra + tính tiền, CHƯA ghi gì vào DB (giỏ nháp gọi bước này cho mọi món trước khi tạo đơn nào)
async function prepare(user, input) {
  const post = await Post.findById(input.postId).populate('seller', 'name avatar');
  if (!post) throw ApiError.notFound('Bài không tồn tại');
  if (post.status !== 'open') throw ApiError.invalidState('Bài đã hết hàng, đã đóng hoặc không còn hiển thị');
  if (post.stock !== null && post.stock < input.quantity) throw ApiError.invalidState('Không đủ số lượng còn lại');
  if (String(post.seller._id) === String(user._id)) throw ApiError.forbidden('Bạn không thể đặt bài của chính mình');

  const xuVoucher = await xu.findVoucher(user._id, input.voucherCode);
  const priced = priceOrder(post, input, xuVoucher);

  let address;
  if (input.addressId) {
    const a = await Address.findById(input.addressId);
    if (!a) throw ApiError.validation('Địa chỉ không tồn tại', [{ field: 'addressId', message: 'Địa chỉ không tồn tại' }]);
    if (String(a.user) !== String(user._id)) throw ApiError.forbidden('Địa chỉ này không phải của bạn');
    address = { name: a.name, phone: a.phone, block: a.block, unit: a.unit, note: a.note, label: a.label };
  }
  return { post, priced, address, xuVoucher };
}

// Bước 2: trừ tồn kho nguyên tử + ghi đơn
async function commit(user, input, { post, priced, address, xuVoucher }) {
  // giữ voucher trước khi trừ kho: mất lượt dùng thì dừng sớm, chưa đụng tới tồn kho
  if (xuVoucher && !(await xu.claimVoucher(xuVoucher.doc))) throw ApiError.invalidState('Voucher đã được dùng cho đơn khác');
  // trừ tồn kho nguyên tử: tránh hai người cùng đặt món cuối cùng
  if (post.stock !== null) {
    const r = await Post.updateOne({ _id: post._id, stock: { $gte: input.quantity } }, { $inc: { stock: -input.quantity } });
    if (r.modifiedCount === 0) throw ApiError.invalidState('Không đủ số lượng còn lại');
    if (post.stock - input.quantity === 0) await Post.updateOne({ _id: post._id }, { status: 'soldout' });
  } else if (post.oneTime) {
    const r = await Post.updateOne({ _id: post._id, status: 'open' }, { status: 'soldout' });
    if (r.modifiedCount === 0) throw ApiError.invalidState('Bài đã được bán');
  }

  const order = await Order.create({
    code: await nextCode('order', 'AG-O'),
    buyer: user._id,
    seller: post.seller._id,
    post: post._id,
    snapshot: { title: post.title, type: post.type, image: post.images[0], sellerName: post.seller.name, sellerAvatar: post.seller.avatar || null, unitPrice: post.price, unit: post.unit },
    quantity: input.quantity,
    selections: priced.selections,
    answers: priced.answers,
    fulfillment: input.fulfillment,
    address,
    scheduledAt: input.scheduledAt,
    utensils: !!input.utensils,
    note: input.note || '',
    voucherCode: input.voucherCode && input.voucherCode.toUpperCase(),
    payment: input.payment,
    breakdown: priced.breakdown,
    total: priced.total,
    state: 'waiting',
    history: [{ state: 'waiting', at: new Date() }],
  }).catch(async (e) => { if (xuVoucher) await xu.restoreVoucher(user._id, xuVoucher.doc.code); throw e; });

  await notify(post.seller._id, { type: 'order_new', title: `Đơn mới ${order.code}`, body: post.title, link: { type: 'order', id: order._id } });
  return order;
}

async function create(user, input) {
  return commit(user, input, await prepare(user, input));
}

async function list(user, { state, ...paging }) {
  const { page, limit, skip } = parsePaging(paging);
  const filter = { buyer: user._id };
  if (state === 'active') filter.state = { $in: Order.ACTIVE };
  if (state === 'history') filter.state = { $in: Order.HISTORY };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total } };
}

// Xem đơn: người mua hoặc người bán của đơn (admin cũng được); người khác 403
async function getVisible(user, id) {
  const o = await Order.findById(id);
  if (!o) throw ApiError.notFound('Không tìm thấy đơn');
  const mine = [o.buyer, o.seller].some((u) => String(u) === String(user._id));
  if (!mine && user.role !== 'admin') throw ApiError.forbidden('Đây không phải đơn của bạn');
  return o;
}

// Vị trí xe mô phỏng (xem tracking.js); chỉ đơn có giao tận nơi
async function tracking(user, id) {
  const o = await getVisible(user, id);
  if (!canTrack(o)) throw new ApiError(404, 'NO_TRACKING', 'Đơn này không có theo dõi giao hàng');
  const post = await Post.findById(o.post).select('area');
  return computeTracking(o, post);
}

async function getOwned(user, id) {
  const o = await getVisible(user, id);
  if (String(o.buyer) !== String(user._id)) throw ApiError.forbidden('Chỉ người đặt mới thực hiện được thao tác này');
  return o;
}

async function requestCancel(user, id, reason) {
  const o = await getOwned(user, id);
  if (!CANCELABLE.includes(o.state)) throw ApiError.invalidState('Đơn ở trạng thái này không còn gửi yêu cầu hủy được');
  if (o.cancelRequest && o.cancelRequest.status === 'pending') throw ApiError.duplicate('Bạn đã gửi yêu cầu hủy, đang chờ người bán');
  o.cancelRequest = { reason, at: new Date(), status: 'pending' }; // chỉ là yêu cầu: không tự hủy, không tự hoàn tiền
  await o.save();
  await notify(o.seller, { type: 'order_cancel_request', title: `Yêu cầu hủy đơn ${o.code}`, body: reason, link: { type: 'order', id: o._id } });
  return o;
}

async function requestReturn(user, id, reason) {
  const o = await getOwned(user, id);
  if (o.snapshot.type !== 'goods') throw ApiError.invalidState('Chỉ đơn đồ dùng mới trả hàng được');
  if (o.state !== 'done') throw ApiError.invalidState('Chỉ gửi yêu cầu trả hàng sau khi đơn hoàn thành');
  const doneAt = (o.history.find((h) => h.state === 'done') || {}).at || o.updatedAt;
  if (Date.now() - new Date(doneAt).getTime() > RETURN_WINDOW_DAYS * 86400000) throw ApiError.invalidState(`Đã quá ${RETURN_WINDOW_DAYS} ngày kể từ khi hoàn thành`);
  if (o.returnRequest && o.returnRequest.status) throw ApiError.duplicate('Bạn đã gửi yêu cầu trả hàng cho đơn này');
  o.returnRequest = { reason, at: new Date(), status: 'pending' };
  await o.save();
  await notify(o.seller, { type: 'order_return_request', title: `Yêu cầu trả hàng ${o.code}`, body: reason, link: { type: 'order', id: o._id } });
  return o;
}

async function approveSurcharge(user, id) {
  const o = await getOwned(user, id);
  if (!o.surcharge || o.surcharge.status !== 'pending') throw ApiError.invalidState('Đơn này không có khoản phụ thu nào đang chờ bạn đồng ý');
  o.surcharge.status = 'approved';
  o.breakdown.surcharge = o.surcharge.amount;
  o.total += o.surcharge.amount;
  await o.save();
  await notify(o.seller, { type: 'order_surcharge_ok', title: `Khách đồng ý phụ thu ${o.code}`, link: { type: 'order', id: o._id } });
  return o;
}

module.exports = {
  tracking, create, prepare, commit, list, getVisible, requestCancel, requestReturn, approveSurcharge, priceOrder };
