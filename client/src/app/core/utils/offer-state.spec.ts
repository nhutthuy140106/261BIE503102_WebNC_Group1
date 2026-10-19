import { Offer } from '../models/offer';
import { applyAction, availableActions, canDo, canSeeExactAddress } from './offer-state';

const base: Offer = {
  _id: '1', code: 'AG-J1', jobId: 'j', jobTitle: 't', posterName: 'p', pay: 1000, block: 'B',
  intro: 'xin chào bạn', slots: [], state: 'offered', history: [{ state: 'offered', at: '2026-10-18T00:00:00Z' }],
};

describe('offer-state', () => {
  it('chỉ rút được khi đang ở "offered"', () => {
    expect(canDo('offered', 'withdraw')).toBe(true);
    expect(canDo('chosen', 'withdraw')).toBe(false);
  });

  it('đi đúng chuỗi chosen → working → reported → done và ghi history', () => {
    let o: Offer = { ...base, state: 'chosen' };
    o = applyAction(o, 'start');
    o = applyAction(o, 'reportDone');
    o = applyAction(o, 'confirmPaid');
    expect(o.state).toBe('done');
    expect(o.history.map((h) => h.state)).toEqual(['offered', 'working', 'reported', 'done']);
  });

  it('chuyển sai trạng thái thì ném lỗi', () => {
    expect(() => applyAction(base, 'reportDone')).toThrow();
  });

  it('trạng thái cuối không còn hành động', () => {
    for (const s of ['rejected', 'withdrawn', 'cancelled', 'done'] as const) {
      expect(availableActions(s)).toEqual([]);
    }
  });

  it('xin hủy được ở chosen và working, không ở reported', () => {
    expect(availableActions('chosen')).toContain('cancelRequest');
    expect(availableActions('working')).toContain('cancelRequest');
    expect(availableActions('reported')).not.toContain('cancelRequest');
  });

  it('địa chỉ chính xác chỉ lộ từ "chosen"', () => {
    expect(canSeeExactAddress('offered')).toBe(false);
    expect(canSeeExactAddress('rejected')).toBe(false);
    expect(canSeeExactAddress('chosen')).toBe(true);
  });
});
