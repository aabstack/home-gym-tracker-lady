import { followingDay, lastCompleted, nextDayId, shouldRest } from './rotation';

const H = 3_600_000;

describe('rotation', () => {
  it('starts at A with no sessions', () => {
    expect(nextDayId([])).toBe('A');
  });

  it('cycles A → B → C → A', () => {
    expect(followingDay('A')).toBe('B');
    expect(followingDay('B')).toBe('C');
    expect(followingDay('C')).toBe('A');
  });

  it('uses the day after the last completed session', () => {
    expect(
      nextDayId([
        { dayId: 'A', startedAt: 1, endedAt: 2 },
        { dayId: 'B', startedAt: 10, endedAt: 11 },
      ]),
    ).toBe('C');
    expect(nextDayId([{ dayId: 'C', startedAt: 1, endedAt: 2 }])).toBe('A');
  });

  it('ignores unfinished sessions', () => {
    expect(
      nextDayId([
        { dayId: 'A', startedAt: 1, endedAt: 2 },
        { dayId: 'B', startedAt: 10 },
      ]),
    ).toBe('B');
  });

  it('continues from a manual choice', () => {
    // Suggested B, user picked C manually; rotation continues from C.
    expect(
      nextDayId([
        { dayId: 'A', startedAt: 1, endedAt: 2 },
        { dayId: 'C', startedAt: 10, endedAt: 11 },
      ]),
    ).toBe('A');
  });

  it('orders by end time, not array order', () => {
    expect(
      nextDayId([
        { dayId: 'B', startedAt: 10, endedAt: 11 },
        { dayId: 'A', startedAt: 1, endedAt: 2 },
      ]),
    ).toBe('C');
  });

  it('respects a rotation reset', () => {
    const sessions = [{ dayId: 'B' as const, startedAt: 10, endedAt: 11 }];
    expect(nextDayId(sessions, 12)).toBe('A');
    expect(nextDayId(sessions, 5)).toBe('C');
    expect(lastCompleted(sessions, 12)).toBeUndefined();
  });

  it('warns to rest under 40 hours, not after', () => {
    const now = 100 * H;
    expect(shouldRest([], now)).toBe(false);
    expect(shouldRest([{ dayId: 'A', startedAt: 0, endedAt: now - 39 * H }], now)).toBe(true);
    expect(shouldRest([{ dayId: 'A', startedAt: 0, endedAt: now - 40 * H }], now)).toBe(false);
    expect(shouldRest([{ dayId: 'A', startedAt: now - H }], now)).toBe(false);
  });
});
