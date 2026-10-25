import type { BodyCheck, DailyLog } from '../data/types';
import {
  average,
  bmi,
  checkInDue,
  CHECKIN_EVERY_DAYS,
  dateKey,
  daysSince,
  habitStatus,
  lastNDays,
  metricChange,
  metricSeries,
  sortChecks,
  targetProgress,
} from './body';

const check = (date: string, fields: Partial<BodyCheck> = {}, createdAt = 0): BodyCheck => ({
  id: `${date}-${createdAt}`,
  date,
  createdAt,
  ...fields,
});
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('body metrics', () => {
  it('BMI from weight and height, rounded to 0.1', () => {
    expect(bmi(63.5, 160)).toBe(24.8); // matches her InBody report
    expect(bmi(0, 160)).toBeUndefined();
    expect(bmi(60, 0)).toBeUndefined();
  });

  it('sorts newest first, ties by entry time', () => {
    const list = [check('2026-09-26'), check('2026-10-24', {}, 1), check('2026-10-24', {}, 2)];
    expect(sortChecks(list).map((c) => c.id)).toEqual([
      '2026-10-24-2',
      '2026-10-24-1',
      '2026-09-26-0',
    ]);
  });

  it('change since the previous check-in, judged by her goals', () => {
    const list = [
      check('2026-09-26', { weightKg: 63.5, skeletalMuscleKg: 24.4, hipsCm: 98, waistCm: 80 }),
      check('2026-10-24', { weightKg: 62.7, skeletalMuscleKg: 24.6, hipsCm: 99 }),
    ];
    expect(metricChange(list, 'weightKg')).toMatchObject({ value: 62.7, delta: -0.8, good: true });
    expect(metricChange(list, 'skeletalMuscleKg')).toMatchObject({ delta: 0.2, good: true });
    expect(metricChange(list, 'hipsCm')).toMatchObject({ delta: 1, good: undefined }); // neutral
    // Only one value recorded: shown without a change.
    expect(metricChange(list, 'waistCm')).toMatchObject({ value: 80, delta: undefined });
    expect(metricChange(list, 'thighCm')).toBeUndefined();
    const worse = [
      check('2026-09-26', { bodyFatPct: 30.2 }),
      check('2026-10-24', { bodyFatPct: 30.5 }),
    ];
    expect(metricChange(worse, 'bodyFatPct')?.good).toBe(false);
    const same = [check('2026-09-26', { bmi: 24.8 }), check('2026-10-24', { bmi: 24.8 })];
    expect(metricChange(same, 'bmi')).toMatchObject({ delta: 0, good: undefined });
  });

  it('chart series oldest first, skipping check-ins without the metric', () => {
    const list = [
      check('2026-10-24', { weightKg: 62.7 }),
      check('2026-09-26', { weightKg: 63.5 }),
      check('2026-10-01'),
    ];
    expect(metricSeries(list, 'weightKg').map((p) => p.value)).toEqual([63.5, 62.7]);
  });

  it('a check-in is due 4 weeks after the latest one', () => {
    const list = [check('2026-09-26')];
    expect(checkInDue([], at(2026, 10, 25))).toEqual({ due: false, days: null });
    expect(checkInDue(list, at(2026, 10, 23))).toEqual({ due: false, days: 27 });
    expect(checkInDue(list, at(2026, 10, 24))).toEqual({ due: true, days: CHECKIN_EVERY_DAYS });
    expect(daysSince('2026-10-24', at(2026, 10, 25, 0))).toBe(1);
  });

  it('progress towards a lower or higher target weight', () => {
    expect(targetProgress(63.5, 63.5, 57.6)).toEqual({
      fraction: 0,
      remainingKg: 5.9,
      reached: false,
    });
    expect(targetProgress(63.5, 60.55, 57.6).fraction).toBeCloseTo(0.5);
    expect(targetProgress(63.5, 57.4, 57.6)).toMatchObject({ fraction: 1, reached: true });
    expect(targetProgress(63.5, 64, 57.6).fraction).toBe(0); // went the wrong way: clamped
    expect(targetProgress(55, 56, 58)).toMatchObject({ remainingKg: 2, reached: false });
    expect(targetProgress(60, 60, 60)).toMatchObject({ fraction: 1, reached: true });
  });
});

describe('daily habits', () => {
  it('status against a goal range', () => {
    expect(habitStatus(undefined, 8000, 12000)).toBe('none');
    expect(habitStatus(0, 8000, 12000)).toBe('none');
    expect(habitStatus(5000, 8000, 12000)).toBe('below');
    expect(habitStatus(9000, 8000, 12000)).toBe('met');
    expect(habitStatus(15000, 8000, 12000)).toBe('above');
  });

  it('last N days, oldest first, with empty days', () => {
    const logs: DailyLog[] = [
      { date: '2026-10-25', steps: 9000, proteinG: 115, updatedAt: 0 },
      { date: '2026-10-23', steps: 6000, updatedAt: 0 },
    ];
    const days = lastNDays(logs, 3, at(2026, 10, 25));
    expect(days.map((d) => d.date)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    expect(days.map((d) => d.steps)).toEqual([6000, undefined, 9000]);
    expect(days[2].proteinG).toBe(115);
  });

  it('averages only days with data', () => {
    expect(average([6000, undefined, 9000, 0])).toBe(7500);
    expect(average([undefined])).toBeUndefined();
  });

  it('date keys are local calendar dates', () => {
    expect(dateKey(at(2026, 10, 25, 23))).toBe('2026-10-25');
  });
});
