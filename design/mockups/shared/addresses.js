/* AntGo — Sổ địa chỉ dùng chung (kiểu Shopee). Dùng ở khung đặt (detail.html) và trang Tôi (profile.html).
   Dữ liệu: localStorage "antgo_addresses". API: AntAddr.all() · line(a) · text(a) · pick(idHiệnTại, cb(id)) · edit(id|null, cb(id)) · remove(id) · setDefault(id) */
(() => {
  const ICON = n => `<svg class="i"><use href="#${n}"/></svg>`;
  const AKEY = "antgo_addresses";
  const ADDR_SEED = [
    { id: "a1", name: "Ngọc Thủy", phone: "0912 345 678", block: "Block B", unit: "Căn 12.05", note: "", tag: "Nhà riêng", def: true, me: true },
    { id: "a2", name: "Mẹ — Cô Lan Anh", phone: "0987 654 321", block: "Block A", unit: "Căn 03.02", note: "Gọi trước khi lên, mẹ hay ở dưới sảnh", tag: "Người thân" },
  ];
  let ADDRS; try { ADDRS = JSON.parse(localStorage.getItem(AKEY)); } catch (e) {} if (!Array.isArray(ADDRS) || !ADDRS.length) ADDRS = ADDR_SEED.map(a => ({ ...a }));
  const saveAddrs = () => { try { localStorage.setItem(AKEY, JSON.stringify(ADDRS)); } catch (e) {} };
  const addrLine = a => `${a.block} · ${a.unit}`;
  const style = document.createElement("style");
  style.textContent = `  /* sổ địa chỉ */
  .am-scrim { position: fixed; inset: 0; z-index: 85; background: rgba(34,48,74,.35); display: none; place-items: center; padding: 20px; }
  .am-scrim.show { display: grid; }
  .am { width: 520px; max-width: 100%; max-height: calc(100vh - 40px); display: flex; flex-direction: column; border-radius: 18px; background: #fff; box-shadow: 0 30px 60px -20px rgba(34,48,74,.45); }
  .am-h { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
  .am-h h3 { font-size: 18px; font-weight: 700; }
  .am-h button { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--smoke); }
  .am-h button:hover { background: var(--soft); }
  .am-b { padding: 6px 22px 14px; overflow: auto; }
  .am-item { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .am-item input { accent-color: var(--accent); width: 18px; height: 18px; margin-top: 2px; flex: none; }
  .am-item span { flex: 1; min-width: 0; font-size: 14px; line-height: 1.5; }
  .am-item b { font-weight: 700; }
  .am-item i { font-style: normal; color: var(--smoke); margin-left: 8px; padding-left: 8px; border-left: 1px solid var(--border); }
  .am-item small { display: block; color: #3C4660; font-size: 13.5px; }
  .am-item .edit { flex: none; font-size: 13px; font-weight: 600; color: #2563A8; }
  .am-add { margin-top: 14px; width: 100%; height: 46px; border-radius: 12px; border: 1px dashed var(--fog); color: var(--accent); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .am-add:hover { background: var(--soft); }
  .am-f { padding: 14px 22px; border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; }
  .am-f button { height: 46px; border-radius: 12px; font-weight: 700; }
  .am-f .ghost { border: 1px solid var(--border); }
  .am-f .go { background: var(--accent); color: #fff; }
  .am-form { display: grid; gap: 12px; padding-top: 12px; }
  .am-form .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .am-form label { display: grid; gap: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--smoke); }
  .am-form input { height: 44px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; font: inherit; font-size: 14px; color: var(--ink); outline: none; text-transform: none; letter-spacing: 0; font-weight: 400; }
  .am-form input:focus { border-color: var(--ink); }
  .am-form .bad input, .am-form .bad .seg2 { outline: 2px solid #E8693A; outline-offset: 1px; border-radius: 10px; }
  .am-form .seg2 { display: flex; flex-wrap: wrap; gap: 6px; }
  .am-form .seg2 button { height: 36px; padding: 0 12px; border-radius: 9px; border: 1px solid var(--border); font-size: 13.5px; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--ink); }
  .am-form .seg2 button.on { background: var(--ink); border-color: var(--ink); color: #fff; }
  .am-form .chk { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--ink); }
  .am-form .chk input { width: 18px; height: 18px; accent-color: var(--accent); }
  .am-form .hint { font-size: 12.5px; color: var(--smoke); }
  .am-item em { display: inline-block; margin: 5px 6px 0 0; padding: 1px 7px; border-radius: 5px; border: 1px solid var(--accent); color: var(--accent); font-style: normal; font-size: 11px; font-weight: 600; }
  .am-item em.for { border-color: var(--ink); color: var(--ink); }
`;
  document.head.appendChild(style);
  /* ===== Sổ địa chỉ (kiểu Shopee): danh sách → chọn / sửa / thêm mới ===== */
  document.body.insertAdjacentHTML("beforeend", `<div class="am-scrim" id="amScrim"><div class="am" id="am"></div></div>`);
  let onDone = null, formOnly = false;
  const amS = document.getElementById("amScrim"), am = document.getElementById("am");
  let amPick = null;
  const amClose = () => amS.classList.remove("show");
  amS.addEventListener("click", e => { if (e.target === amS) amClose(); });
  function pick(cur, cb) { amPick = cur; onDone = cb; formOnly = false; amList(); amS.classList.add("show"); }
  function edit(id, cb) { onDone = cb; formOnly = true; amForm(id); amS.classList.add("show"); }
  function amList() {
    am.innerHTML = `<div class="am-h"><h3>Địa chỉ của tôi</h3><button data-x aria-label="Đóng">${ICON("xmark")}</button></div>
      <div class="am-b">${ADDRS.map(a => `<label class="am-item"><input type="radio" name="am" value="${a.id}" ${a.id === amPick ? "checked" : ""}>
        <span><b>${a.name}</b><i>${a.phone}</i><small>${addrLine(a)}</small>${a.note ? `<small style="color:var(--smoke)">${a.note}</small>` : ""}${a.def ? "<em>Mặc định</em>" : ""}${a.me ? "" : `<em class="for">${a.tag || "Người khác"}</em>`}</span>
        <button type="button" class="edit" data-edit="${a.id}">Sửa</button></label>`).join("")}
        <button class="am-add" data-new>+ Thêm địa chỉ mới</button>
        <p class="hint" style="margin-top:10px;font-size:12.5px;color:var(--smoke)">Đặt cho người khác: thêm địa chỉ và số điện thoại của người nhận rồi chọn địa chỉ đó. Bạn vẫn là người thanh toán và theo dõi đơn.</p></div>
      <div class="am-f"><button class="ghost" data-x>Hủy</button><button class="go" data-ok>Xác nhận</button></div>`;
    am.querySelectorAll("[name=am]").forEach(r => r.onchange = () => amPick = r.value);
    am.querySelectorAll("[data-x]").forEach(b => b.onclick = amClose);
    am.querySelector("[data-new]").onclick = () => amForm(null);
    am.querySelectorAll("[data-edit]").forEach(b => b.onclick = e => { e.preventDefault(); amForm(b.dataset.edit); });
    am.querySelector("[data-ok]").onclick = () => { amClose(); onDone && onDone(amPick); };
  }
  function amForm(id) {
    const a = id ? ADDRS.find(x => x.id === id) : { name: "", phone: "", block: "Block B", unit: "", note: "", tag: "Người thân", def: false };
    const BL = ["Block A", "Block B", "Block C", "Block D"], TG = ["Nhà riêng", "Người thân", "Khác"];
    am.innerHTML = `<div class="am-h"><h3>${id ? "Sửa địa chỉ" : "Địa chỉ mới"}</h3><button data-x aria-label="Đóng">${ICON("xmark")}</button></div>
      <div class="am-b"><div class="am-form">
        <div class="row2"><label id="fN">Họ và tên<input id="aN" value="${a.name}" placeholder="Tên người nhận"></label>
          <label id="fP">Số điện thoại<input id="aP" value="${a.phone}" inputmode="tel" placeholder="09xx xxx xxx"></label></div>
        <label>Khu<div class="seg2" id="aB">${BL.map(b => `<button type="button" class="${b === a.block ? "on" : ""}">${b}</button>`).join("")}</div></label>
        <label id="fU">Căn hộ / tầng<input id="aU" value="${a.unit}" placeholder="Ví dụ: Căn 03.02"></label>
        <label>Ghi chú cho người giao <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--fog)">(không bắt buộc)</span><input id="aT" value="${a.note}" placeholder="Ví dụ: gọi trước khi lên"></label>
        ${a.me ? "" : `<label>Đây là địa chỉ của<div class="seg2" id="aG">${TG.map(t => `<button type="button" class="${t === a.tag ? "on" : ""}">${t}</button>`).join("")}</div></label>`}
        <label class="chk"><input type="checkbox" id="aD" ${a.def ? "checked" : ""}>Đặt làm địa chỉ mặc định</label>
      </div></div>
      <div class="am-f"><button class="ghost" data-back>${formOnly ? "Hủy" : "Trở lại"}</button><button class="go" data-save>Hoàn thành</button></div>`;
    const seg = el => el && el.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; el.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); });
    seg(am.querySelector("#aB")); seg(am.querySelector("#aG"));
    am.querySelectorAll("input").forEach(i => i.oninput = () => i.closest("label").classList.remove("bad"));
    am.querySelector("[data-x]").onclick = amClose;
    am.querySelector("[data-back]").onclick = () => formOnly ? amClose() : amList();
    am.querySelector("[data-save]").onclick = () => {
      const v = x => am.querySelector(x).value.trim(), name = v("#aN"), phone = v("#aP"), unit = v("#aU");
      let ok = true;
      if (!name) { am.querySelector("#fN").classList.add("bad"); ok = false; }
      if (phone.replace(/\D/g, "").length !== 10) { am.querySelector("#fP").classList.add("bad"); ok = false; }
      if (!unit) { am.querySelector("#fU").classList.add("bad"); ok = false; }
      if (!ok) return;
      const rec = Object.assign(a, { name, phone, unit, note: v("#aT"), block: am.querySelector("#aB .on").textContent, tag: a.me ? a.tag : (am.querySelector("#aG .on") || {}).textContent || "Khác" });
      if (!id) { rec.id = "a" + Date.now(); ADDRS.push(rec); }
      if (am.querySelector("#aD").checked) ADDRS.forEach(x => x.def = x === rec);
      saveAddrs(); amPick = rec.id; if (formOnly) { amClose(); onDone && onDone(rec.id); } else amList();
    };
  }

  window.AntAddr = {
    all: () => ADDRS, line: addrLine, text: a => `${a.name} · ${a.phone} · ${addrLine(a)}`,
    pick, edit,
    remove: id => { const a = ADDRS.find(x => x.id === id); if (!a || a.def || a.me) return; ADDRS = ADDRS.filter(x => x !== a); saveAddrs(); },
    setDefault: id => { ADDRS.forEach(x => x.def = x.id === id); saveAddrs(); },
  };
})();
