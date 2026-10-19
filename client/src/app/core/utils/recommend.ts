import { Post } from '../models/post';
import { stripAccents } from './slug-helper';

/**
 * Gợi ý dựa trên nội dung (content-based) cho mục tiêu CO3 — bản nhỏ, chạy ở FE khi mock:
 *   điểm = cosine TF-IDF(tên + mô tả) + cộng nhẹ nếu cùng loại / cùng block / giá gần nhau.
 * Khi BE làm xong 2.14 (D3) thì dùng GET /posts/:id/similar và /me/recommendations.
 */
const STOP = new Set(['va', 'cua', 'cho', 'voi', 'mot', 'cac', 'nhung', 'trong', 'duoc', 'nay', 'the', 'la', 'co', 'khong']);

export function tokenize(text: string): string[] {
  return stripAccents(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

type Vec = Map<string, number>;

function tfidf(docs: string[][]): Vec[] {
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  return docs.map((d) => {
    const v: Vec = new Map();
    for (const t of d) v.set(t, (v.get(t) ?? 0) + 1);
    for (const [t, tf] of v) v.set(t, tf * (Math.log((1 + docs.length) / (1 + (df.get(t) ?? 0))) + 1));
    return v;
  });
}

function cosine(a: Vec, b: Vec): number {
  let dot = 0;
  for (const [t, w] of a) dot += w * (b.get(t) ?? 0);
  const norm = (v: Vec) => Math.sqrt([...v.values()].reduce((s, w) => s + w * w, 0));
  const n = norm(a) * norm(b);
  return n === 0 ? 0 : dot / n;
}

function bonus(a: Post, b: Post): number {
  let s = 0;
  if (a.kind === b.kind) s += 0.3;
  if (a.block === b.block) s += 0.1;
  const hi = Math.max(a.price, b.price);
  if (hi > 0 && Math.min(a.price, b.price) / hi >= 0.5) s += 0.1;
  return s;
}

export interface Scored {
  post: Post;
  score: number;
}

/** Xếp hạng bài trong `corpus` theo độ giống `seeds` (điểm lớn nhất trong các seed); bỏ chính seed. */
export function rankSimilar(seeds: Post[], corpus: Post[], limit = 4, minScore = 0.2): Post[] {
  if (seeds.length === 0) return [];
  const all = [...seeds, ...corpus.filter((p) => !seeds.some((s) => s._id === p._id))];
  const vecs = tfidf(all.map((p) => tokenize(`${p.title} ${p.description}`)));
  const seedVecs = vecs.slice(0, seeds.length);
  const scored: Scored[] = all.slice(seeds.length).map((post, i) => {
    const v = vecs[seeds.length + i];
    const score = Math.max(...seeds.map((s, k) => cosine(seedVecs[k], v) + bonus(s, post)));
    return { post, score };
  });
  return scored
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.post);
}
