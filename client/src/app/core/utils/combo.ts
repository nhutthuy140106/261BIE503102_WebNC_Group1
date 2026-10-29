import type { ComboDetail, Post } from '../models/post';
import { dealAt } from './promo';

/** Tiết kiệm của combo theo giá đang trả (có Giờ vàng thì tính theo giá đã giảm); 0 khi không phải combo. */
export function comboSaving(post: Pick<Post, 'price' | 'promo' | 'combo'>, ms: number): number {
  if (!post.combo) return 0;
  return Math.max(0, post.combo.listPrice - (dealAt(post, ms)?.price ?? post.price));
}

/** Mock: ghép chi tiết combo từ các bài thành phần trong kho (server thật trả sẵn `comboDetail`). */
export function buildComboDetail(post: Post, all: Post[], ms: number): ComboDetail | undefined {
  if (!post.combo) return undefined;
  const items = post.combo.items.map((i) => {
    const p = all.find((x) => x._id === i.postId);
    return { postId: i.postId, qty: i.qty, title: p?.title ?? 'Món đã ngừng bán', unitPrice: p?.price ?? 0, unit: p?.priceUnit, image: p?.images[0], available: !!p && !p.closed };
  });
  return { items, listPrice: post.combo.listPrice, saving: comboSaving(post, ms) };
}
