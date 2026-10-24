import { POST_TEMPLATES, unsplash } from '../config/post-templates';
import { REVIEW_SAMPLES } from '../config/review-samples';
import { Post } from '../models/post';
import { displayUnit } from './unit';
import { PostTemplate, SampleReview, TemplateKey } from '../models/post-template';

const FALLBACK: Record<string, TemplateKey> = { food: 'food', goods: 'goods', service: 'svc', job: 'svc' };

export interface PostView {
  tpl: PostTemplate;
  key: TemplateKey;
  images: string[];
  reviews: SampleReview[];
}

function vnd(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
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
  const own = post.optionGroups?.length
    ? post.optionGroups.map((g) => ({ name: g.name, choices: g.choices.map((c) => (c.price ? c.label + '|+' + vnd(c.price) : c.label)) }))
    : null;
  const tpl: PostTemplate = {
    ...base,
    title: post.title,
    price: base.price.type === 'quote' ? base.price : { ...base.price, amount: post.price, unit: displayUnit(post) || undefined },
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
    stock: same ? base.stock : { mode: 'open', sched: base.stock.sched },
    opts: own ?? (same ? base.opts : []),
    qs: post.questions?.length ? post.questions.map((q) => ({ type: q.type ?? ('text' as const), label: q.label, opts: q.opts, ph: q.ph, req: q.required, long: q.long, hint: q.hint, pay: q.pay })) : same ? base.qs : [],
    xuOk: post.acceptsXu ?? base.xuOk,
  };
  // Đơn vị chỉ có MỘT nguồn: đơn vị của giá (ổ, phần, ly, kg, giờ…). Nhãn số lượng lấy lại đúng đơn vị đó để giá và số lượng không lệch nhau.
  if (tpl.qty && tpl.price.unit) {
    tpl.qty = { ...tpl.qty, label: tpl.qty.label.replace(/\s*\(.*\)\s*$/, '') + ' (' + tpl.price.unit + ')' };
  }
  const mine = post.images.map((i) => unsplash(i, 800, 600));
  const images = same ? [...mine, ...base.imgs.map((i) => unsplash(i, 800, 600))] : mine;
  return { tpl, key, images: [...new Set(images)].slice(0, 5), reviews: post.reviewCount ? REVIEW_SAMPLES[key] ?? [] : [] };
}
