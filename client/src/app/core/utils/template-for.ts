import { POST_TEMPLATES, unsplash } from '../config/post-templates';
import { REVIEW_SAMPLES } from '../config/review-samples';
import { Post } from '../models/post';
import { displayUnit } from './unit';
import { placedStepNames } from './placed-steps';
import { OptionBlock, PlaceBlock, PostTemplate, SampleReview, TemplateKey } from '../models/post-template';
import { OptionGroup } from '../models/post';

const FALLBACK: Record<string, TemplateKey> = { food: 'food', goods: 'goods', service: 'svc', job: 'svc' };

export interface PostView {
  tpl: PostTemplate;
  key: TemplateKey;
  images: string[];
  reviews: SampleReview[];
}

const DAY_L: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };

function windowText(w: { from: string; to: string; days: number[] }): string {
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => w.days.includes(d)).map((d) => DAY_L[d]);
  return `Nhận đặt ${w.from} – ${w.to} ${days.length && days.length < 7 ? days.join(', ') : 'mỗi ngày'}`;
}

function vnd(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

/**
 * 3 ô thông tin đầu trang (tối đa 3, mỗi ô: chữ đậm NGẮN một dòng / nhãn). Lấy đúng dữ liệu người bán nhập, ô nào không có thì bỏ.
 * Chi tiết phụ (ngày bán, phí giao, khung giờ giao) KHÔNG ghi ở đây — khách vẫn thấy khi đặt.
 */
function receiveFact(place: PlaceBlock): PostTemplate['facts'][number] | null {
  const ch = place.choices ?? [];
  if (!ch.length) return null;
  const delivers = ch.some(([n]) => n.startsWith('Giao'));
  const picks = ch.some(([n]) => !n.startsWith('Giao'));
  return ['pin', 'Cách nhận', [delivers ? 'Giao tận nơi' : '', picks ? 'Tự đến lấy' : ''].filter(Boolean).join(', ')];
}

/** Đồ ăn & uống: Giờ nhận đặt · Cách nhận · Thời gian chuẩn bị */
function foodFacts(post: Post, place: PlaceBlock): PostTemplate['facts'] {
  const w = post.orderWindow;
  const out: PostTemplate['facts'] = [];
  if (w) out.push(['clock', 'Giờ nhận đặt', `${w.from} – ${w.to}`]);
  const r = receiveFact(place);
  if (r) out.push(r);
  if (post.prepMinutes) out.push(['bolt', 'Thời gian chuẩn bị', `Khoảng ${post.prepMinutes} phút`]);
  return out;
}

/** Chữ ngắn cho "Nơi làm" của dịch vụ */
function placeText(place: PlaceBlock): string {
  switch (place.mode) {
    case 'buyer': return 'Tại nhà bạn';
    case 'seller': return 'Bạn mang tới';
    case 'choice': return (place.choices ?? []).map(([n]) => n).join(', ');
    case 'ab': return 'Lấy ở A, giao tới B';
  }
}

/** Dịch vụ: Thời gian hoàn thành · Nơi làm · Bảo hành (báo giá sau mà chưa ghi bảo hành thì ô 3 là Phí kiểm tra); còn thiếu ô thì thêm Giờ nhận lịch */
function serviceFacts(post: Post, place: PlaceBlock): PostTemplate['facts'] {
  if (post.highlights?.length) return post.highlights.map((h) => [h.icon, h.label, h.value]);
  const out: PostTemplate['facts'] = [];
  const info = post.serviceInfo;
  if (info?.turnaround) out.push(['clock', 'Thời gian hoàn thành', info.turnaround]);
  const where = placeText(place);
  if (where) out.push(['pin', 'Nơi làm', where]);
  if (info?.warranty) out.push(['shield', 'Bảo hành', info.warranty]);
  else if (post.priceType === 'quote') out.push(['receipt', 'Phí kiểm tra', vnd(post.inspectFee ?? 0)]);
  if (out.length < 3 && post.handover) out.push(['clock', 'Giờ nhận lịch', `${post.handover.from} – ${post.handover.to}`]);
  return out;
}

const COND: Record<string, string> = { '100': 'Mới 100%', '90': 'Mới 90%', '80': 'Còn 80%', '50': 'Còn 50%' };

/** "Hôm nay" · "3 ngày trước" · dd/MM — theo ngày đăng của bài */
function postedText(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!(days >= 0)) return 'Vừa đăng';
  if (days === 0) return 'Hôm nay';
  return days < 7 ? `${days} ngày trước` : new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

/** Đồ dùng: Ngày đăng · Cách nhận · Tình trạng */
function goodsFacts(post: Post, place: PlaceBlock): PostTemplate['facts'] {
  const out: PostTemplate['facts'] = [];
  if (post.createdAt) out.push(['clock', 'Ngày đăng', postedText(post.createdAt)]);
  const r = receiveFact(place);
  if (r) out.push(r);
  if (post.condition) out.push(['check', 'Tình trạng', COND[post.condition.level] ?? post.condition.level + '%']);
  return out;
}

/** Gộp các nhóm tùy chọn trùng tên (tùy chọn riêng từng món áp chung cho cả đơn): giữ lựa chọn đầu tiên của mỗi nhãn */
function mergeGroups(list: OptionGroup[]): OptionGroup[] {
  const out: OptionGroup[] = [];
  for (const g of list) {
    const cur = out.find((x) => x.name === g.name);
    if (!cur) out.push({ ...g, choices: [...g.choices] });
    else for (const c of g.choices) if (!cur.choices.some((x) => x.label === c.label)) cur.choices.push(c);
  }
  return out;
}

/** Nơi làm của dịch vụ theo người bán chọn */
function svcPlace(post: Post, base: PlaceBlock): PlaceBlock {
  const pl = post.place!;
  const fee = post.deliveryFee ?? 0;
  switch (pl.mode) {
    case 'seller': return { mode: 'seller', label: 'Nơi làm', where: pl.where ?? base.where };
    case 'choice': return { mode: 'choice', label: 'Hình thức', choices: [['Đến nhà bạn', fee], ['Bạn mang tới', 0]], where: pl.where };
    case 'ab': return { mode: 'ab', label: 'Lấy & giao' };
    default: return { mode: 'buyer', label: 'Địa chỉ làm', fee };
  }
}

/**
 * Ghép bài (Post) với mẫu 7 khối của loại đó. Mock có `post.template`; bài từ server chưa có thì
 * lấy mẫu theo nhóm (food/goods/service) và dùng `optionGroups`/`questions` của chính bài.
 * Nội dung riêng của bài (tên, giá, ảnh, người bán, mô tả) luôn thắng nội dung mẫu.
 */
export function viewOf(post: Post): PostView {
  const wanted = post.template as TemplateKey | undefined;
  const key: TemplateKey = wanted && POST_TEMPLATES[wanted] ? wanted : FALLBACK[post.kind] ?? 'food';
  const base = POST_TEMPLATES[key];
  const same = post.title === base.title;
  // Bài nhiều món (post.items): nhóm đầu là DANH SÁCH MÓN, giá mỗi món = giá chính (món rẻ nhất) + phụ phí
  // Dịch vụ do người bán đăng theo hợp đồng mới (có nơi làm / kiểu chọn giờ); bài mẫu cũ vẫn theo mẫu
  const svc = post.kind === 'service' && !same && !!(post.place || post.timeMode);
  const quote = post.priceType === 'quote';
  const items = post.items && post.items.length > 1 && (post.kind === 'food' || (svc && !quote)) ? post.items : null;
  const lowest = items ? Math.min(...items.map((i) => i.price)) : 0;
  const dish: OptionBlock | null = items
    ? {
        name: svc ? 'Dịch vụ' : 'Menu',
        // dịch vụ: mỗi dòng bảng giá có đơn vị riêng (kg, bộ, đôi…) nên ghi kèm tên
        choices: items.map((i) => {
          const name = svc && i.unit ? `${i.name} (${i.unit})` : i.name;
          return i.price > lowest ? name + '|+' + vnd(i.price - lowest) : name;
        }),
      }
    : null;
  // Đồ ăn thêm / tùy chọn: GOM thành các nhóm riêng bên dưới danh sách món (không bung dưới từng món).
  // Gồm tùy chọn cấp bài + tùy chọn của các món; trùng tên nhóm thì gộp lựa chọn (trùng nhãn thì giữ cái đầu).
  const toBlock = (g: OptionGroup): OptionBlock => ({
    name: g.name,
    multi: g.multi || undefined,
    req: g.required,
    choices: g.choices.map((c) => (c.price ? c.label + '|+' + vnd(c.price) : c.label)),
  });
  const groups = mergeGroups([...(post.optionGroups ?? []), ...(post.items?.flatMap((i) => i.optionGroups ?? []) ?? [])]);
  const own: OptionBlock[] | null = groups.length ? groups.map(toBlock) : null;
  // Cách nhận: bài có ghi cách nhận (giao / tự lấy) thì theo bài; không thì theo mẫu
  const modes = post.fulfillmentModes ?? [];
  const place: PlaceBlock =
    (post.kind === 'food' || post.kind === 'goods') && modes.length
      ? {
          ...base.place,
          mode: 'choice',
          choices: [...(modes.includes('delivery') ? [['Giao tận nơi', post.deliveryFee ?? 0] as [string, number]] : []), ...(modes.includes('pickup') ? [['Tự đến lấy', 0] as [string, number]] : [])],
        }
      : svc && post.place
        ? svcPlace(post, base.place)
        : base.place;
  const hours = post.handover ? ([post.handover.from, post.handover.to] as [string, string]) : base.time.win;
  const time: PostTemplate['time'] = svc
    ? post.timeMode === 'datedur'
      ? { mode: 'datedur', label: 'Ngày & giờ', win: hours, dur: post.duration ? [post.duration.min, post.duration.max] : base.time.dur ?? [2, 4], repeat: post.repeat }
      : post.timeMode === 'slot'
        ? { mode: 'slot', label: quote ? 'Hẹn kiểm tra lúc' : 'Giờ hẹn', win: hours }
        : base.time
    : post.handover
      ? { ...base.time, win: hours }
      : post.orderWindow
        ? { ...base.time, win: [post.orderWindow.from, post.orderWindow.to] }
        : base.time;
  // Bài đồ uống đăng từ form khu Bán: size, đường, đá, topping chọn cho từng dòng thay vì chung cả đơn
  const cups = post.template === 'drink' && post.noteEnabled !== undefined
    ? (post.items?.length ? post.items : [{ name: post.title, price: post.price, optionGroups: [] as OptionGroup[] }]).map((it) => ({
        name: it.name,
        price: it.price,
        left: (it as { dailyQty?: number }).dailyQty,
        groups: [...(it.optionGroups ?? []), ...(post.optionGroups ?? [])].map(toBlock),
      }))
    : undefined;
  const pays = post.payMethods?.filter((m): m is 'cash' | 'transfer' => m !== 'xu');
  const tpl: PostTemplate = {
    ...base,
    title: post.title,
    price: quote
      ? { type: 'quote', inspect: post.inspectFee ?? 0 }
      : base.price.type === 'quote'
        ? base.price
        : {
            ...base.price,
            type: post.priceType ?? base.price.type,
            amount: post.price,
            unit: displayUnit(post) || undefined,
            // giá ước tính là của người bán chọn, không lấy của mẫu (mẫu giặt sấy luôn "ước tính")
            ...(svc ? { estimate: !!post.estimate } : {}),
          },
    qty: cups ? null : svc ? (quote || (post.timeMode === 'datedur' && !items) ? null : { label: 'Số lượng', min: 1, max: 20 }) : base.qty,
    seller: {
      ...base.seller,
      name: post.sellerName,
      av: post.sellerAvatar ?? base.seller.av,
      since: same ? base.seller.since : 'Hàng xóm trong khu · ' + post.block,
    },
    desc: post.description
      ? [post.description]
      : same
        ? base.desc
        : [post.title + ', bài đăng của ' + post.sellerName + ' tại ' + post.block + '.', 'Nhắn người bán nếu cần hỏi thêm trước khi đặt.'],
    list: same ? base.list : [],
    stock: post.stock ? { mode: post.stock.mode, left: post.stock.left } : same ? base.stock : { mode: 'open', sched: base.stock.sched },
    place,
    facts: same ? base.facts : post.kind === 'food' ? foodFacts(post, place) : post.kind === 'goods' ? goodsFacts(post, place) : svc ? serviceFacts(post, place) : base.facts,
    steps: !same && post.kind !== 'job' ? placedStepNames(post.kind, quote || !!post.estimate) : base.steps,
    opts: cups ? [] : [...(dish ? [dish] : []), ...(own ?? (!dish && same ? base.opts : []))],
    dishList: cups ? false : dish ? true : same ? base.dishList : false,
    cups,
    dishPriced: !!dish,
    qs: post.questions?.length ? post.questions.map((q) => ({ type: q.type ?? ('text' as const), label: q.label, opts: q.opts, ph: q.ph, req: q.required, long: q.long, hint: q.hint, pay: q.pay })) : same ? base.qs : [],
    xuOk: post.acceptsXu ?? base.xuOk,
    pays: pays?.length ? pays : undefined,
    bank: post.bank,
    freeShipFrom: post.freeShipFrom,
    info: post.info?.length ? post.info : undefined,
    ...(dish && items?.some((i) => i.dailyQty !== undefined)
      ? { dishLeft: Object.fromEntries(items.flatMap((it, i) => (it.dailyQty !== undefined ? [[dish.choices[i], it.dailyQty]] : []))) }
      : {}),
    quick: post.quickOptions,
    noteOff: post.noteEnabled === false,
    time,
  };
  // Dòng "Nhận đặt …" chỉ lấy từ khung giờ THẬT của bài; bài không đặt khung thì không ghi giờ (câu chữ cứng của mẫu từng nói sai giờ thật)
  tpl.stock = { ...tpl.stock, sched: post.orderWindow ? windowText(post.orderWindow) : undefined };
  // Đơn vị chỉ có MỘT nguồn: đơn vị của giá (ổ, phần, ly, kg, giờ…). Nhãn số lượng lấy lại đúng đơn vị đó để giá và số lượng không lệch nhau.
  if (tpl.qty && tpl.price.unit) {
    tpl.qty = { ...tpl.qty, label: tpl.qty.label.replace(/\s*\(.*\)\s*$/, '') + ' (' + tpl.price.unit + ')' };
  }
  const mine = post.images.map((i) => unsplash(i, 800, 600));
  const images = same ? [...mine, ...base.imgs.map((i) => unsplash(i, 800, 600))] : mine;
  return { tpl, key, images: [...new Set(images)].slice(0, 5), reviews: post.reviewCount ? REVIEW_SAMPLES[key] ?? [] : [] };
}
