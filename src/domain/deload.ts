import { differenceInCalendarDays, parseISO, startOfWeek } from 'date-fns';

export const DEFAULT_DELOAD_EVERY = 6;

export function mondayOf(ts: number): number {
  return startOfWeek(ts, { weekStartsOn: 1 }).getTime();
}

/**
 * Program start: the explicit setting (yyyy-mm-dd) if present, else the Monday of the
 * first session, else the Monday of `now`.
 */
export function resolveProgramStart(
  setting: string | null | undefined,
  firstSessionStart: number | undefined,
  now: number,
): number {
  if (setting) {
    const d = parseISO(setting);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return mondayOf(firstSessionStart ?? now);
}

/** 1-based training week. Dates before the start count as week 1. */
export function weekNumber(date: number, programStart: number): number {
  const days = differenceInCalendarDays(date, programStart);
  return Math.max(1, Math.floor(days / 7) + 1);
}

export function isDeloadWeek(week: number, every = DEFAULT_DELOAD_EVERY): boolean {
  return every > 0 && week % every === 0;
}

export function deloadSets(sets: number): number {
  return Math.ceil(sets / 2);
}

export function prescribedSets(sets: number, isDeload: boolean): number {
  return isDeload ? deloadSets(sets) : sets;
}
