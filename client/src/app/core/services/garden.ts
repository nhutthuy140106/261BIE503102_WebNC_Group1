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

interface GardenState {
  /** Ngày của bộ đếm lượt (toDateString) — sang ngày mới thì đặt lại */
  day: string;
  plays: Partial<Record<GardenGame, number>>;
  best: number;
  /** Mã giảm giá MÔ PHỎNG đã mở khóa theo mốc */
  codes: { at: number; code: string }[];
}

const empty = (): GardenState => ({ day: new Date().toDateString(), plays: {}, best: 0, codes: [] });
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
    return s.day === new Date().toDateString() ? s : { ...s, day: new Date().toDateString(), plays: {} };
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
