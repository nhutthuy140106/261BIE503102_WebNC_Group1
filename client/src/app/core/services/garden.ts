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
/** Chăm cây: mỗi ngày tưới 1 lần; 7 giai đoạn = hạt giống + 6 lần tưới, sang ngày thứ 7 thì thu hoạch */
export const WATER_PER_DAY = 1;
export const TREE_FULL = 6;
/** Xu nhận mỗi lần tưới (ngày 1–6) và khi thu hoạch (ngày 7) */
export const TREE_DAY_REWARD = 1;
export const TREE_REWARD = 5;
/** Thú cưng: nuôi 7 ngày (giai đoạn 0 = trứng … 6 = trưởng thành). Mỗi ngày làm đủ 3 việc thì lớn thêm một giai đoạn. */
export const PET_STAGES = ['Trứng', 'Nứt vỏ', 'Chui ra', 'Kiến con', 'Biết bò', 'Biết đi', 'Trưởng thành'];
export const PET_LAST = PET_STAGES.length - 1;
/**
 * Ba việc mỗi ngày, mỗi việc gắn với một hành động thật trong app (không còn bấm "Làm" suông):
 * cho ăn = đặt 1 món đồ ăn/uống, chơi cùng = chơi 1 lượt Hái xu, tắm rửa = tưới cây 1 lần.
 * Trước khi nở (giai đoạn 0–2) là chăm trứng, sau khi nở là chăm bé.
 */
export const PET_TASKS = [
  { key: 'feed', egg: 'Ủ ấm', label: 'Cho ăn', eggHint: 'Đặt 1 món để trứng được ủ ấm', hint: 'Đặt 1 món đồ ăn hoặc đồ uống', cta: 'Đặt món', link: ['/search'], params: { kind: 'food' } },
  { key: 'play', egg: 'Nói chuyện', label: 'Chơi cùng', eggHint: 'Chơi 1 lượt Hái xu cho bé nghe', hint: 'Chơi 1 lượt Hái xu', cta: 'Chơi', link: ['/vuon/hai-xu'], params: {} },
  { key: 'bath', egg: 'Lau vỏ', label: 'Tắm rửa', eggHint: 'Tưới cây 1 lần, lấy nước lau vỏ', hint: 'Tưới cây 1 lần', cta: 'Tưới cây', link: ['/vuon/tuoi-cay'], params: {} },
] as const;
/** Xu mỗi ngày làm đủ việc, và thưởng thêm một lần khi bé trưởng thành */
export const PET_REWARD = 1;
export const PET_FINAL_REWARD = 10;

/** Cấp trang phục theo độ phức tạp của bộ đồ (số món + đạo cụ + hiệu ứng) và giá Xu */
export type OutfitTier = 'common' | 'rare' | 'epic' | 'legend';
export const OUTFIT_TIERS: Record<OutfitTier, { name: string; cost: number; color: string }> = {
  common: { name: 'Thường', cost: 50, color: '#7a8696' },
  rare: { name: 'Hiếm', cost: 150, color: '#2f7fd1' },
  epic: { name: 'Sử thi', cost: 300, color: '#8a4fc7' },
  legend: { name: 'Huyền thoại', cost: 600, color: '#d98a00' },
};
/** Trang phục chỉ mặc được khi bé đã trưởng thành. Bộ đầu ('') là áo hoodie mặc định, miễn phí. */
export const OUTFITS: { key: string; name: string; tier: OutfitTier | null; img: string }[] = [
  { key: '', name: 'Áo hoodie', tier: null, img: 'assets/garden/pet-7.png' },
  { key: 'hocsinh', name: 'Học sinh', tier: 'common', img: 'assets/garden/outfits/hocsinh.png' },
  { key: 'bongro', name: 'Bóng rổ', tier: 'common', img: 'assets/garden/outfits/bongro.png' },
  { key: 'lamvuon', name: 'Làm vườn', tier: 'rare', img: 'assets/garden/outfits/lamvuon.png' },
  { key: 'daubep', name: 'Đầu bếp', tier: 'rare', img: 'assets/garden/outfits/daubep.png' },
  { key: 'thamhiem', name: 'Thám hiểm', tier: 'rare', img: 'assets/garden/outfits/thamhiem.png' },
  { key: 'truotvan', name: 'Trượt ván', tier: 'rare', img: 'assets/garden/outfits/truotvan.png' },
  { key: 'thamtu', name: 'Thám tử', tier: 'epic', img: 'assets/garden/outfits/thamtu.png' },
  { key: 'phicong', name: 'Phi công', tier: 'epic', img: 'assets/garden/outfits/phicong.png' },
  { key: 'phihanhgia', name: 'Phi hành gia', tier: 'epic', img: 'assets/garden/outfits/phihanhgia.png' },
  { key: 'phuthuy', name: 'Phù thủy', tier: 'legend', img: 'assets/garden/outfits/phuthuy.png' },
  { key: 'hoangtu', name: 'Hoàng tử', tier: 'legend', img: 'assets/garden/outfits/hoangtu.png' },
  { key: 'casi', name: 'Ca sĩ', tier: 'legend', img: 'assets/garden/outfits/casi.png' },
];

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
  /** Giai đoạn của thú cưng 0..PET_LAST, giữ qua ngày */
  pet: number;
  /** Ngày (yyyy-mm-dd) chăm bé đủ việc gần nhất; bỏ lỡ từ 1 ngày trở lên thì bé buồn (khóc) cho đến khi bạn chăm lại */
  petLast: string;
  petDone: string[];
  petClaimed: boolean;
  /** Ngày (yyyy-mm-dd) đã đặt món để cho bé ăn; sang ngày khác thì hết hiệu lực */
  fedDay: string;
  /** Số lần thu hoạch cây từ trước tới nay (khóa Xu không trùng) */
  harvests: number;
  /** Trang phục đã mua (không kể bộ mặc định) và bộ đang mặc ('' = áo hoodie mặc định) */
  outfits: string[];
  outfit: string;
}

const empty = (): GardenState => ({ day: new Date().toDateString(), plays: {}, best: 0, codes: [], tree: 0, pet: 0, petLast: '', petDone: [], petClaimed: false, fedDay: '', harvests: 0, outfits: [], outfit: '' });
/** Ngày theo giờ máy dạng yyyy-mm-dd, lệch n ngày so với hôm nay */
const isoDay = (n: number): string => new Date(Date.now() + n * 86400000).toLocaleDateString('en-CA');
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

  /** Số lần đã tưới (0..TREE_FULL); dữ liệu cũ lớn hơn thì cắt về mức tối đa */
  readonly tree = computed(() => Math.min(TREE_FULL, this.state().tree));
  readonly waterLeft = computed(() => Math.max(0, WATER_PER_DAY - (this.fresh().plays['tuoi-cay'] ?? 0)));
  /** Cây đã đủ lớn và hôm nay chưa tưới (tức đã sang ngày mới) thì mới thu hoạch được */
  readonly canHarvest = computed(() => this.tree() >= TREE_FULL && this.waterLeft() > 0);
  readonly harvests = computed(() => this.state().harvests);
  readonly pet = computed(() => Math.min(PET_LAST, Math.max(0, this.state().pet)));
  /** Bé đã nở mà bạn vắng từ 1 ngày trở lên và hôm nay chưa chăm: hiện dáng khóc (không mất tiến độ) */
  readonly petSad = computed(() => {
    const s = this.fresh();
    if (Math.min(PET_LAST, s.pet) < 3 || !s.petLast || this.doneOf(s).length > 0 || s.petClaimed) return false;
    return Math.round((Date.parse(isoDay(0) + 'T00:00') - Date.parse(s.petLast + 'T00:00')) / 86400000) >= 2;
  });
  /** Việc đã xong hôm nay, suy ra từ hành động thật (đặt món, lượt Hái xu, lượt tưới cây) */
  readonly petDone = computed(() => this.doneOf(this.fresh()));
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
    if (s.tree < TREE_FULL || (s.plays['tuoi-cay'] ?? 0) > 0) return 0;
    this.write({ ...s, tree: 0, harvests: s.harvests + 1, plays: { ...s.plays, 'tuoi-cay': 1 } });
    return s.harvests + 1;
  }

  private doneOf(s: GardenState): string[] {
    const k: string[] = [];
    if (s.fedDay === isoDay(0)) k.push('feed');
    if ((s.plays['hai-xu'] ?? 0) > 0) k.push('play');
    if ((s.plays['tuoi-cay'] ?? 0) > 0) k.push('bath');
    return k;
  }

  /** Hôm nay đã đặt 1 món: bé được cho ăn. */
  markFed(): void {
    const s = this.fresh();
    if (s.fedDay !== isoDay(0)) this.write({ ...s, fedDay: isoDay(0) });
  }

  /** Nhận thưởng trong ngày: lớn thêm một giai đoạn (nếu chưa trưởng thành). Trả về giai đoạn mới, hoặc -1 nếu chưa đủ việc / đã nhận. */
  petClaim(): number {
    const s = this.fresh();
    if (s.petClaimed || this.doneOf(s).length < PET_TASKS.length) return -1;
    const pet = Math.min(PET_LAST, s.pet + 1);
    this.write({ ...s, petClaimed: true, pet, petLast: isoDay(0) });
    return pet;
  }

  readonly ownedOutfits = computed(() => this.state().outfits ?? []);
  /** Bộ đang mặc; nếu bộ đó không còn trong tủ thì về áo mặc định */
  readonly outfit = computed(() => {
    const s = this.state();
    return s.outfit && (s.outfits ?? []).includes(s.outfit) ? s.outfit : '';
  });

  ownsOutfit(key: string): boolean {
    return key === '' || this.ownedOutfits().includes(key);
  }

  /** Thêm trang phục vào tủ (đã trừ Xu ở nơi gọi). */
  addOutfit(key: string): void {
    const s = this.state();
    if (this.ownsOutfit(key)) return;
    this.write({ ...s, outfits: [...(s.outfits ?? []), key] });
  }

  wearOutfit(key: string): void {
    if (this.ownsOutfit(key)) this.write({ ...this.state(), outfit: key });
  }

  /** Chỉ để thử nghiệm: nhảy thẳng tới một giai đoạn của bé (0 = trứng … 6 = trưởng thành), đặt lại việc hôm nay. */
  simulateStage(n: number): void {
    const pet = Math.min(PET_LAST, Math.max(0, n));
    this.write({ ...this.state(), day: '__mo-phong__', pet, petDone: [], petClaimed: false, fedDay: '', petLast: pet >= 3 ? isoDay(-1) : '' });
  }

  /** Chỉ để thử nghiệm: coi như đã làm xong một việc (đặt món / chơi Hái xu / tưới cây) mà không phải làm thật. */
  simulateTask(key: string): void {
    if (key === 'feed') return this.markFed();
    const s = this.fresh();
    const game = key === 'play' ? 'hai-xu' : 'tuoi-cay';
    if ((s.plays[game] ?? 0) === 0) this.write({ ...s, plays: { ...s.plays, [game]: 1 } });
  }

  /** Chỉ để thử nghiệm: bé vắng bạn 3 ngày (hiện dáng khóc); chưa nở thì cho nở trước. */
  simulateSad(): void {
    const s = this.state();
    this.write({ ...s, day: '__mo-phong__', pet: Math.max(3, s.pet), petDone: [], petClaimed: false, fedDay: '', petLast: isoDay(-3) });
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

  /** Chỉ để thử nghiệm: giả lập đã sang ngày mới (đặt lại lượt tưới, lượt chơi, việc thú cưng của hôm nay). */
  simulateNextDay(): void {
    const s = this.state();
    // lùi ngày chăm gần nhất đi một ngày, để thử được cả trường hợp bỏ lỡ ngày (bé khóc)
    const back = s.petLast ? new Date(Date.parse(s.petLast + 'T00:00') - 86400000).toLocaleDateString('en-CA') : '';
    this.write({ ...s, day: '__mo-phong__', petLast: back, fedDay: '' });
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
