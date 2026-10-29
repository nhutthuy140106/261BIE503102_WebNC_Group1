// Tìm kiếm thông minh (tự cài, không dịch vụ ngoài): chịu gõ sai, đồng nghĩa, xếp hạng TF-IDF.
// Chỉ chạy khi tìm thường (regex) không ra gì — xem catalog.service.js.
const { stripAccents } = require('./text');

// Nhóm từ đồng nghĩa/gần nghĩa theo cách người trong khu hay gọi (không dấu)
const SYNONYM_GROUPS = [
  ['com', 'bua', 'suat', 'com hop'],
  ['tra sua', 'tra', 'tra tran chau', 'bubble tea'],
  ['ca phe', 'cafe', 'coffee', 'cf'],
  ['banh mi', 'banh', 'sandwich'],
  ['pho', 'bun', 'mi', 'hu tieu', 'mon nuoc'],
  ['do uong', 'nuoc', 'giai khat', 'sinh to', 'nuoc ep'],
  ['giat', 'giat ui', 'giat say', 'giat do', 'say do'],
  ['don nha', 've sinh', 'lau nha', 'don dep', 'tong ve sinh'],
  ['sua may', 'sua chua', 'tho sua', 'bao tri'],
  ['giao hang', 'ship', 'van chuyen', 'giao nhan', 'lay do ho', 'chay viec'],
  ['dat ho', 'mua ho', 'di cho ho', 'di cho'],
  ['xe dap', 'xe', 'bike'],
  ['tai nghe', 'headphone', 'earphone'],
  ['ghe', 'sofa', 'ban ghe', 'noi that'],
  ['dung cu', 'noi chien', 'noi', 'bep'],
  ['dat thu cung', 'cho', 'meo', 'thu cung', 'trong thu'],
  ['gia su', 'day kem', 'day hoc', 'hoc'],
  ['viec', 'cong viec', 'kiem them', 'lam them', 'part time'],
];
const SYN = new Map();
for (const g of SYNONYM_GROUPS) for (const t of g) SYN.set(t, g);

const STOP = new Set(['toi', 'minh', 'can', 'muon', 'tim', 'cho', 'co', 'khong', 'nao', 'gi', 'nhe', 'la', 'mot', 'cai', 'nhung', 'va', 'giup', 'voi']);
const tokens = (s) => stripAccents(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !STOP.has(t));

const squash = (s) => s.replace(/(.)+/g, '$1');

/** Khoảng cách chỉnh sửa (Levenshtein), dừng sớm khi vượt max. */
function lev(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Từ khóa → các từ có thể khớp, kèm trọng số (gốc 1, đồng nghĩa 0.6). */
function expand(q) {
  const out = new Map();
  const add = (t, w) => { if (!out.has(t) || out.get(t) < w) out.set(t, w); };
  const toks = tokens(q);
  for (const t of toks) {
    add(t, 1);
    for (const s of SYN.get(t) || []) for (const part of s.split(' ')) add(part, 0.6);
  }
  const bi = toks.slice(1).map((t, i) => `${toks[i]} ${t}`); // cụm hai từ: "tra sua", "ca phe"
  for (const phrase of bi) for (const s of SYN.get(phrase) || []) for (const part of s.split(' ')) add(part, 0.6);
  return out;
}

/**
 * Xếp hạng `docs` ({ searchText }) cho truy vấn q.
 * Điểm = Σ trọng số từ × idf (khớp đúng 1 | gõ sai gần 0.7 | tiền tố 0.8 | đồng nghĩa 0.6). Trả [{ doc, score }] đã sắp, bỏ điểm 0.
 */
function rank(docs, q) {
  const terms = expand(q);
  if (!terms.size) return [];
  const docToks = docs.map((d) => new Set(tokens(d.searchText || '')));
  const df = new Map();
  for (const set of docToks) for (const t of set) df.set(t, (df.get(t) || 0) + 1);
  const N = docs.length;
  const idf = (t) => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
  const vocab = [...df.keys()];

  // mỗi từ khóa → từ thật trong kho (đúng hoặc gõ sai ≤ 1–2 ký tự)
  const matched = new Map();
  const put = (v, w) => matched.set(v, Math.max(matched.get(v) || 0, w));
  for (const [t, w] of terms) {
    const max = t.length <= 4 ? 1 : 2;
    for (const v of vocab) {
      if (v === t) put(v, w);
      else if (squash(t) === squash(v)) put(v, w * 0.8); // gõ lặp chữ kiểu Telex: "coom", "gaa"
      else if (t.length >= 4 && v.length >= 3 && lev(t, v, max) <= max) put(v, w * 0.7);
      else if (t.length >= 4 && v.length >= 4 && (v.startsWith(t) || t.startsWith(v))) put(v, w * 0.8);
    }
  }
  return docs
    .map((doc, i) => {
      let score = 0;
      for (const [v, w] of matched) if (docToks[i].has(v)) score += w * idf(v);
      return { doc, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

module.exports = { rank, expand, lev, tokens };
