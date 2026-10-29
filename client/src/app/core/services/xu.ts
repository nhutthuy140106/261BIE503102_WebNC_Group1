import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { ApiService } from './api';
import { AuthService } from './auth';
import { ToastService } from './toast';

/*
 * AntXu (người dùng duyệt 19/10) — bê từ design/mockups/shared/common.js.
 * - Nhận: +30 tạo tài khoản (1 lần) · +10 hoàn thành đơn đã đặt (đơn từ 30.000đ, tối đa 3 đơn/ngày)
 *   · +5 đánh giá có nhận xét · +15 hoàn thành việc đã nhận.
 * - Đơn hủy / hoàn tiền → thu lại Xu đã cộng; đơn dùng voucher bị hủy → trả lại voucher.
 * - Xu hết hạn sau 6 tháng kể từ ngày nhận (dùng Xu cũ trước). Không mua bằng tiền, không đổi ra tiền.
 * - Voucher có hạn 30 ngày; người bán tự chọn nhận voucher Xu (bài có nhãn "Dùng được Xu") và tự chịu phần giảm.
 * Server chưa có sổ Xu: dữ liệu lưu ở localStorage "antgo_xu" (cùng khóa với bản mẫu). Có API thì đổi phần đọc/ghi.
 */
const KEY = 'antgo_xu';
const DAY = 864e5;
const HALF_YEAR = 182 * DAY;
/** Trần Xu nhận từ mini game mỗi ngày (chống cày Xu lấy voucher). */
export const GAME_DAILY_CAP = 30;

export interface XuEntry {
  /** Số Xu: + nhận, − tiêu / hết hạn */
  d: number;
  t: string;
  key: string;
  at: number;
  exp: number | null;
  /** Có dòng này thì hiện ở Thông báo "Bạn nhận +n Xu" */
  note?: boolean;
  expired?: boolean;
}

export interface VoucherDef {
  cid: string;
  title: string;
  cond: string;
  amount?: number;
  ship?: boolean;
  min: number;
  cost: number;
}

export interface VoucherRow {
  id: string;
  cid: string;
  at: number;
  exp: number;
  used: string | null;
}

export type Voucher = VoucherDef & VoucherRow;

interface RemoteXu {
  ledger: { id: string; delta: number; title: string; kind: string; at: string }[];
  vouchers: { id?: string; cid: string; code: string; status: string; expiresAt: string }[];
}

interface XuState {
  v: 2;
  ledger: XuEntry[];
  vch: VoucherRow[];
}

export const XU_CATALOG: VoucherDef[] = [
  { cid: 'v10', title: 'Giảm 10.000đ', cond: 'Đơn từ 50.000đ', amount: 10000, min: 50000, cost: 20 },
  { cid: 'v20', title: 'Giảm 20.000đ', cond: 'Đơn từ 150.000đ', amount: 20000, min: 150000, cost: 50 },
  { cid: 'ship', title: 'Miễn phí giao trong khu', cond: 'Đơn đồ ăn có giao tận cửa', ship: true, min: 0, cost: 30 },
];

export const XU_EARN: { key: string; t: string; d: number; once?: boolean; note?: string }[] = [
  { key: 'welcome', t: 'Tạo tài khoản', d: 30, once: true },
  { key: 'order', t: 'Hoàn thành một đơn đã đặt', d: 10, note: 'đơn từ 30.000đ, tối đa 3 đơn/ngày' },
  { key: 'review', t: 'Đánh giá đơn có viết nhận xét', d: 5, note: 'mỗi đơn 1 lần' },
  { key: 'job', t: 'Hoàn thành một việc đã nhận', d: 15, note: 'khi người đăng xác nhận xong' },
];

@Injectable({ providedIn: 'root' })
export class XuService {
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly state = signal<XuState>(this.read());

  constructor() {
    // Có server thật (?mock=0): sổ Xu và voucher lấy từ GET /me/xu mỗi khi đăng nhập
    effect(() => {
      if (!useMock('xu') && this.auth.currentUser()) this.sync();
    });
  }

  /** Kéo sổ Xu từ server thay cho bản local (chỉ khi dùng API thật). */
  sync(): void {
    if (useMock('xu')) return;
    this.api.get<RemoteXu>('/me/xu').pipe(catchError(() => of(null))).subscribe((r) => {
      if (!r) return;
      this.state.set({
        v: 2,
        ledger: r.ledger.map((x) => ({ d: x.delta, t: x.title, key: (x.delta > 0 && x.kind === 'game' ? 'game:' : 'srv:') + x.id, at: Date.parse(x.at), exp: null, note: x.delta > 0 })),
        vch: r.vouchers.map((v) => ({ id: v.id ?? v.code, cid: v.cid, at: Date.parse(v.expiresAt) - 30 * DAY, exp: Date.parse(v.expiresAt), used: v.status === 'active' || v.status === 'unused' ? null : 'srv' })),
      });
    });
  }

  /**
   * Kết thúc một lượt Hái xu. Mock: cộng ở local. Server thật: POST /me/xu/game (server tự tính 8 điểm = 1 Xu,
   * tối đa 3 lượt/ngày và 30 Xu/ngày; hết lượt/trần → 429 GAME_LIMIT). Trả về số Xu được cộng.
   */
  playCoin(score: number, key: string): Observable<number> {
    if (useMock('xu')) return of(this.earnGame(score, 'Hái xu', key));
    return this.api.post<{ granted: number }>('/me/xu/game', { game: 'hai-xu', score: Math.min(80, Math.max(0, score)) }).pipe(
      tap(() => this.sync()),
      map((r) => r.granted),
      catchError((e: unknown) => {
        this.toast.show(e instanceof AppError && e.code === 'GAME_LIMIT' ? 'Hôm nay bạn đã hết lượt hoặc đủ Xu từ game rồi' : 'Chưa ghi nhận được Xu, bạn thử lại sau nhé');
        return of(0);
      }),
    );
  }

  readonly catalog = XU_CATALOG;
  readonly earnRules = XU_EARN;

  /** Các "lô" Xu còn lại sau khi trừ phần đã tiêu (Xu nhận trước bị trừ trước). */
  private readonly lots = computed(() => {
    const s = this.state();
    let spent = s.ledger.filter((x) => x.d < 0).reduce((a, x) => a - x.d, 0);
    return s.ledger
      .filter((x) => x.d > 0)
      .sort((a, b) => a.at - b.at)
      .map((x) => {
        const used = Math.min(spent, x.d);
        spent -= used;
        return { ...x, left: x.d - used };
      });
  });

  readonly balance = computed(() => this.lots().filter((l) => (l.exp ?? 0) > Date.now()).reduce((a, l) => a + l.left, 0));

  /** Xu sắp hết hạn trong 45 ngày tới. */
  readonly expiring = computed(() => {
    const now = Date.now();
    const soon = this.lots().filter((l) => l.left > 0 && (l.exp ?? 0) > now && (l.exp ?? 0) - now < 45 * DAY);
    return soon.length ? { amount: soon.reduce((a, l) => a + l.left, 0), date: new Date(Math.min(...soon.map((l) => l.exp ?? 0))) } : null;
  });

  /** Lịch sử mới nhất trước, kèm dòng "Hết hạn" cho lô Xu đã quá 6 tháng mà chưa dùng. */
  readonly ledger = computed<XuEntry[]>(() => {
    const now = Date.now();
    const expired: XuEntry[] = this.lots()
      .filter((l) => l.left > 0 && (l.exp ?? 0) <= now)
      .map((l) => ({ d: -l.left, t: 'Hết hạn · Xu nhận ' + new Date(l.at).toLocaleDateString('vi-VN'), key: 'expired:' + l.key, at: l.exp ?? now, exp: null, expired: true }));
    return [...this.state().ledger, ...expired].sort((a, b) => b.at - a.at);
  });

  /** Voucher chưa dùng, còn hạn, hạn gần nhất trước. */
  readonly vouchers = computed<Voucher[]>(() => {
    const now = Date.now();
    return this.state()
      .vch.map((v) => ({ ...(XU_CATALOG.find((c) => c.cid === v.cid) as VoucherDef), ...v }))
      .filter((v) => !v.used && v.exp > now)
      .sort((a, b) => a.exp - b.exp);
  });

  /** Số lần đã nhận theo loại (key bắt đầu bằng prefix). */
  count(prefix: string): number {
    return this.state().ledger.filter((x) => x.d > 0 && String(x.key).startsWith(prefix)).length;
  }

  has(key: string): boolean {
    const l = this.state().ledger;
    return l.some((x) => x.key === key && x.d > 0) && !l.some((x) => x.key === 'revoke:' + key);
  }

  /** Cộng Xu (chống trùng theo key; đơn: tối đa 3 lần/ngày). Trả về số Xu vừa cộng. */
  earn(d: number, t: string, key: string): number {
    if (!useMock('xu')) return 0; // server tự cộng khi đơn/đánh giá/việc hoàn thành
    const s = this.state();
    const now = Date.now();
    if (s.ledger.some((x) => x.key === key)) return 0;
    if (key.startsWith('order:')) {
      const today = new Date().toDateString();
      const doneToday = s.ledger.filter((x) => x.key.startsWith('order:') && new Date(x.at).toDateString() === today).length;
      if (doneToday >= 3) {
        this.toast.show('Hôm nay bạn đã nhận đủ Xu cho 3 đơn');
        return 0;
      }
    }
    this.write({ ...s, ledger: [...s.ledger, { d, t, key, at: now, exp: now + HALF_YEAR, note: true }] });
    this.toast.show(`+${d} Xu · ${t}`);
    return d;
  }

  /** Xu nhận từ game hôm nay (khóa bắt đầu bằng "game:"). Xu là tiền giảm giá thật nên có trần mỗi ngày. */
  readonly gameToday = computed(() => {
    const today = new Date().toDateString();
    return this.state().ledger.filter((x) => x.d > 0 && x.key.startsWith('game:') && new Date(x.at).toDateString() === today).reduce((a, x) => a + x.d, 0);
  });

  /** Cộng Xu từ game, cắt theo trần ngày. Trả về số Xu thật sự được cộng (0 nếu đã đủ trần). */
  earnGame(d: number, t: string, key: string): number {
    if (d <= 0) return 0;
    if (!useMock('xu')) {
      this.toast.show('Game này chưa tính Xu thật khi dùng máy chủ');
      return 0;
    }
    const give = Math.min(d, GAME_DAILY_CAP - this.gameToday());
    if (give <= 0) {
      this.toast.show(`Hôm nay bạn đã nhận đủ ${GAME_DAILY_CAP} Xu từ game`);
      return 0;
    }
    const s = this.state();
    const now = Date.now();
    this.write({ ...s, ledger: [...s.ledger, { d: give, t, key: 'game:' + key, at: now, exp: now + HALF_YEAR, note: true }] });
    return give;
  }

  /** Thu lại Xu đã cộng (đơn hủy / hoàn tiền). */
  revoke(key: string, t: string): number {
    const s = this.state();
    const e = s.ledger.find((x) => x.key === key && x.d > 0);
    if (!e || s.ledger.some((x) => x.key === 'revoke:' + key)) return 0;
    this.write({ ...s, ledger: [...s.ledger, { d: -e.d, t, key: 'revoke:' + key, at: Date.now(), exp: null }] });
    return e.d;
  }

  /** Đổi Xu lấy voucher (hạn 30 ngày). */
  redeem(cid: string): boolean {
    const c = XU_CATALOG.find((x) => x.cid === cid);
    const s = this.state();
    if (!c || this.balance() < c.cost) return false;
    if (!useMock('xu')) {
      this.api.post<unknown>('/me/xu/redeem', { cid }).subscribe({ next: () => this.sync(), error: () => this.toast.show('Chưa đổi được voucher, bạn thử lại sau nhé') });
      return true;
    }
    const id = 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = Date.now();
    this.write({
      ...s,
      ledger: [...s.ledger, { d: -c.cost, t: 'Đổi voucher ' + c.title, key: 'redeem:' + id, at: now, exp: null }],
      vch: [...s.vch, { id, cid, at: now, exp: now + 30 * DAY, used: null }],
    });
    return true;
  }

  /** Tiêu Xu (quảng bá bài ở không gian Bán); không đủ thì trả false. */
  spend(cost: number, t: string, key: string): boolean {
    if (this.balance() < cost) return false;
    const s = this.state();
    this.write({ ...s, ledger: [...s.ledger, { d: -cost, t, key: 'spend:' + key, at: Date.now(), exp: null }] });
    return true;
  }

  useVoucher(id: string, ref: string): void {
    const s = this.state();
    if (!s.vch.some((v) => v.id === id && !v.used)) return;
    this.write({ ...s, vch: s.vch.map((v) => (v.id === id ? { ...v, used: ref } : v)) });
  }

  /** Đơn dùng voucher bị hủy → trả voucher về ví. */
  returnVoucher(ref: string): void {
    const s = this.state();
    if (!s.vch.some((v) => v.used === ref)) return;
    this.write({ ...s, vch: s.vch.map((v) => (v.used === ref ? { ...v, used: null } : v)) });
    this.toast.show('Đã trả lại voucher vào ví Xu của bạn');
  }

  /** Tài khoản mới: chỉ có 30 Xu chào mừng. */
  resetNew(): void {
    const n = Date.now();
    this.write({ v: 2, ledger: [{ d: 30, t: 'Chào hàng xóm mới', key: 'welcome', at: n, exp: n + HALF_YEAR, note: true }], vch: [] });
  }

  private write(s: XuState): void {
    this.state.set(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* trình duyệt chặn lưu trữ: sổ vẫn đúng trong phiên */
    }
  }

  private read(): XuState {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as XuState | null;
      if (raw && raw.v === 2) return raw;
    } catch {
      /* dùng dữ liệu mặc định */
    }
    const seed = useMock('xu') ? seedDemo() : emptyLedger();
    try {
      localStorage.setItem(KEY, JSON.stringify(seed));
    } catch {
      /* bỏ qua */
    }
    return seed;
  }
}

function emptyLedger(): XuState {
  return { v: 2, ledger: [], vch: [] };
}

/** Sổ Xu mẫu của tài khoản demo (Ngọc Thủy): 90 Xu, trong đó 10 Xu sắp hết hạn. */
function seedDemo(): XuState {
  const n = Date.now();
  const e = (daysAgo: number, d: number, t: string, key: string): XuEntry => ({ d, t, key, at: n - daysAgo * DAY, exp: d > 0 ? n - daysAgo * DAY + HALF_YEAR : null });
  return {
    v: 2,
    ledger: [
      e(170, 30, 'Chào hàng xóm mới', 'welcome'),
      e(120, 10, 'Hoàn thành đơn AG-O2861', 'order:o-2861'),
      e(120, 5, 'Đánh giá đơn AG-O2861', 'review:o-2861'),
      e(100, -20, 'Đổi voucher Giảm 10.000đ', 'redeem:x1'),
      e(95, 10, 'Hoàn thành đơn AG-O2903', 'order:o-2903'),
      e(60, 15, 'Hoàn thành việc AG-J1952', 'job:j-1952'),
      e(30, 10, 'Hoàn thành đơn AG-O2950', 'order:o-2950'),
      e(30, 5, 'Đánh giá đơn AG-O2950', 'review:o-2950'),
      e(9, 10, 'Hoàn thành đơn AG-O2987', 'order:o3'),
      e(2, 15, 'Hoàn thành việc AG-J1975', 'job:j5'),
    ],
    vch: [{ id: 'x1', cid: 'v10', at: n - 100 * DAY, exp: n - 70 * DAY, used: 'AG-O2903' }],
  };
}
