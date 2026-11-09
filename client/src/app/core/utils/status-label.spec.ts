import { jobWhen } from './status-label';

const job = (x: { start?: string; end?: string; allDay?: boolean }) => ({ due: 'Tối T3 & T5', ...x });

describe('thời gian làm của việc', () => {
  it('một ngày, chỉ có giờ bắt đầu', () => {
    expect(jobWhen(job({ start: '2026-11-14T08:30:00' }))).toBe('14/11/2026 · 08:30');
  });

  it('một ngày, có giờ kết thúc', () => {
    expect(jobWhen(job({ start: '2026-11-14T08:30:00', end: '2026-11-14T11:00:00' }))).toBe('14/11/2026 · 08:30 – 11:00');
  });

  it('nhiều ngày, cùng khung giờ mỗi ngày', () => {
    expect(jobWhen(job({ start: '2026-11-14T08:30:00', end: '2026-11-16T11:00:00' }))).toBe('14/11/2026 – 16/11/2026 · 08:30 – 11:00');
  });

  it('nhiều ngày, không có giờ kết thúc thì ghi một giờ', () => {
    expect(jobWhen(job({ start: '2026-11-14T08:30:00', end: '2026-11-16T08:30:00' }))).toBe('14/11/2026 – 16/11/2026 · 08:30');
  });

  it('không cố định giờ chỉ ghi ngày', () => {
    expect(jobWhen(job({ start: '2026-11-14T00:00:00', allDay: true }))).toBe('14/11/2026');
    expect(jobWhen(job({ start: '2026-11-14T00:00:00', end: '2026-11-16T00:00:00', allDay: true }))).toBe('14/11/2026 – 16/11/2026');
  });

  it('việc lặp tuần không có ngày thì dùng chữ người đăng', () => {
    expect(jobWhen(job({}))).toBe('Tối T3 & T5');
  });
});
