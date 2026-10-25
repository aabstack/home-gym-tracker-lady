import type { DayId } from '../data/types';

export const DAY_ORDER: readonly DayId[] = ['A', 'B', 'C'];
export const REST_WARNING_HOURS = 40;

export interface RotationSession {
  dayId: DayId;
  startedAt: number;
  endedAt?: number;
}

export function followingDay(day: DayId): DayId {
  return DAY_ORDER[(DAY_ORDER.indexOf(day) + 1) % DAY_ORDER.length];
}

/** Most recently completed session, optionally only counting those finished after `since`. */
export function lastCompleted<T extends RotationSession>(
  sessions: readonly T[],
  since = 0,
): T | undefined {
  let best: T | undefined;
  for (const s of sessions) {
    if (s.endedAt === undefined || s.endedAt < since) continue;
    if (!best || s.endedAt > (best.endedAt as number)) best = s;
  }
  return best;
}

/**
 * Next day in the A → B → C rotation: the day after the last completed session.
 * `resetAt` (from Settings → reset rotation) ignores sessions finished before it.
 */
export function nextDayId(sessions: readonly RotationSession[], resetAt = 0): DayId {
  const last = lastCompleted(sessions, resetAt);
  return last ? followingDay(last.dayId) : 'A';
}

/** True when the last session ended less than 40 hours ago: a warning, never a block. */
export function shouldRest(sessions: readonly RotationSession[], now: number): boolean {
  const last = lastCompleted(sessions);
  if (!last) return false;
  return now - (last.endedAt as number) < REST_WARNING_HOURS * 3_600_000;
}
