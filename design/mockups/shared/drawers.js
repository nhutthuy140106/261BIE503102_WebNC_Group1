/* AntGo — ngăn kéo Đã lưu + AntXu dùng chung cho mọi trang.
   Trang cần có: nút #savedBtn, #savedCnt, #xuBtn trên header và các symbol icon (#heart, #heartFill, #xmark, #right, #ticket).
   Danh sách đã lưu nằm trong localStorage "antgo_saved". */
(() => {
  const style = document.createElement("style");
  style.textContent = `  /* ===== Đã lưu + Xu: nút trên header, tim bay, ngăn kéo bên phải ===== */
  .iconbtn .cnt { position: absolute; top: 3px; right: 1px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: var(--accent); color: #fff;
    font-size: 10.5px; font-weight: 700; display: grid; place-items: center; border: 2px solid var(--bg); }
  .iconbtn .cnt:empty { display: none; }
  .iconbtn.bump { animation: bump .45s cubic-bezier(.3,1.6,.5,1); }
  @keyframes bump { 40% { transform: scale(1.25); } }
  .xubtn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 10px; border-radius: 10px; font-weight: 600; transition: background .15s; }
  .xubtn:hover { background: var(--soft); }
  .xubtn .coin { width: 20px; height: 20px; }
  .item .save.on { color: var(--accent); }
  .flyheart { position: fixed; z-index: 60; width: 22px; height: 22px; color: var(--accent); pointer-events: none; }
  .xuok { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; padding: 2px 7px 2px 3px; border-radius: 999px; background: #FDF1DB; color: #8A5A10; font-size: 11px; font-weight: 600; }
  .xuok img { width: 14px; height: 14px; }

  .scrim { position: fixed; inset: 0; z-index: 70; background: rgba(34,48,74,.28); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .scrim.show { opacity: 1; pointer-events: auto; }
  .drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 71; width: 400px; max-width: 92vw; background: var(--card); visibility: hidden;
    transform: translateX(100%); transition: transform .35s cubic-bezier(.2,.8,.2,1), visibility .35s; display: flex; flex-direction: column; }
  .drawer.show { transform: none; visibility: visible; box-shadow: -20px 0 50px -20px rgba(34,48,74,.35); }
  .drawer header { position: static; display: flex; align-items: center; gap: 10px; padding: 18px 20px; border-bottom: 1px solid var(--border); background: none; backdrop-filter: none; }
  .drawer header h3 { font-size: 18px; font-weight: 700; }
  .drawer header .x { margin-left: auto; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--smoke); }
  .drawer header .x:hover { background: var(--soft); }
  .drawer .dbody { flex: 1; overflow: auto; padding: 16px 20px; }
  .drawer .dfoot { padding: 14px 20px; border-top: 1px solid var(--border); }
  .drawer .dfoot a { display: flex; justify-content: center; align-items: center; gap: 6px; height: 42px; border-radius: 10px; background: var(--soft); font-weight: 600; }
  .dchips { display: flex; gap: 6px; margin-bottom: 14px; overflow-x: auto; scrollbar-width: none; }
.dchips button { flex: none; white-space: nowrap; padding: 0 11px !important; }
  .dchips button { height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--border); font-size: 12.5px; font-weight: 500; color: var(--smoke); }
  .dchips button.on { background: var(--ink); border-color: var(--ink); color: #fff; }
  .srow { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .srow img, .srow .jb { width: 64px; height: 56px; border-radius: 10px; object-fit: cover; flex: none; }
  .srow .jb { background: var(--soft); display: grid; place-items: center; font-weight: 700; font-size: 12px; color: var(--ink); }
  .srow .t { flex: 1; min-width: 0; }
  .srow b { display: block; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .srow small { color: var(--smoke); font-size: 12.5px; }
  .srow .pr { color: var(--ink); font-weight: 700; font-size: 13.5px; }
  .srow .un { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: var(--accent); flex: none; }
  .srow .un:hover { background: var(--soft); }
  .srow.off { opacity: .5; }
  .srow.off .offtag { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--smoke); }
  .dempty { text-align: center; padding: 30px 10px; color: var(--smoke); line-height: 1.5; }
  .dempty img { width: 120px; margin-bottom: 8px; }

  .xubal { display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 16px; background: linear-gradient(135deg, #FFF3DE, #FDE8DD); }
  .xubal img { width: 56px; height: 56px; }
  .xubal b { font-size: 28px; font-weight: 700; letter-spacing: -.02em; }
  .xubal small { display: block; color: var(--smoke); font-size: 13px; }
  .dsec { margin-top: 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--smoke); }
  .vch { display: flex; align-items: center; gap: 12px; margin-top: 10px; padding: 12px; border-radius: 12px; border: 1px dashed #EDC9B4; background: #FFFBF8; }
  .vch .ic { width: 40px; height: 40px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; flex: none; }
  .vch .ic svg { width: 22px; height: 22px; }
  .vch .t { flex: 1; } .vch b { display: block; font-size: 14px; } .vch small { color: var(--smoke); font-size: 12.5px; }
  .vch button { height: 32px; padding: 0 12px; border-radius: 8px; background: var(--accent); color: #fff; font-weight: 600; font-size: 13px; white-space: nowrap; }
  .vch button.done { background: var(--soft); color: var(--smoke); }
  .earn { list-style: none; margin-top: 10px; display: grid; gap: 8px; }
  .earn li { display: flex; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: var(--soft); font-size: 13.5px; }
  .earn li b { color: #8A5A10; }
  .dnote { margin-top: 14px; font-size: 12px; color: var(--fog); }

`;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML("beforeend", `<div class="scrim" id="dScrim"></div>
<aside class="drawer" id="savedDrawer" aria-label="Đã lưu">
  <header><svg class="i" style="color:var(--accent)"><use href="#heartFill"/></svg><h3>Đã lưu</h3><button class="x" data-close aria-label="Đóng"><svg class="i"><use href="#xmark"/></svg></button></header>
  <div class="dbody"><div class="dchips" id="savedChips"><button class="on" data-k="all">Tất cả</button><button data-k="food">Đồ ăn &amp; uống</button><button data-k="goods">Đồ dùng</button><button data-k="svc">Dịch vụ</button><button data-k="jobs">Việc làm</button></div><div id="savedList"></div></div>
  <div class="dfoot"><a href="profile.html#saved">Xem tất cả bài đã lưu <svg class="i" style="width:16px;height:16px"><use href="#right"/></svg></a></div>
</aside>
<aside class="drawer" id="xuDrawer" aria-label="AntXu">
  <header><img src="assets/clean/antxu.png?v=2" alt="" style="width:24px;height:24px"><h3>AntXu của bạn</h3><button class="x" data-close aria-label="Đóng"><svg class="i"><use href="#xmark"/></svg></button></header>
  <div class="dbody">
    <div class="xubal"><img src="assets/clean/antxu.png?v=2" alt=""><div><b id="xuBal">120</b> <span style="font-weight:600">Xu</span><small>Dùng Xu để đổi voucher, áp dụng khi đặt hàng</small></div></div>
    <div class="dsec">Đổi voucher</div>
    <div id="vchList"></div>
    <div class="dsec">Voucher của bạn</div>
    <div id="myVch"><p class="dnote" style="margin-top:8px">Chưa có voucher. Đổi ở trên rồi chọn khi đặt hàng nhé.</p></div>
    <div class="dsec">Cách nhận thêm Xu</div>
    <ul class="earn"><li>Hoàn thành một đơn hàng <b>+10 Xu</b></li><li>Đánh giá sau khi nhận hàng <b>+5 Xu</b></li><li>Hoàn thành một việc đã nhận <b>+15 Xu</b></li></ul>
    <p class="dnote">Mức Xu và voucher chỉ là minh họa, cơ chế AntXu chưa chốt.</p>
  </div>
</aside>`);
  const U = window.U || ((id, w = 500, h = 375) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=70`);
  /* ===== Đã lưu (tim bay lên header + ngăn kéo) & AntXu (ngăn kéo voucher) ===== */
  (() => {
    const $ = id => document.getElementById(id), scrim = $("dScrim");
    // vài bài đã lưu sẵn để ngăn kéo có nội dung minh họa (1 bài "hết món" để thấy trạng thái không còn khả dụng)
    // Danh sách đã lưu dùng chung giữa các trang (localStorage). Lần đầu: vài bài mẫu để ngăn kéo có nội dung.
    const SEED = [
      ["1585032226651-759b368d7246", { k: "food", id: "1585032226651-759b368d7246", t: "Mì xào hải sản", p: "40.000đ", u: "/ phần", a: "Block C" }],
      ["job-cho-meo", { k: "jobs", id: "", t: "Cho mèo ăn 3 ngày khi đi vắng", p: "150.000đ", u: "/ 3 ngày", a: "Block B" }],
      ["1563453392212-326f5e854473", { k: "svc", id: "1563453392212-326f5e854473", t: "Vệ sinh máy lạnh", p: "150.000đ", u: "/ máy", a: "Block D", off: "Tạm ngưng nhận" }],
    ];
    let saved;
    try { saved = new Map(JSON.parse(localStorage.getItem("antgo_saved")) || SEED); } catch (e) { saved = new Map(SEED); }
    const persist = () => { try { localStorage.setItem("antgo_saved", JSON.stringify([...saved])); } catch (e) {} };
    let filt = "all";
    const count = () => { $("savedCnt").textContent = saved.size || ""; persist(); };
    const render = () => {
      const list = [...saved.entries()].filter(([, v]) => filt === "all" || v.k === filt);
      $("savedList").innerHTML = list.length ? list.map(([key, v]) => `
        <div class="srow${v.off ? " off" : ""}" data-k="${v.k}" style="cursor:${v.off ? "default" : "pointer"}">${v.id ? `<img src="${U(v.id, 160, 140)}" alt="">` : `<span class="jb">Việc</span>`}
          <div class="t"><b>${v.t}</b><span class="pr">${v.p}</span> <small>${v.u} · ${v.a}</small>${v.off ? `<span class="offtag">· ${v.off}</span>` : ""}</div>
          <button class="un" data-un="${key}" title="Bỏ lưu"><svg class="i"><use href="#heartFill"/></svg></button></div>`).join("")
        : `<div class="dempty"><img src="assets/clean/peek.png" alt="">Chưa lưu gì ở mục này.<br>Bấm ♡ trên bài để lưu lại xem sau nhé.</div>`;
    };
    const reload = () => { try { const v = JSON.parse(localStorage.getItem("antgo_saved")); if (v) saved = new Map(v); } catch (e) {} };
    const open = d => { $(d).classList.add("show"); scrim.classList.add("show"); if (d === "savedDrawer") { reload(); render(); } };
    const close = () => { document.querySelectorAll(".drawer.show").forEach(d => d.classList.remove("show")); scrim.classList.remove("show"); };
    $("savedBtn").addEventListener("click", () => open("savedDrawer"));
    $("xuBtn").addEventListener("click", () => open("xuDrawer"));
    scrim.addEventListener("click", close);
    document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", close));
    addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    $("savedChips").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
      document.querySelectorAll("#savedChips button").forEach(x => x.classList.toggle("on", x === b)); filt = b.dataset.k; render(); });
    $("savedList").addEventListener("click", e => { const b = e.target.closest("[data-un]");
      if (!b) { const r = e.target.closest(".srow"); if (r && !r.classList.contains("off")) location.href = r.dataset.k === "jobs" ? "job.html" : "detail.html?p=" + ({ svc: "svc", goods: "goods", food: "food" }[r.dataset.k] || "food"); return; }
      saved.delete(b.dataset.un); document.querySelectorAll(".item .save.on").forEach(sv => { if (JSON.parse(sv.dataset.save).id === b.dataset.un) setHeart(sv, false); }); count(); render(); });

    const setHeart = (sv, on) => { sv.classList.toggle("on", on); sv.querySelector("use").setAttribute("href", on ? "#heartFill" : "#heart"); };
    // bấm tim trên thẻ: lưu / bỏ lưu; khi lưu → một trái tim bay lên icon Đã lưu trên header
    document.addEventListener("click", e => {
      const sv = e.target.closest(".item .save[data-save]"); if (!sv) return;
      e.preventDefault(); e.stopPropagation();
      const v = JSON.parse(sv.dataset.save), on = !saved.has(v.id);
      if (on) saved.set(v.id, v); else saved.delete(v.id);
      setHeart(sv, on);
      if (!on) return count();
      const a = sv.getBoundingClientRect(), b = $("savedBtn").getBoundingClientRect();
      const h = document.createElement("div"); h.className = "flyheart"; h.innerHTML = '<svg class="i" style="width:22px;height:22px"><use href="#heartFill"/></svg>';
      h.style.left = a.left + a.width / 2 - 11 + "px"; h.style.top = a.top + a.height / 2 - 11 + "px"; document.body.appendChild(h);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      h.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx * .5}px, ${dy * .5 - 60}px) scale(1.4)`, opacity: 1, offset: .5 },
                 { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: .9 }], { duration: 700, easing: "cubic-bezier(.4,0,.2,1)" })
        .onfinish = () => { h.remove(); count(); const btn = $("savedBtn"); btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump"); };
    }, true);
    window.antSaved = { reload: () => { reload(); count(); } };
    count();
    document.querySelectorAll(".item .save[data-save]").forEach(sv => { if (saved.has(JSON.parse(sv.dataset.save).id)) setHeart(sv, true); });

    // AntXu: đổi voucher bằng Xu (minh họa)
    let bal = 120;
    const VCH = [["Giảm 10.000đ", "Đơn từ 50.000đ", 20], ["Giảm 20.000đ", "Đơn từ 150.000đ", 50], ["Miễn phí giao trong khu", "Đơn đồ ăn bất kỳ", 30]];
    const renderV = () => { $("vchList").innerHTML = VCH.map(([t, c, x], i) => `<div class="vch"><span class="ic"><svg class="i"><use href="#ticket"/></svg></span>
      <div class="t"><b>${t}</b><small>${c} · ${x} Xu</small></div><button data-v="${i}" ${bal < x ? "disabled style='opacity:.45'" : ""}>Đổi</button></div>`).join(""); };
    renderV();
    $("vchList").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b || b.disabled) return;
      const [t, c, x] = VCH[+b.dataset.v]; bal -= x; $("xuBal").textContent = bal; $("xuBtn").lastChild.textContent = bal + " Xu";
      const mine = $("myVch"); if (mine.querySelector(".dnote")) mine.innerHTML = "";
      mine.insertAdjacentHTML("beforeend", `<div class="vch"><span class="ic"><svg class="i"><use href="#ticket"/></svg></span><div class="t"><b>${t}</b><small>${c} · dùng ở bước đặt hàng</small></div><button class="done" disabled>Đã đổi</button></div>`);
      renderV(); });
  })();
})();
