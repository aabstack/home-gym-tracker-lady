import {
  deloadSets,
  isDeloadWeek,
  mondayOf,
  prescribedSets,
  resolveProgramStart,
  weekNumber,
} from './deload';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).getTime();

describe('deload & week number', () => {
  const start = d(2026, 1, 5, 0); // Monday

  it('counts weeks from the program start', () => {
    expect(weekNumber(start, start)).toBe(1);
    expect(weekNumber(d(2026, 1, 11), start)).toBe(1); // Sunday
    expect(weekNumber(d(2026, 1, 12), start)).toBe(2);
    expect(weekNumber(d(2026, 2, 9), start)).toBe(6);
    expect(weekNumber(d(2026, 3, 23), start)).toBe(12);
  });

  it('never returns less than week 1', () => {
    expect(weekNumber(d(2025, 12, 1), start)).toBe(1);
  });

  it('stays correct across a DST change', () => {
    // Late March / early April includes DST transitions in many locales.
    const s = d(2026, 3, 23, 0);
    expect(weekNumber(d(2026, 3, 30, 0), s)).toBe(2);
    expect(weekNumber(d(2026, 4, 6, 0), s)).toBe(3);
  });

  it('flags deload on weeks 6 and 12 only', () => {
    expect(isDeloadWeek(6)).toBe(true);
    expect(isDeloadWeek(12)).toBe(true);
    expect(isDeloadWeek(1)).toBe(false);
    expect(isDeloadWeek(5)).toBe(false);
    expect(isDeloadWeek(7)).toBe(false);
    expect(isDeloadWeek(4, 4)).toBe(true);
    expect(isDeloadWeek(4, 0)).toBe(false);
  });

  it('halves sets with ceil', () => {
    expect(deloadSets(4)).toBe(2);
    expect(deloadSets(3)).toBe(2);
    expect(deloadSets(2)).toBe(1);
    expect(prescribedSets(3, true)).toBe(2);
    expect(prescribedSets(3, false)).toBe(3);
  });

  it('resolves program start from setting, first session, or now', () => {
    expect(resolveProgramStart('2026-01-05', undefined, 0)).toBe(start);
    expect(resolveProgramStart(null, d(2026, 1, 8), 0)).toBe(start);
    expect(resolveProgramStart(undefined, undefined, d(2026, 1, 10))).toBe(start);
    expect(resolveProgramStart('garbage', d(2026, 1, 8), 0)).toBe(start);
  });

  it('finds the Monday of a week', () => {
    expect(mondayOf(d(2026, 1, 11, 23))).toBe(start);
  });
});
