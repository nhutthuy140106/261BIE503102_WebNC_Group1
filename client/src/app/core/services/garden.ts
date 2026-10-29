import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth';

export type GardenGame = 'hai-xu' | 'tuoi-cay' | 'thu-cung';

/** Mốc thưởng của game Hái xu (điểm một lượt) và tên huy hiệu. */
export const COIN_MILESTONES = [
  { at: 10, badge: 'Tay hái tập sự' },
  { at: 25, badge: 'Thợ hái chăm chỉ' },
  { at: 50, badge: 'Vua hái xu' },
] as const;

export const COIN_MAX_PLAYS = 3;
/** Tưới cây: tối đa 3 lần/ngày, đủ 9 lần là thu hoạch (+5 Xu) */
export const WATER_PER_DAY = 3;
export const TREE_FULL = 9;
export const TREE_REWARD = 5;
/** Thú cưng: làm đủ 3 việc trong ngày để nhận thưởng (+4 Xu) */
export const PET_TASKS = [
  { key: 'feed', label: 'Cho ăn', hint: 'Bé đang đói bụng' },
  { key: 'play', label: 'Chơi cùng', hint: 'Ném bóng cho bé đuổi' },
  { key: 'bath', label: 'Tắm rửa', hint: 'Thơm tho sạch sẽ' },
] as const;
export const PET_REWARD = 4;

interface GardenState {
  /** Ngày của bộ đếm lượt (toDateString) — sang ngày mới thì đặt lại */
  day: string;
  plays: Partial<Record<GardenGame, number>>;
  best: number;
  /** Mã giảm giá MÔ PHỎNG đã mở khóa theo mốc */
  codes: { at: number; code: string }[];
  /** Độ lớn của cây xoài (0..TREE_FULL), giữ qua ngày */
  tree: number;
  /** Việc thú cưng đã làm hôm nay + đã nhận thưởng chưa (đặt lại mỗi ngày) */
  petDone: string[];
  petClaimed: boolean;
  /** Số lần thu hoạch cây từ trước tới nay (khóa Xu không trùng) */
  harvests: number;
}

const empty = (): GardenState => ({ day: new Date().toDateString(), plays: {}, best: 0, codes: [], tree: 0, petDone: [], petClaimed: false, harvests: 0 });
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Tiến trình các mini game của Vườn AntGo, lưu theo từng tài khoản trong localStorage (không có máy chủ). */
@Injectable({ providedIn: 'root' })
export class GardenService {
  private readonly auth = inject(AuthService);
  private readonly state = signal<GardenState>(empty());

  readonly best = computed(() => this.state().best);
  readonly codes = computed(() => this.state().codes);

  constructor() {
    effect(() => {
      const u = this.auth.currentUser();
      this.state.set(u ? this.read(u._id) : empty());
    });
  }

  readonly tree = computed(() => this.state().tree);
  readonly waterLeft = computed(() => Math.max(0, WATER_PER_DAY - (this.fresh().plays['tuoi-cay'] ?? 0)));
  readonly petDone = computed(() => this.fresh().petDone);
  readonly petClaimed = computed(() => this.fresh().petClaimed);

  /** Tưới cây một lần; false nếu hết lượt hôm nay hoặc cây đã đủ lớn (chờ thu hoạch). */
  water(): boolean {
    const s = this.fresh();
    if (this.waterLeft() <= 0 || s.tree >= TREE_FULL) return false;
    this.write({ ...s, tree: s.tree + 1, plays: { ...s.plays, 'tuoi-cay': (s.plays['tuoi-cay'] ?? 0) + 1 } });
    return true;
  }

  /** Thu hoạch khi cây đủ lớn: cây về hạt giống; trả về số thứ tự lần thu hoạch (khóa Xu) hoặc 0. */
  harvest(): number {
    const s = this.fresh();
    if (s.tree < TREE_FULL) return 0;
    this.write({ ...s, tree: 0, harvests: s.harvests + 1 });
    return s.harvests + 1;
  }

  /** Làm một việc với thú cưng (mỗi việc một lần/ngày). */
  petDo(key: string): boolean {
    const s = this.fresh();
    if (s.petDone.includes(key)) return false;
    this.write({ ...s, petDone: [...s.petDone, key] });
    return true;
  }

  /** Đánh dấu đã nhận thưởng thú cưng hôm nay; false nếu chưa đủ việc hoặc đã nhận. */
  petClaim(): boolean {
    const s = this.fresh();
    if (s.petClaimed || s.petDone.length < PET_TASKS.length) return false;
    this.write({ ...s, petClaimed: true });
    return true;
  }

  /** Số lượt Hái xu còn lại hôm nay. */
  coinPlaysLeft = computed(() => Math.max(0, COIN_MAX_PLAYS - (this.fresh().plays['hai-xu'] ?? 0)));

  /** Ghi nhận một lượt chơi; trả về mã giảm giá mới nếu lượt này mở khóa mốc chưa từng đạt. */
  finishCoinRound(score: number): { badge: string; at: number; code: string | null }[] {
    const s = this.fresh();
    const unlocked: { badge: string; at: number; code: string | null }[] = [];
    const codes = [...s.codes];
    for (const m of COIN_MILESTONES) {
      if (score < m.at) continue;
      const had = codes.some((c) => c.at === m.at);
      const code = had ? null : 'AG5-' + Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
      if (code) codes.push({ at: m.at, code });
      unlocked.push({ badge: m.badge, at: m.at, code });
    }
    this.write({ ...s, plays: { ...s.plays, 'hai-xu': (s.plays['hai-xu'] ?? 0) + 1 }, best: Math.max(s.best, score), codes });
    return unlocked;
  }

  /** Trạng thái hiện tại, đã đặt lại bộ đếm nếu qua ngày mới. */
  private fresh(): GardenState {
    const s = this.state();
    return s.day === new Date().toDateString() ? s : { ...s, day: new Date().toDateString(), plays: {}, petDone: [], petClaimed: false };
  }

  private key(): string {
    return 'antgo_garden_' + (this.auth.currentUser()?._id ?? 'guest');
  }

  private read(uid: string): GardenState {
    try {
      const raw = JSON.parse(localStorage.getItem('antgo_garden_' + uid) ?? 'null') as GardenState | null;
      if (raw && typeof raw.day === 'string') return { ...empty(), ...raw };
    } catch {
      /* dữ liệu hỏng: bắt đầu lại */
    }
    return empty();
  }

  private write(s: GardenState): void {
    this.state.set(s);
    try {
      localStorage.setItem(this.key(), JSON.stringify(s));
    } catch {
      /* trình duyệt chặn lưu: giữ trong phiên */
    }
  }
}
