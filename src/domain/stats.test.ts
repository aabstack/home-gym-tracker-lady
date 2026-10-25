import type { SetLike } from './format';
import {
  bestE1rm,
  compareToLast,
  e1rm,
  exerciseSeries,
  findPRs,
  loadOf,
  sessionsThisWeek,
  topSet,
  totalReps,
  volume,
  weekStreak,
  weeklySetsPerMuscle,
} from './stats';

const set = (weightKg: number | null, reps: number, extra: Partial<SetLike> = {}): SetLike => ({
  weightKg,
  reps,
  rir: 2,
  ...extra,
});

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('load & e1RM', () => {
  it('ranks band-assisted below bodyweight below added load', () => {
    expect(loadOf(set(null, 5, { bandAssist: true }))).toBe(-1);
    expect(loadOf(set(null, 5))).toBe(0);
    expect(loadOf(set(null, 5, { addedKg: 5 }))).toBe(5);
    expect(loadOf(set(12.5, 5))).toBe(12.5);
  });

  it('Epley only for reps ≤ 15 and weight > 0', () => {
    expect(e1rm(30, 10)).toBeCloseTo(40);
    expect(e1rm(10, 15)).toBeCloseTo(15);
    expect(e1rm(10, 16)).toBeNull();
    expect(e1rm(0, 10)).toBeNull();
    expect(e1rm(null, 10)).toBeNull();
    expect(e1rm(10, 0)).toBeNull();
    expect(bestE1rm([set(10, 12), set(12, 8), set(null, 20)])).toBeCloseTo(15.2);
    expect(bestE1rm([set(null, 20)])).toBeNull();
  });
});

describe('volume', () => {
  it('sums weight × reps and tracks bodyweight reps separately', () => {
    expect(volume([set(10, 12), set(12.5, 10), set(null, 15)])).toEqual({
      weightedKg: 245,
      bodyweightReps: 15,
    });
    expect(totalReps([set(10, 12), set(null, 3)])).toBe(15);
  });

  it('top set picks heaviest then most reps', () => {
    expect(topSet([set(10, 12), set(12, 8), set(12, 9)])).toEqual(set(12, 9));
    expect(topSet([])).toBeUndefined();
  });
});

describe('findPRs', () => {
  const prior = [set(10, 12), set(12, 8), set(12, 7)];

  it('no PRs on the first session', () => {
    expect(findPRs([], [set(20, 12)], 8)).toEqual({});
  });

  it('weight PR needs ≥ repMin reps', () => {
    expect(findPRs(prior, [set(14, 8)], 8).weight).toEqual(set(14, 8));
    expect(findPRs(prior, [set(14, 7)], 8).weight).toBeUndefined();
    expect(findPRs(prior, [set(12, 9)], 8).weight).toBeUndefined();
  });

  it('weight PR compares against prior sets that reached repMin', () => {
    // 14 kg × 5 previously did not reach repMin, so 14 × 8 is still a weight PR.
    expect(findPRs([...prior, set(14, 5)], [set(14, 8)], 8).weight).toEqual(set(14, 8));
  });

  it('rep PR: more reps at the same or higher weight', () => {
    expect(findPRs(prior, [set(12, 9)], 8).reps).toEqual(set(12, 9));
    expect(findPRs(prior, [set(10, 12)], 8).reps).toBeUndefined();
    expect(findPRs(prior, [set(10, 13)], 8).reps).toEqual(set(10, 13));
    // 10 kg × 11 — beats nothing at ≥ 10 kg (12 reps at 10 kg).
    expect(findPRs(prior, [set(10, 11)], 8).reps).toBeUndefined();
    // Heavier than everything: no comparable prior sets → no rep PR (it's a weight PR instead).
    expect(findPRs(prior, [set(16, 8)], 8)).toEqual({ weight: set(16, 8) });
  });

  it('returns the best of each type', () => {
    const prs = findPRs(prior, [set(14, 8), set(16, 8), set(16, 9), set(12, 10)], 8);
    expect(prs.weight).toEqual(set(16, 9));
    expect(prs.reps).toEqual(set(12, 10));
  });

  it('works for bodyweight with added load', () => {
    const bw = [set(null, 6), set(null, 8, { bandAssist: true })];
    expect(findPRs(bw, [set(null, 7)], 5).reps).toEqual(set(null, 7));
    expect(findPRs(bw, [set(null, 5, { addedKg: 2.5 })], 5).weight).toEqual(
      set(null, 5, { addedKg: 2.5 }),
    );
  });
});

describe('compareToLast', () => {
  it('beat / matched / short / new', () => {
    const last = [set(10, 12), set(10, 11)];
    expect(compareToLast([set(12, 8)], last)).toBe('beat');
    expect(compareToLast([set(10, 12), set(10, 12)], last)).toBe('beat');
    expect(compareToLast([set(10, 12), set(10, 11)], last)).toBe('matched');
    expect(compareToLast([set(10, 12), set(10, 10)], last)).toBe('short');
    expect(compareToLast([set(9, 15)], last)).toBe('short');
    expect(compareToLast([], last)).toBe('short');
    expect(compareToLast([set(10, 12)], [])).toBe('new');
  });
});

describe('weekly sets per muscle', () => {
  it('counts each set once per target muscle, per week', () => {
    const now = day(2026, 3, 18); // Wednesday
    const result = weeklySetsPerMuscle(
      [
        { completedAt: day(2026, 3, 16), targets: ['Lats', 'Biceps'] },
        { completedAt: day(2026, 3, 17), targets: ['Lats'] },
        { completedAt: day(2026, 3, 10), targets: ['Quads'] },
        { completedAt: day(2025, 1, 1), targets: ['Quads'] }, // outside window
      ],
      8,
      now,
    );
    expect(result).toHaveLength(8);
    expect(result[7].weekStart).toBe(new Date(2026, 2, 16).getTime());
    expect(result[7].counts).toEqual({ Lats: 2, Biceps: 1 });
    expect(result[6].counts).toEqual({ Quads: 1 });
    expect(result[0].counts).toEqual({});
    expect(result[0].weekStart).toBeLessThan(result[1].weekStart);
  });
});

describe('weekly session stats', () => {
  const now = day(2026, 3, 18); // Wed
  it('counts sessions this week', () => {
    expect(
      sessionsThisWeek(
        [
          { startedAt: day(2026, 3, 16) },
          { startedAt: day(2026, 3, 18) },
          { startedAt: day(2026, 3, 13) },
        ],
        now,
      ),
    ).toBe(2);
  });

  it('streak counts consecutive weeks, tolerating an empty current week', () => {
    expect(weekStreak([], now)).toBe(0);
    expect(
      weekStreak(
        [
          { startedAt: day(2026, 3, 16) },
          { startedAt: day(2026, 3, 9) },
          { startedAt: day(2026, 2, 23) },
        ],
        now,
      ),
    ).toBe(2);
    expect(weekStreak([{ startedAt: day(2026, 3, 11) }, { startedAt: day(2026, 3, 4) }], now)).toBe(
      2,
    );
    expect(weekStreak([{ startedAt: day(2026, 3, 4) }], now)).toBe(0);
  });
});

describe('exerciseSeries', () => {
  it('builds one point per session, oldest first', () => {
    const pts = exerciseSeries([
      { startedAt: 20, sets: [set(12, 10), set(12, 8)] },
      { startedAt: 10, sets: [set(10, 12), set(10, 12)] },
      { startedAt: 30, sets: [set(null, 8), set(null, 6)] },
      { startedAt: 40, sets: [] },
    ]);
    expect(pts.map((p) => p.date)).toEqual([10, 20, 30]);
    expect(pts[0]).toEqual({ date: 10, topWeight: 10, e1rm: 14, totalReps: 24, volume: 240 });
    expect(pts[1].topWeight).toBe(12);
    expect(pts[2]).toEqual({ date: 30, topWeight: null, e1rm: null, totalReps: 14, volume: 0 });
  });
});
