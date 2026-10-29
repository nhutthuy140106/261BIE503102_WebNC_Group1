import { trimHistory } from './assistant';

describe('trimHistory', () => {
  it('chỉ giữ 10 lượt gần nhất và luôn bắt đầu bằng tin của người dùng', () => {
    const turns = Array.from({ length: 14 }, (_, i) => ({ role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant', content: `t${i}` }));
    const out = trimHistory(turns);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out[0].role).toBe('user');
    expect(out[out.length - 1].content).toBe('t13');
  });

  it('cắt mỗi tin còn 500 ký tự', () => {
    expect(trimHistory([{ role: 'user', content: 'x'.repeat(900) }])[0].content.length).toBe(500);
  });
});
