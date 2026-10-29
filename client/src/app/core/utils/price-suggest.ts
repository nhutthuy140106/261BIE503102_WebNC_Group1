import { Post, PostKind } from '../models/post';
import { cosine, tfidf, tokenize } from './recommend';

/**
 * Gợi ý giá khi đăng bài/việc (bản FE cho chế độ dữ liệu mẫu; bản thật ở BE: GET /pricing/suggest).
 * k láng giềng gần nhất theo cosine TF-IDF của tên + danh mục, rồi trung vị có trọng số và phân vị 25–75%.
 */
export interface PriceSuggestion {
  low: number;
  suggested: number;
  high: number;
  samples: number;
  confidence: 'high' | 'medium' | 'low';
  basis: { title: string; price: number }[];
}

const K = 7;
const MIN_SIM = 0.12;

function quantile(items: { price: number; w: number }[], q: number): number {
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const total = sorted.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (const x of sorted) {
    acc += x.w;
    if (acc >= total * q) return x.price;
  }
  return sorted[sorted.length - 1].price;
}

/** Làm tròn theo thang giá VN: dưới 100k → nghìn; còn lại → 5 nghìn. */
export const roundPrice = (n: number): number => (n < 100000 ? Math.round(n / 1000) * 1000 : Math.round(n / 5000) * 5000);

export function suggestPrice(kind: PostKind, title: string, corpus: Post[]): PriceSuggestion | null {
  const docs = corpus.filter((p) => p.kind === kind && p.price > 0);
  if (!docs.length || title.trim().length < 2) return null;
  const vecs = tfidf([tokenize(title), ...docs.map((p) => tokenize(`${p.title} ${p.description}`))]);
  const scored = docs.map((p, i) => ({ p, sim: cosine(vecs[0], vecs[i + 1]) })).sort((a, b) => b.sim - a.sim);
  let near = scored.filter((x) => x.sim >= MIN_SIM).slice(0, K);
  let confidence: PriceSuggestion['confidence'] = near.length >= 5 ? 'high' : near.length >= 3 ? 'medium' : 'low';
  if (near.length < 3) {
    near = scored.slice(0, Math.max(near.length, 5));
    confidence = 'low';
  }
  const w = near.map((x) => ({ price: x.p.price, w: Math.max(x.sim, 0.05) }));
  return {
    low: roundPrice(quantile(w, 0.25)),
    suggested: roundPrice(quantile(w, 0.5)),
    high: roundPrice(quantile(w, 0.75)),
    samples: near.length,
    confidence,
    basis: near.slice(0, 3).map((x) => ({ title: x.p.title, price: x.p.price })),
  };
}
