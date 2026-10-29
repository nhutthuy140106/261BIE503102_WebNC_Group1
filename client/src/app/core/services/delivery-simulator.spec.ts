import { DeliverySimulator } from './delivery-simulator';
import { blockFromSeed, blockOf, distanceKm, interpolate, pointIn } from '../utils/tracking-route';

describe('tuyến giao hàng giả lập', () => {
  it('nội suy: đủ n điểm, hai đầu khớp đúng cửa hàng và nhà', () => {
    const a: [number, number] = [10.78, 106.7];
    const b: [number, number] = [10.8, 106.72];
    const r = interpolate(a, b, 25, 7);
    expect(r.length).toBe(25);
    expect(r[0]).toEqual(a);
    expect(r[24][0]).toBeCloseTo(b[0], 9);
    expect(r[24][1]).toBeCloseTo(b[1], 9);
  });

  it('cửa hàng và nhà cách nhau khoảng 2–3 km', () => {
    const sim = new DeliverySimulator();
    const km = distanceKm(sim.path[sim.shopIndex], sim.path[sim.lastIndex]);
    expect(km).toBeGreaterThan(2);
    expect(km).toBeLessThan(3.5);
  });
});

describe('tuyến theo Block', () => {
  it('đọc Block trong địa chỉ, không có thì dùng mặc định', () => {
    expect(blockOf('Căn C-0912, Block D')).toBe('D');
    expect(blockOf('Số 5 đường X', 'A')).toBe('A');
    expect(['A', 'B', 'C', 'D']).toContain(blockFromSeed('Bếp Cô Lan'));
  });

  it('mỗi đơn một tuyến khác nhau và có "Cách bạn X km"', () => {
    const a = new DeliverySimulator();
    const b = new DeliverySimulator();
    a.start('o1', pointIn('A', 'o1s'), pointIn('C', 'o1h'));
    b.start('o2', pointIn('D', 'o2s'), pointIn('B', 'o2h'));
    expect(a.path[a.lastIndex]).not.toEqual(b.path[b.lastIndex]);
    expect(a.remainingKm()).toBeGreaterThan(0);
    a.stop();
    b.stop();
  });
});

describe('DeliverySimulator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('chạy đủ 4 giai đoạn rồi dừng ở Hoàn tất; ETA giảm về 0', () => {
    const sim = new DeliverySimulator();
    sim.start('t1');
    expect(sim.phase()).toBe('toShop');
    const seen = new Set([sim.phase()]);
    const eta0 = sim.etaMinutes();
    for (let i = 0; i < 80 && sim.phase() !== 'done'; i++) {
      vi.advanceTimersByTime(1200);
      seen.add(sim.phase());
    }
    expect([...seen]).toEqual(['toShop', 'pickedUp', 'delivering', 'done']);
    expect(sim.etaMinutes()).toBe(0);
    expect(eta0).toBeGreaterThan(5);
    sim.stop();
  });

  it('lưu tiến trình và khôi phục khi tải lại; đặt lại về đầu', () => {
    const a = new DeliverySimulator();
    a.start('t2');
    vi.advanceTimersByTime(1200 * 5);
    const at = a.cursor();
    a.stop();
    const b = new DeliverySimulator();
    b.start('t2');
    expect(b.cursor()).toBe(at);
    b.reset();
    expect(b.cursor()).toBe(0);
    b.stop();
  });
});
