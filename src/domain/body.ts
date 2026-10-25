import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { BodyCheck, DailyLog } from '../data/types';

/** Numeric fields of a check-in that can be charted and compared. */
export const BODY_METRICS = [
  'weightKg',
  'bodyFatPct',
  'skeletalMuscleKg',
  'fatMassKg',
  'bmi',
  'bmrKcal',
  'waistHipRatio',
  'waistCm',
  'hipsCm',
  'thighCm',
] as const;
export type BodyMetric = (typeof BODY_METRICS)[number];

/**
 * Which direction counts as progress for her goals (bigger, stronger glutes and thighs, a
 * slimmer waist, less fat). Hips and thighs can grow from muscle, so they are neutral.
 */
export const GOOD_DIRECTION: Record<BodyMetric, 'down' | 'up' | 'neutral'> = {
  weightKg: 'down',
  bodyFatPct: 'down',
  skeletalMuscleKg: 'up',
  fatMassKg: 'down',
  bmi: 'down',
  bmrKcal: 'neutral',
  waistHipRatio: 'down',
  waistCm: 'down',
  hipsCm: 'neutral',
  thighCm: 'neutral',
};

/** Days between check-ins in her plan. */
export const CHECKIN_EVERY_DAYS = 28;

/** Local calendar date key, e.g. "2026-10-25". */
export function dateKey(ts: number | Date): string {
  return format(ts, 'yyyy-MM-dd');
}

export function bmi(weightKg: number, heightCm: number): number | undefined {
  if (!(weightKg > 0) || !(heightCm > 0)) return undefined;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Newest first (by date, then by when it was entered). */
export function sortChecks<T extends Pick<BodyCheck, 'date' | 'createdAt'>>(
  checks: readonly T[],
): T[] {
  return [...checks].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
}

/** The newest value of a metric and the newest earlier value, for "change since last time". */
export function metricChange(checks: readonly BodyCheck[], metric: BodyMetric) {
  const withValue = sortChecks(checks).filter((c) => typeof c[metric] === 'number');
  const latest = withValue[0];
  const previous = withValue[1];
  if (!latest) return undefined;
  const value = latest[metric] as number;
  const prev = previous ? (previous[metric] as number) : undefined;
  const delta = prev === undefined ? undefined : Math.round((value - prev) * 100) / 100;
  const dir = GOOD_DIRECTION[metric];
  const good =
    delta === undefined || delta === 0 || dir === 'neutral'
      ? undefined
      : (dir === 'down' && delta < 0) || (dir === 'up' && delta > 0);
  return { value, date: latest.date, previous: prev, previousDate: previous?.date, delta, good };
}

/** Oldest-first points for a chart of one metric. */
export function metricSeries(checks: readonly BodyCheck[], metric: BodyMetric) {
  return sortChecks(checks)
    .filter((c) => typeof c[metric] === 'number')
    .reverse()
    .map((c) => ({ date: parseISO(c.date).getTime(), value: c[metric] as number }));
}

/** Calendar days since a yyyy-MM-dd date. */
export function daysSince(date: string, now: number): number {
  return differenceInCalendarDays(now, parseISO(date));
}

/** A check-in is due 4 weeks after the latest one. No check-ins: not due (the Body tab invites one). */
export function checkInDue(checks: readonly BodyCheck[], now: number) {
  const latest = sortChecks(checks)[0];
  if (!latest) return { due: false, days: null as number | null };
  const days = daysSince(latest.date, now);
  return { due: days >= CHECKIN_EVERY_DAYS, days };
}

/** Progress from the first weight to the target (works for losing or gaining). */
export function targetProgress(startKg: number, currentKg: number, targetKg: number) {
  const total = targetKg - startKg;
  const done = currentKg - startKg;
  const fraction = total === 0 ? 1 : Math.min(1, Math.max(0, done / total));
  const remainingKg = Math.round(Math.abs(targetKg - currentKg) * 10) / 10;
  const reached = total === 0 || (total < 0 ? currentKg <= targetKg : currentKg >= targetKg);
  return { fraction, remainingKg, reached };
}

export type HabitStatus = 'none' | 'below' | 'met' | 'above';

export function habitStatus(value: number | undefined, min: number, max: number): HabitStatus {
  if (value === undefined || value <= 0) return 'none';
  if (value < min) return 'below';
  return value > max ? 'above' : 'met';
}

/** One entry per day for the last `days` days (oldest first), empty days included. */
export function lastNDays(logs: readonly DailyLog[], days: number, now: number) {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const out: { date: string; ts: number; steps?: number; proteinG?: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    const key = dateKey(d);
    const log = byDate.get(key);
    out.push({
      date: key,
      ts: parseISO(key).getTime(),
      steps: log?.steps,
      proteinG: log?.proteinG,
    });
  }
  return out;
}

/** Average of the defined, positive values (rounded), or undefined if there are none. */
export function average(values: readonly (number | undefined)[]): number | undefined {
  const v = values.filter((x): x is number => typeof x === 'number' && x > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : undefined;
}
