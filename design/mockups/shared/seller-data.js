/* Dữ liệu mẫu + thao tác dùng chung cho mọi trang không gian Bán & Đăng việc (seller*.html).
   Tài khoản mẫu: Bếp Cô Lan — bán đồ ăn, đồ dùng, dịch vụ và đăng việc cần người.
   Mọi thao tác lưu chung một chỗ trong trình duyệt (localStorage "antgo_seller_today") để các trang khớp nhau. */
(() => {
  const KEY = "antgo_seller_today";
  const DEF = { done: {}, res: {}, ost: {}, ohist: {}, food: {}, answers: {}, replies: {}, rated: {}, jobs: {}, newPosts: [], offs: [], notes: {},
    pause: null, kind: "all", range: "7", xu: 120, chosen: null };
  const load = () => {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    const S = Object.assign(JSON.parse(JSON.stringify(DEF)), raw);
    for (const k of Object.keys(DEF)) if (S[k] == null && DEF[k] != null && typeof DEF[k] === "object") S[k] = Array.isArray(DEF[k]) ? [] : {};
    return S;
  };
  const save = S => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const U = (id, w = 200, h = 160) => /^(https?:|data:)/.test(id) ? id : `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=70`;
  const F = id => U(id, 96, 96);
  const money = n => Number(n || 0).toLocaleString("vi-VN") + "đ";
  const dateOf = d => { const x = new Date(); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + d); return x; };
  const day = (d, opt) => dateOf(d).toLocaleDateString("vi-VN", opt);
  const dayLabel = d => d === 0 ? "Hôm nay" : d === -1 ? "Hôm qua" : d === 1 ? "Ngày mai" : day(d, { weekday: "short", day: "2-digit", month: "2-digit" });
  const now = () => { const x = new Date(); return `${x.getHours()}:${String(x.getMinutes()).padStart(2, "0")}`; };

  const KIND = { food: ["fork", "Đồ ăn & uống"], goods: ["package", "Đồ dùng"], service: ["wrench", "Dịch vụ"], job: ["hand", "Việc làm"] };
  const AV = { lan: "1508214751196-bcfd4ca60f91", thuy: "1494790108377-be9c29b29330", minh: "1507591064344-4c6ce005b128", khoa: "1506794778202-cad84cf45f1d",
    quoc: "1500648767791-00dcc994a43e", hoa: "1438761681033-6461ffad8d80", ha: "1573496359142-b8d87734a5a2", ngan: "1524504388940-b1c1722653e1",
    tuan: "1507003211169-0a1dd7228f2d", phuong: "1580489944761-15a19d654956" };
  const IMG = { com: "1504674900247-0877df9cc836", suon: "1555939594-58d7cb561ad1", canh: "1512621776951-a57141f2eefd", noi: "1556909114-f6e7ad7d3136" };
  const P = { minh: ["Minh", AV.minh, "0900 000 007"], khoa: ["Minh Khoa", AV.khoa, "0900 000 013"], quoc: ["Quốc Anh", AV.quoc, "0900 000 005"], thuy: ["Ngọc Thủy", AV.thuy, "0900 000 001"],
    hoa: ["Chị Hoa", AV.hoa, "0900 000 004"], ha: ["Thu Hà", AV.ha, "0900 000 014"], ngan: ["Chị Ngân", AV.ngan, "0900 000 011"], tuan: ["Anh Tuấn", AV.tuan, "0900 000 012"], phuong: ["Phương", AV.phuong, "0900 000 008"] };
  const who = k => ({ n: P[k][0], av: P[k][1], phone: P[k][2] });

  /* ---------- Bài đăng ---------- */
  const POSTS = [
    { id: "f1", k: "food", t: "Cơm gà kho gừng", img: IMG.com, price: 35000, unit: "/ phần", val: 12, max: 20, on: 1, views: 186, saves: 21, sold: 48, promo: "còn 2 ngày", cat: "Cơm nhà làm" },
    { id: "f2", k: "food", t: "Cơm sườn rim", img: IMG.suon, price: 45000, unit: "/ phần", val: 3, max: 15, on: 1, views: 94, saves: 9, sold: 22, cat: "Cơm nhà làm" },
    { id: "f3", k: "food", t: "Canh chua cá", img: IMG.canh, price: 25000, unit: "/ tô", val: 0, max: 10, on: 0, views: 41, saves: 3, sold: 9, cat: "Món nước" },
    { id: "g1", k: "goods", t: "Nồi chiên không dầu 5L (đã dùng)", img: IMG.noi, price: 650000, val: 1, max: 20, on: 1, views: 58, saves: 6, sold: 0, cat: "Đồ bếp" },
    { id: "g2", k: "goods", t: "Bộ hộp cơm inox ×6", ic: "package", price: 180000, unit: "/ bộ", val: 1, max: 10, on: 1, views: 14, saves: 1, sold: 4, cat: "Đồ bếp" },
    { id: "s1", k: "service", t: "Nấu cỗ tại nhà", ic: "wrench", price: 1200000, unit: "/ buổi", val: 3, max: 5, on: 1, views: 18, saves: 0, sold: 3, cat: "Nấu ăn" },
    { id: "s2", k: "service", t: "Nấu cơm theo tuần", ic: "fork", price: 600000, unit: "/ tuần", val: 0, max: 3, on: 0, views: 9, saves: 1, sold: 2, cat: "Nấu ăn" },
    { id: "j1", k: "job", t: "Cần người giao cơm trưa 11:00–12:00", ic: "hand", price: 40000, unit: "/ buổi", val: 1, max: 10, on: 1, views: 72, saves: 4, sold: 0, offers: 3, job: "j-giao", cat: "Giao nhận" },
    { id: "j2", k: "job", t: "Đi chợ đầu mối buổi sáng", ic: "bag", price: 120000, unit: "/ lần", val: 1, max: 10, on: 0, views: 35, saves: 2, sold: 0, chosen: "Minh Khoa", job: "j-cho", cat: "Mua hộ" },
  ];
  const LANE = {
    food: { title: "Đồ ăn & uống", step: v => `Còn ${v} phần`, tog: "Còn bán", xu: ["Quảng bá 3 ngày", 30] },
    goods: { title: "Đồ dùng", step: v => `Còn ${v} cái`, tog: "Đang bán", xu: ["Quảng bá 3 ngày", 30] },
    service: { title: "Dịch vụ", step: v => `${v} buổi trống`, tog: "Nhận lịch", xu: ["Quảng bá 3 ngày", 30] },
    job: { title: "Việc làm", step: v => `Cần ${v} người`, tog: "Nhận đề nghị", xu: ["Ghim đầu danh sách", 20] },
  };
  const posts = S => POSTS.concat(S.newPosts || []).map(p => Object.assign({}, p, S.food[p.id] || {})).filter(p => !p.deleted);
  const setPost = (S, id, patch) => { S.food[id] = Object.assign({}, S.food[id] || {}, patch); save(S); };

  /* ---------- Đơn khách đặt ---------- */
  // ful: delivery (giao tận cửa) · pickup (khách tự lấy) · home (làm tại nhà khách). day = số ngày so với hôm nay
  const ORDERS = [
    { id: "o3024", code: "AG-O3024", k: "food", img: IMG.com, title: "Cơm gà kho gừng ×2 · thêm trứng", items: [["Cơm gà kho gừng", 2, "Thêm trứng", 40000]], buyer: who("minh"), ful: "delivery", addr: "B-0812, Block B", day: 0, tm: "11:45", ship: 5000, pay: "cash", note: "Ít cơm, nhiều rau", state: "waiting", due: "Còn 12 phút", hist: [["waiting", "11:02"]] },
    { id: "o3025", code: "AG-O3025", k: "goods", img: IMG.noi, title: "Nồi chiên không dầu 5L (đã dùng)", items: [["Nồi chiên không dầu 5L", 1, "", 650000]], buyer: who("ha"), ful: "pickup", addr: "Tự đến lấy tại bếp B-0512", day: 0, tm: "18:00", ship: 0, pay: "transfer", note: "Cho mình xem máy chạy thử nhé", state: "waiting", due: "Còn 2 giờ", hist: [["waiting", "10:40"]] },
    { id: "s0412", code: "AG-O3026", k: "service", ic: "wrench", title: "Nấu cỗ tại nhà · 8 người", items: [["Nấu cỗ tại nhà", 1, "8 người · 5 món", 1200000]], buyer: who("hoa"), ful: "home", addr: "B-0910, Block B", day: 4, tm: "9:00", dur: 240, ship: 0, pay: "transfer", note: "Nguyên liệu nhà có sẵn", answers: [["Số người ăn", "8 người"], ["Bếp nhà có nồi lớn không?", "Có, 2 nồi 10 lít"]], state: "waiting", due: "Còn 5 giờ", hist: [["waiting", "9:15"]] },
    { id: "c3019", code: "AG-O3019", k: "food", img: IMG.suon, title: "Cơm sườn rim ×1", items: [["Cơm sườn rim", 1, "", 45000]], buyer: who("phuong"), ful: "delivery", addr: "B-0703, Block B", day: 0, tm: "12:00", ship: 0, pay: "cash", note: "", state: "confirmed", cancelReq: "Đổi lịch họp, không ở nhà buổi trưa", hist: [["waiting", "8:20"], ["confirmed", "8:31"]] },
    { id: "o3016", code: "AG-O3016", k: "food", img: IMG.suon, title: "Cơm sườn rim ×1", items: [["Cơm sườn rim", 1, "", 45000]], buyer: who("quoc"), ful: "pickup", addr: "Tự đến lấy tại bếp B-0512", day: 0, tm: "10:45", ship: 0, pay: "cash", note: "", state: "preparing", hist: [["waiting", "7:50"], ["confirmed", "7:58"], ["preparing", "10:05"]] },
    { id: "o3012", code: "AG-O3012", k: "food", img: IMG.com, title: "Cơm nhà làm — cơm gà xé ×2", items: [["Cơm gà xé", 2, "", 45000]], buyer: who("thuy"), ful: "delivery", addr: "B-1204, Block B", day: 0, tm: "11:30", ship: 0, pay: "cash", note: "Gọi trước khi tới, nhà có em bé ngủ trưa", state: "preparing", hist: [["waiting", "8:05"], ["confirmed", "8:12"], ["preparing", "10:20"]] },
    { id: "o3018", code: "AG-O3018", k: "food", img: IMG.com, title: "Cơm gà kho gừng ×1", items: [["Cơm gà kho gừng", 1, "", 35000]], buyer: who("ha"), ful: "delivery", addr: "B-0405, Block B", day: 0, tm: "11:30", ship: 5000, pay: "transfer", note: "", state: "confirmed", hist: [["waiting", "9:02"], ["confirmed", "9:10"]] },
    { id: "o3020", code: "AG-O3020", k: "food", img: IMG.suon, title: "Cơm sườn rim ×2", items: [["Cơm sườn rim", 2, "", 45000]], buyer: who("ngan"), ful: "delivery", addr: "B-1101, Block B", day: 0, tm: "11:30", ship: 5000, pay: "cash", note: "", state: "confirmed", hist: [["waiting", "9:20"], ["confirmed", "9:24"]] },
    { id: "o3021", code: "AG-O3021", k: "food", img: IMG.canh, title: "Canh chua cá ×1", items: [["Canh chua cá", 1, "", 25000]], buyer: who("tuan"), ful: "delivery", addr: "C-1203, Block C", day: 0, tm: "12:15", ship: 5000, pay: "cash", note: "Không lấy rau ngổ", state: "confirmed", hist: [["waiting", "9:40"], ["confirmed", "9:45"]] },
    { id: "o3005", code: "AG-O3005", k: "food", img: IMG.com, title: "Cơm gà xé ×2", items: [["Cơm gà xé", 2, "", 45000]], buyer: who("thuy"), ful: "delivery", addr: "B-1204, Block B", day: -1, tm: "11:30", ship: 0, pay: "cash", note: "", state: "done", review: "r1", hist: [["waiting", "8:10"], ["confirmed", "8:15"], ["preparing", "10:30"], ["delivering", "11:20"], ["done", "11:34"]] },
    { id: "o2998", code: "AG-O2998", k: "food", img: IMG.suon, title: "Cơm sườn rim ×1", items: [["Cơm sườn rim", 1, "", 45000]], buyer: who("quoc"), ful: "pickup", addr: "Tự đến lấy tại bếp B-0512", day: -2, tm: "11:00", ship: 0, pay: "cash", note: "", state: "done", review: "r2", hist: [["waiting", "9:00"], ["confirmed", "9:05"], ["preparing", "10:30"], ["ready", "10:55"], ["done", "11:04"]] },
    { id: "o2990", code: "AG-O2990", k: "food", img: IMG.com, title: "Cơm gà kho gừng ×1", items: [["Cơm gà kho gừng", 1, "", 35000]], buyer: who("minh"), ful: "delivery", addr: "B-0812, Block B", day: -3, tm: "12:00", ship: 5000, pay: "cash", note: "", state: "done", review: "r3", hist: [["waiting", "10:00"], ["confirmed", "10:02"], ["preparing", "11:20"], ["delivering", "11:50"], ["done", "12:03"]] },
    { id: "o2981", code: "AG-O2981", k: "food", img: IMG.canh, title: "Canh chua cá ×2", items: [["Canh chua cá", 2, "", 25000]], buyer: who("phuong"), ful: "delivery", addr: "B-0703, Block B", day: -4, tm: "12:00", ship: 5000, pay: "cash", note: "", state: "declined", declineReason: "Hết cá tươi hôm đó", hist: [["waiting", "10:10"], ["declined", "10:15"]] },
  ];
  const TODO_IDS = ["o3024", "o3025", "s0412", "c3019"];
  const STEPS = {
    delivery: [["waiting", "Chờ xác nhận"], ["confirmed", "Đã xác nhận"], ["preparing", "Đang chuẩn bị"], ["delivering", "Đang giao"], ["done", "Hoàn thành"]],
    pickup: [["waiting", "Chờ xác nhận"], ["confirmed", "Đã xác nhận"], ["preparing", "Đang chuẩn bị"], ["ready", "Chờ khách lấy"], ["done", "Hoàn thành"]],
    home: [["waiting", "Chờ xác nhận"], ["confirmed", "Đã nhận lịch"], ["preparing", "Đang làm"], ["done", "Hoàn thành"]],
  };
  const END = { declined: "Đã từ chối", cancelled: "Đã hủy" };
  const stepLabel = o => END[o.state] || (STEPS[o.ful].find(s => s[0] === o.state) || [, o.state])[1];
  const total = o => o.items.reduce((n, [, q, , p]) => n + q * p, 0) + (o.ship || 0) + (o.surcharge && o.surcharge.ok ? o.surcharge.amount : 0);
  function orders(S) {
    return ORDERS.map(b => {
      const o = JSON.parse(JSON.stringify(b));
      const res = S.res[o.id];
      if (TODO_IDS.includes(o.id) && S.done[o.id]) {
        if (o.state === "waiting") o.state = res === "decline" ? "declined" : "confirmed";
        if (o.cancelReq) { o.state = res === "keep" ? o.state : "cancelled"; o.cancelReq = null; }
      }
      if (S.ost[o.id]) Object.assign(o, S.ost[o.id]);
      o.hist = o.hist.concat(S.ohist[o.id] || []);
      o.total = total(o);
      o.label = stepLabel(o);
      o.need = o.state === "waiting" || !!o.cancelReq;
      o.ended = ["done", "declined", "cancelled"].includes(o.state);
      o.cls = o.need ? "act" : o.ended ? (o.state === "done" ? "done" : "off") : "go";
      return o;
    });
  }
  // nút hành động hợp lệ theo bước (người bán)
  function orderActions(o) {
    if (o.cancelReq) return [["approveCancel", "Đồng ý hủy", 1], ["keepOrder", "Không đồng ý"]];
    const svc = o.ful === "home";
    switch (o.state) {
      case "waiting": return [["confirm", svc ? "Nhận lịch" : "Xác nhận đơn", 1], ["decline", "Từ chối"]];
      case "confirmed": return [["prepare", svc ? "Bắt đầu làm" : "Bắt đầu chuẩn bị", 1]].concat(svc || o.k === "goods" ? [["surcharge", "Báo phụ thu"]] : []);
      case "preparing": return svc ? [["complete", "Báo hoàn thành", 1], ["surcharge", "Báo phụ thu"]] : [[o.ful === "pickup" ? "ready" : "deliver", o.ful === "pickup" ? "Báo khách đến lấy" : "Bắt đầu giao", 1]];
      case "delivering": return [["complete", "Đã giao xong", 1]];
      case "ready": return [["complete", "Khách đã lấy", 1]];
      default: return [];
    }
  }
  const NEXT = { confirm: "confirmed", prepare: "preparing", deliver: "delivering", ready: "ready", complete: "done", decline: "declined", approveCancel: "cancelled" };
  function orderAct(S, id, a, data = {}) {
    const o = orders(S).find(x => x.id === id);
    if (!o) return "";
    const ost = S.ost[id] = S.ost[id] || {};
    const push = st => { (S.ohist[id] = S.ohist[id] || []).push([st, now()]); };
    if (TODO_IDS.includes(id) && ["confirm", "decline", "approveCancel", "keepOrder"].includes(a)) {
      S.done[id] = 1; S.res[id] = { confirm: "confirm", decline: "decline", approveCancel: "approve", keepOrder: "keep" }[a];
    }
    if (a === "keepOrder") { ost.cancelReq = null; save(S); return "Đã báo khách: đơn vẫn giữ nguyên"; }
    if (a === "surcharge") { ost.surcharge = { amount: data.amount, reason: data.reason, ok: false }; save(S); return `Đã gửi phụ thu ${money(data.amount)} — chờ khách đồng ý`; }
    const to = NEXT[a];
    ost.state = to; ost.cancelReq = null;
    if (a === "decline") ost.declineReason = data.reason || "Người bán không nhận được đơn";
    push(to);
    if (a === "approveCancel" && id === "c3019") setPost(S, "f2", { val: Math.min(15, (posts(S).find(p => p.id === "f2") || {}).val + 1) });
    if (a === "confirm" && id === "s0412") setPost(S, "s1", { val: Math.max(0, (posts(S).find(p => p.id === "s1") || {}).val - 1) });
    if (a === "confirm" && id === "o3025") setPost(S, "g1", { on: 0 });
    save(S);
    return { confirm: `Đã xác nhận ${o.code} — khách được báo, đơn vào lịch`, decline: `Đã từ chối ${o.code} — khách được báo`, prepare: "Đã chuyển sang Đang chuẩn bị",
      deliver: "Đã báo khách: đơn đang được giao", ready: "Đã báo khách đến lấy", complete: `${o.code} đã hoàn thành`, approveCancel: `Đã đồng ý hủy ${o.code}` }[a];
  }

  /* ---------- Việc cần người (mình là người đăng) ---------- */
  const of = (id, code, k, slot, intro, extra = {}) => Object.assign({ id, code, who: Object.assign(who(k), { rate: { minh: "4,9", khoa: "4,9", quoc: "4,8" }[k], jobs: { minh: 12, khoa: 6, quoc: 3 }[k], dist: { minh: "Block B, tầng 8", khoa: "Block D", quoc: "Block B, tầng 5" }[k] }), slot, intro, st: "offered" }, extra);
  const JOBS = [
    { id: "j-giao", code: "AG-J2061", post: "j1", title: "Cần người giao cơm trưa 11:00–12:00", cat: "Giao nhận", pay: 40000, unit: "/ buổi", when: "Hôm nay · 11:00 – 12:00", day: 0, tm: "11:00", dur: 60, head: 1,
      area: "Block B", exact: "Bếp B-0512 (cửa xanh, tầng 5)", desc: "Nhận cơm tại bếp, giao cho khách trong Block B và C. Khoảng 10–15 phần mỗi buổi, đi bộ hoặc xe đạp đều được.", reqs: ["Có mặt ở bếp lúc 10:55", "Giao trong Block B và C", "Gọi khách trước khi tới"],
      offers: [of("of-minh", "AG-J2061-1", "minh", "10:45 – 12:30", "Em học chiều nên trưa rảnh, có xe đạp, đã giao cơm cho Quán Nhà Mây 2 tháng."),
        of("of-khoa", "AG-J2061-2", "khoa", "11:00 – 12:00", "Đi bộ được, giao trong khu nhanh. Em đang chờ chị trả lời có cần xe máy không."),
        of("of-quoc", "AG-J2061-3", "quoc", "từ 11:15", "Làm online ở nhà, trưa ghé lấy cơm được. Hôm trước đi chợ giúp chị rồi.")],
      questions: [{ id: "q0", by: who("ha"), at: "Hôm qua", text: "Mỗi buổi giao khoảng mấy phần vậy chị?", answer: "Khoảng 10–15 phần, trong Block B và C." },
        { id: "q1", by: who("khoa"), at: "15 phút trước", text: "Có cần xe máy riêng không chị, hay đi bộ giao trong khu?" }] },
    { id: "j-cho", code: "AG-J2050", post: "j2", title: "Đi chợ đầu mối buổi sáng", cat: "Mua hộ", pay: 120000, unit: "/ lần", when: "Thứ Hai & thứ Năm · 6:00", day: 2, tm: "6:00", dur: 90, head: 1,
      area: "Block B", exact: "Bếp B-0512", desc: "Mua rau, thịt theo danh sách bếp gửi tối hôm trước, mang về bếp trước 7:30. Bếp ứng tiền chợ trước.", reqs: ["Có xe máy", "Giữ hóa đơn chợ"],
      offers: [of("of-2052", "AG-J2052", "quoc", "Thứ Hai · 6:00", "Nhà gần chợ, sáng nào cũng dậy sớm.", { st: "reported", day: -2, report: { note: "Đã mua đủ theo danh sách, hóa đơn chợ 1.240.000đ.", at: "7:10", photos: 2 } }),
        of("of-2058", "AG-J2058", "khoa", "Thứ Năm · 6:00", "Em rảnh sáng thứ Năm, có xe máy.", { st: "chosen", day: 2 })],
      questions: [] },
    { id: "j-rua", code: "AG-J2031", post: null, title: "Rửa giúp 40 hộp cơm sau ca trưa", cat: "Việc nhà", pay: 60000, unit: "/ lần", when: "Thứ Năm tuần trước · 13:00", day: -6, tm: "13:00", dur: 60, head: 1, closed: true,
      area: "Block B", exact: "Bếp B-0512", desc: "Rửa và úp khô 40 hộp cơm inox sau ca trưa.", reqs: [],
      offers: [of("of-2031", "AG-J2031", "minh", "13:00 – 14:00", "Em làm được ạ.", { st: "done", day: -6 })], questions: [] },
  ];
  const OFFER_STEPS = [["offered", "Đã gửi đề nghị"], ["chosen", "Được chọn"], ["working", "Đang làm"], ["reported", "Đã báo xong"], ["done", "Hoàn thành"]];
  const OFFER_END = { rejected: "Không được chọn", withdrawn: "Đã rút", cancelled: "Đã hủy" };
  function jobs(S) {
    return JOBS.map(b => {
      const j = JSON.parse(JSON.stringify(b));
      j.offers.forEach(o => {
        if (j.id === "j-giao" && S.chosen) o.st = o.who.n === S.chosen ? "chosen" : "rejected";
        if (o.id === "of-2052" && S.done["j-cho"]) o.st = "done";
        if (S.ost[o.id]) o.st = S.ost[o.id];
        o.label = OFFER_END[o.st] || OFFER_STEPS.find(x => x[0] === o.st)[1];
        o.rated = S.rated[o.id] || null;
      });
      j.questions.forEach(q => { if (S.answers[q.id]) q.answer = S.answers[q.id]; });
      Object.assign(j, S.jobs[j.id] || {});
      const act = j.offers.filter(o => ["chosen", "working", "reported", "done"].includes(o.st));
      j.waiting = j.offers.filter(o => o.st === "offered");
      j.label = j.closed ? (act.length ? "Đã xong" : "Đã đóng") : act.length >= j.head ? "Đã có người nhận" : `Đang mở · ${j.waiting.length} đề nghị`;
      j.need = j.waiting.length > 0 && act.length < j.head && !j.closed || j.offers.some(o => o.st === "reported") || j.questions.some(q => !q.answer);
      j.cls = j.need ? "act" : j.closed ? "done" : "go";
      return j;
    });
  }
  function offerAct(S, jobId, offerId, a, data = {}) {
    const j = jobs(S).find(x => x.id === jobId), o = j && j.offers.find(x => x.id === offerId);
    if (!o) return "";
    if (a === "choose") {
      if (jobId === "j-giao") { S.done["j-giao"] = 1; S.chosen = o.who.n; }
      else { S.ost[o.id] = "chosen"; j.offers.filter(x => x.id !== o.id && x.st === "offered").forEach(x => S.ost[x.id] = "rejected"); }
      save(S); return `Đã chọn ${o.who.n} — địa chỉ chính xác đã gửi, người khác được báo “Không được chọn”`;
    }
    if (a === "reject") { S.ost[o.id] = "rejected"; save(S); return `Đã từ chối đề nghị của ${o.who.n}`; }
    if (a === "confirmDone") { S.ost[o.id] = "done"; if (o.id === "of-2052") S.done["j-cho"] = 1; save(S); return `Đã xác nhận hoàn thành — nhớ trả ${money(j.pay)} cho ${o.who.n}`; }
    if (a === "rate") { S.rated[o.id] = { stars: data.stars, text: data.text }; save(S); return `Đã đánh giá ${o.who.n} ${data.stars} sao`; }
    return "";
  }
  function answer(S, qid, text) { S.answers[qid] = text; if (qid === "q1") S.done.q1 = 1; save(S); }
  function setJob(S, id, patch) { S.jobs[id] = Object.assign({}, S.jobs[id] || {}, patch); save(S); }

  /* ---------- Đánh giá khách viết cho gian hàng (★4,3 · 3 đánh giá, khớp shop.html) ---------- */
  const REVIEWS = [
    { id: "r1", by: who("thuy"), stars: 5, at: "2 giờ trước", order: "o3005", post: "Cơm gà xé", text: "Cơm dẻo, gà thấm, giao đúng giờ. Sẽ đặt tiếp." },
    { id: "r2", by: who("quoc"), stars: 4, at: "2 ngày trước", order: "o2998", post: "Cơm sườn rim", text: "Sườn mềm, hơi mặn chút.", reply: "Cảm ơn cháu, lần sau cô nêm nhạt hơn nhé!" },
    { id: "r3", by: who("minh"), stars: 4, at: "3 ngày trước", order: "o2990", post: "Cơm gà kho gừng", text: "Ngon, phần hơi ít cơm so với mình." },
  ];
  const reviews = S => REVIEWS.map(r => Object.assign({}, r, S.replies[r.id] ? { reply: S.replies[r.id] } : {}));
  function reply(S, rid, text) { S.replies[rid] = text; if (rid === "r1") S.done.r1 = 1; save(S); }

  /* ---------- Lịch: đơn đã xác nhận có giờ + việc đã chọn người ---------- */
  const toMin = t => { const m = /^(\d+):(\d+)/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : 0; };
  function calItems(S, d) {
    const out = [];
    for (const o of orders(S)) {
      if (o.day !== d || ["waiting", "declined", "cancelled"].includes(o.state)) continue;
      out.push({ id: o.id, k: o.k, tm: o.tm, dur: o.dur || 30, img: o.img, ic: o.ic, av: o.img ? null : o.buyer.av, who: o.buyer.n, addr: o.ful === "pickup" ? o.addr : (o.ful === "home" ? "Tại nhà khách " : "Giao tới ") + o.addr.split(",")[0],
        phone: o.buyer.phone, item: `${o.code} · ${o.title}`, href: `seller-orders.html?id=${o.id}`, done: o.state === "done" });
    }
    for (const j of jobs(S)) for (const o of j.offers) {
      if (!["chosen", "working", "reported", "done"].includes(o.st)) continue;
      const od = o.day != null ? o.day : j.day;
      if (od !== d) continue;
      out.push({ id: o.id, k: "job", tm: j.tm, dur: j.dur, av: o.who.av, who: o.who.n, addr: `Nhận việc tại ${j.exact.split(" (")[0]}`, phone: o.who.phone, item: `Việc · ${j.title}`, href: `seller-orders.html?job=${j.id}`, done: o.st === "done" });
    }
    return out.sort((a, b) => toMin(a.tm) - toMin(b.tm));
  }

  /* ---------- Giờ nhận đơn theo thứ (0 = Thứ Hai … 6 = Chủ nhật) ---------- */
  const HOURS = [["09:00", "13:00"], ["09:00", "13:00"], ["09:00", "13:00"], ["09:00", "13:00"], ["09:00", "13:00"], ["09:00", "11:00"], null];
  const hours = S => (S.hours && S.hours.length === 7 ? S.hours : HOURS.map(h => h ? { on: true, from: h[0], to: h[1] } : { on: false, from: "09:00", to: "13:00" }));
  const wd = d => (dateOf(d).getDay() + 6) % 7;      // thứ trong tuần của ngày cách hôm nay d ngày
  const openOf = (S, d) => { const h = hours(S)[wd(d)]; return h.on && !(S.offs || []).some(o => o.day === d) ? h : null; };

  /* ---------- Hồ sơ gian hàng (khớp shop.html; người bán sửa ở seller-shop.html) ---------- */
  const SHOP = { name: "Bếp Cô Lan", kind: "Bếp nhà làm", at: "Block B, tầng 5", since: "Hàng xóm từ 2023", reply: "Thường trả lời trong 10 phút",
    bio: "Cô nấu cơm nhà mỗi ngày cho mấy cháu đi làm trong khu: ít dầu, nêm vừa, rau luộc theo mùa. Thực đơn ngày mai cô đăng vào buổi tối, đặt trước 10:30 là kịp trưa.",
    av: AV.lan, cover: null, followers: 24, shopViews: 132 };
  const shop = S => Object.assign({}, SHOP, S.shop || {});
  const setShop = (S, patch) => { S.shop = Object.assign({}, S.shop || {}, patch); save(S); };

  window.AntSeller = { KEY, shop, setShop, hours, wd, openOf, load, save, U, F, money, dateOf, day, dayLabel, toMin, KIND, AV, IMG, POSTS, LANE, posts, setPost,
    ORDERS, STEPS, orders, orderActions, orderAct, JOBS, OFFER_STEPS, jobs, offerAct, answer, setJob, reviews, reply, calItems };
})();
