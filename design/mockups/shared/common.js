/* Điều hướng và chọn khu vực dùng chung cho bản mẫu AntGo. */
(() => {
  const areaKey = "antgo_area";
  const blocks = ["Block A", "Block B", "Block C", "Block D"];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const icon = name => `<svg class="i"><use href="#${name}"/></svg>`;
  const getArea = () => { try { return blocks.includes(localStorage.getItem(areaKey)) ? localStorage.getItem(areaKey) : "Block B"; } catch (e) { return "Block B"; } };
  const setArea = value => { try { localStorage.setItem(areaKey, value); } catch (e) {} document.querySelectorAll("[data-area-label]").forEach(x => x.textContent = value); window.dispatchEvent(new CustomEvent("antgo:area", { detail: value })); };
  // Mã + tên đơn mẫu để trang nào cũng hiện "AG-J1998 · Cho mèo ăn…" thay vì mã nội bộ j3/o1
  const ORDERS = { j1:["AG-J2041","Mua đồ chợ sáng giúp nhà mình"], j2:["AG-J2017","Dọn phòng cuối tuần"], j3:["AG-J1998","Cho mèo ăn 3 ngày khi đi vắng"],
    j4:["AG-J2033","Lấy giúp phần cơm ở cổng sau"], j5:["AG-J1975","Phụ khiêng tủ lên tầng 12"], j6:["AG-J2010","Trông bé 2 tiếng tối thứ Sáu"],
    o1:["AG-O3012","Cơm nhà làm — cơm gà xé ×2"], o2:["AG-O3009","Giặt sấy gấp 5kg"], o3:["AG-O2987","Phở bò tái ×2"] };
  const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const orderRef = id => {
    if (ORDERS[id]) return { code: ORDERS[id][0], title: ORDERS[id][1] };
    const o = readJSON("antgo_orders", {})[id];
    return o && o.title ? { code: o.code || ("AG-" + String(id).toUpperCase()), title: o.title } : null;
  };
  // Bài đã lưu mẫu: ghi ngay lần đầu để header, ngăn kéo và trang Tôi cùng đọc một danh sách
  if (localStorage.getItem("antgo_saved") === null) try { localStorage.setItem("antgo_saved", JSON.stringify([
    ["1585032226651-759b368d7246", { k: "food", id: "1585032226651-759b368d7246", t: "Mì xào hải sản", p: "40.000đ", u: "/ phần", a: "Block C" }],
    ["job-cho-meo", { k: "jobs", id: "", t: "Cho mèo ăn 3 ngày khi đi vắng", p: "150.000đ", u: "/ 3 ngày", a: "Block B" }],
    ["1563453392212-326f5e854473", { k: "svc", id: "1563453392212-326f5e854473", t: "Vệ sinh máy lạnh", p: "150.000đ", u: "/ máy", a: "Block D", off: "Tạm ngưng nhận" }]])); } catch (e) {}
  // Đã lưu: bài đồ ăn/uống lưu trước đây mang loại "goods" → đổi sang "food" để lọc được Đồ ăn & uống
  try { const FOOD = ["1585032226651-759b368d7246", "1504674900247-0877df9cc836", "1569718212165-3a8278d5f624", "1604908176997-125f25cc6f3d", "1540189549336-e6e99c3679fe", "1567620905732-2d1ec7ab7445", "1555939594-58d7cb561ad1", "1509042239860-f550ce710b93", "1565299624946-b28f40a0ae38", "1558857563-b371033873b8", "1546069901-ba9599a7e63c", "1512621776951-a57141f2eefd", "1565958011703-44f9829ba187", "1542838132-92c53300491e", "1495474472287-4d71bcdd2085"]; const sv = JSON.parse(localStorage.getItem("antgo_saved") || "null");
    if (Array.isArray(sv) && sv.some(([, v]) => v && v.k === "goods" && FOOD.includes(v.id))) { sv.forEach(([, v]) => { if (v && v.k === "goods" && FOOD.includes(v.id)) v.k = "food"; }); localStorage.setItem("antgo_saved", JSON.stringify(sv)); } } catch (e) {}
  // Thông báo chưa đọc: đếm từ đúng danh sách ở notifications.html (mẫu + đơn vừa đặt)
  const unreadCount = () => {
    const seen = readJSON("antgo_notification_read", {});
    const placed = Object.values(readJSON("antgo_orders", {})).filter(o => o && o._type === "placed" && o.id && o.title && !["o1","o2","o3"].includes(o.id)).map(o => "placed-" + o.id);
    return ["pick-j2", "confirm-o1", "report-j4", ...placed].filter(id => !seen[id]).length;
  };
  const refreshBell = () => document.querySelectorAll("header .right .iconbtn[title='Thông báo']").forEach(b => {
    let d = b.querySelector(".d"); const n = unreadCount();
    if (n && !d) { d = document.createElement("span"); d.className = "d"; b.appendChild(d); }
    if (!n && d) d.remove();
  });
  window.AntGo = { getArea, setArea, esc, icon, orderRef, refreshBell };

  const mount = document.getElementById("siteHeader");
  if (mount) {
    // Header + footer giống hệt trang chủ (CSS ở shared/chrome.css) để mọi trang trông là một app.
    const active = mount.dataset.active || "";
    if (!document.querySelector("link[href='shared/chrome.css']")) document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="shared/chrome.css">');
    const q0 = new URLSearchParams(location.search).get("q") || "";
    mount.outerHTML = `<header class="appbar"><div class="wrap bar">
      <div class="left">
        <a class="logo" href="home-v5.html">Ant<span>Go</span></a>
        <nav><a href="home-v5.html" class="${active === "home" ? "on" : ""}" title="Trang chủ">${icon("home")}<span class="t">Trang chủ</span></a>
          <a href="orders.html" class="${active === "orders" ? "on" : ""}" title="Đơn hàng">${icon("receipt")}<span class="t">Đơn hàng</span></a>
          <a href="messenger.html" class="${active === "messenger" ? "on" : ""}" title="Messenger">${icon("chat")}<span class="t">Messenger</span></a></nav>
      </div>
      <div class="hsearch"><svg class="i lead"><use href="#search"/></svg><input placeholder="Tìm món ăn, đồ dùng, dịch vụ hoặc việc làm" value="${esc(q0)}"><button class="sbtn" data-voice title="Tìm bằng giọng nói">${icon("mic")}</button><button class="sbtn" data-image title="Tìm bằng hình ảnh">${icon("camera")}</button><button class="go" aria-label="Tìm">${icon("search")}</button></div>
      <div class="right">
        <div class="role" data-role title="Đổi vai trò"><button class="on" data-v="buy">Mua</button><button data-v="sell">Bán</button></div>
        <button class="hbtn" title="Khu vực đang xem">${icon("pin")}<span class="t">${getArea()}</span><svg class="i chev"><use href="#chev"/></svg></button>
        <span class="sep"></span>
        <button class="xubtn" id="xuBtn" title="AntXu của bạn"><img class="coin" src="assets/clean/antxu.png?v=2" alt="">120 Xu</button>
        <button class="iconbtn" id="savedBtn" title="Đã lưu">${icon("heart")}<span class="cnt" id="savedCnt"></span></button>
        <button class="iconbtn" title="Thông báo">${icon("bell")}</button>
        <span class="av" title="Tài khoản"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=70" alt="Tài khoản"></span>
      </div>
    </div></header>`;
    const main = document.querySelector("main");
    if (main && !document.querySelector("footer")) main.insertAdjacentHTML("afterend", `<footer class="appfoot">
      <img class="peek" src="assets/clean/peek.png" alt="">
      <div class="wrap top">
        <div class="brand"><span class="logo">Ant<span>Go</span></span><p>Ứng dụng kết nối hàng xóm trong khu — mua bán, đặt dịch vụ và giúp nhau ngay gần nhà.</p></div>
        <div><h4>Khám phá</h4><ul><li><a href="search.html?type=food">Đồ ăn &amp; thức uống</a></li><li><a href="search.html?type=goods">Đồ dùng</a></li><li><a href="search.html?type=service">Dịch vụ</a></li><li><a href="search.html?type=jobs">Việc làm</a></li><li><a href="profile.html">Đã lưu</a></li></ul></div>
        <div><h4>Bán &amp; Đăng việc</h4><ul><li><a>Đăng bài bán</a></li><li><a>Đăng việc cần người</a></li><li><a class="xu"><img class="coin" src="assets/clean/antxu.png?v=2" alt="Xu">Quảng bá bằng AntXu</a></li><li><a>Hướng dẫn người bán</a></li></ul></div>
        <div><h4>Hỗ trợ</h4><ul><li><a href="support.html">Trung tâm trợ giúp</a></li><li><a>An toàn giao dịch</a></li><li><a href="support.html">Báo cáo vi phạm</a></li><li><a>Liên hệ AntGo</a></li></ul></div>
      </div>
      <div class="bottom"><div class="wrap"><span>© 2026 AntGo</span><a>Điều khoản</a><a>Quyền riêng tư</a><span class="end">${icon("pin")}Đang xem: <span data-area-label>${getArea()}</span> · Tiếng Việt</span></div></div>
    </footer>`);
    // Mua | Bán: không gian Bán chưa dựng
    document.querySelectorAll(".appbar [data-role] button").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.v === "sell") toast("Không gian Bán & Đăng việc đang được làm");
    }));
    // giọng nói (Chrome/Edge) và hình ảnh (mô phỏng) như trang chủ
    const hs = document.querySelector(".appbar .hsearch"), hin = hs.querySelector("input");
    hs.querySelector("[data-voice]").addEventListener("click", e => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition, btn = e.currentTarget;
      if (!SR) return toast("Trình duyệt này chưa hỗ trợ tìm bằng giọng nói");
      const rec = new SR(); rec.lang = "vi-VN"; btn.classList.add("rec");
      rec.onresult = ev => { hin.value = ev.results[0][0].transcript; location.href = "search.html?q=" + encodeURIComponent(hin.value); };
      rec.onend = () => btn.classList.remove("rec"); rec.start();
    });
    hs.querySelector("[data-image]").addEventListener("click", () => toast("Tìm bằng ảnh cần máy chủ nhận dạng — bản mẫu chưa hỗ trợ"));
    // ngăn kéo Đã lưu + Xu dùng chung
    if (!document.querySelector("script[src='shared/drawers.js']")) { const sc = document.createElement("script"); sc.src = "shared/drawers.js"; document.body.appendChild(sc); }
  }
  function toast(t) { let el = document.getElementById("appToast"); if (!el) { el = document.createElement("div"); el.id = "appToast"; el.className = "app-toast"; document.body.appendChild(el); }
    el.textContent = t; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2400); }
  window.AntGo.toast = toast;

  // Các trang cũ đã có header riêng: nối đúng nơi đến, không đổi bố cục đã duyệt.
  document.querySelectorAll("header nav a[title='Messenger']").forEach(a => { a.href = "messenger.html"; a.querySelector(".n")?.remove(); });
  document.querySelectorAll("header .right .iconbtn[title='Thông báo']").forEach(b => { b.onclick = () => location.href = "notifications.html"; b.querySelector(".d")?.remove(); });
  refreshBell();
  document.querySelectorAll("header .right .av[title='Tài khoản']").forEach(a => { a.style.cursor = "pointer"; a.setAttribute("role", "link"); a.setAttribute("tabindex", "0"); a.onclick = () => location.href = "profile.html"; a.onkeydown = e => { if (e.key === "Enter") a.click(); }; });
  document.querySelectorAll("header .right .hbtn[title='Khu vực đang xem']").forEach(b => { const label = b.querySelector(".t"); if (label) { label.dataset.areaLabel = ""; label.textContent = getArea(); } b.onclick = openArea; });
  document.querySelectorAll("[data-area-label]").forEach(x => x.textContent = getArea());
  document.querySelectorAll(".hsearch,.bigsearch").forEach(box => {
    const input = box.querySelector("input"), go = box.querySelector("button.go");
    if (!input || !go) return;
    const search = () => location.href = "search.html" + (input.value.trim() ? "?q=" + encodeURIComponent(input.value.trim()) : "");
    go.addEventListener("click", search);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); search(); } });
  });

  if (!document.querySelector("link[href='shared/base.css']")) {
    const style = document.createElement("style");
    style.textContent = `.area-backdrop{position:fixed;inset:0;z-index:90;background:rgba(34,48,74,.28);display:none;align-items:flex-start;justify-content:center;padding:95px 16px 16px}.area-backdrop.open{display:flex}.area-dialog{width:420px;max-width:100%;background:#fff;border-radius:16px;padding:22px;box-shadow:0 24px 60px rgba(34,48,74,.22);color:var(--ink);font-family:"Mona Sans",sans-serif}.area-dialog h2{font-size:19px;margin:0 0 5px}.area-dialog p{margin:0 0 18px;color:var(--smoke)}.area-dialog .choices{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.area-dialog .choices button{padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:#fff;text-align:left;font-weight:600}.area-dialog .choices button:hover,.area-dialog .choices button.on{border-color:var(--ink);background:var(--soft)}.area-dialog .foot{display:flex;justify-content:flex-end;margin-top:18px}.area-dialog .foot button{padding:9px 14px;border:1px solid var(--border);border-radius:9px;background:#fff}`;
    document.head.appendChild(style);
  }
  document.body.insertAdjacentHTML("beforeend", `<div class="area-backdrop" id="areaBackdrop"><div class="area-dialog" role="dialog" aria-modal="true" aria-label="Chọn khu vực"><h2>Chọn khu vực đang xem</h2><p>Bài trong khu bạn chọn được ưu tiên khi tìm kiếm.</p><div class="choices">${blocks.map(b => `<button data-area="${b}">${b}</button>`).join("")}</div><div class="foot"><button data-area-close>Đóng</button></div></div></div>`);
  const overlay = document.getElementById("areaBackdrop");
  function openArea() { overlay.classList.add("open"); overlay.querySelectorAll("[data-area]").forEach(b => b.classList.toggle("on", b.dataset.area === getArea())); }
  const closeArea = () => overlay.classList.remove("open");
  document.querySelectorAll("[data-area-open]").forEach(b => b.addEventListener("click", openArea));
  overlay.addEventListener("click", e => { if (e.target === overlay || e.target.closest("[data-area-close]")) closeArea(); const b = e.target.closest("[data-area]"); if (b) { setArea(b.dataset.area); closeArea(); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && overlay.classList.contains("open")) closeArea(); });
})();
