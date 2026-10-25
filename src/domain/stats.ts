import { mondayOf } from './deload';
import type { SetLike } from './format';

const WEEK_MS = 7 * 86_400_000;

/**
 * Comparable load for a set. Dumbbell weight when present; otherwise bodyweight work, where
 * added kg counts as load and band-assisted sets rank below unassisted bodyweight.
 */
export function loadOf(set: Pick<SetLike, 'weightKg' | 'addedKg' | 'bandAssist'>): number {
  if (set.weightKg !== null) return set.weightKg;
  if (set.bandAssist) return -1;
  return set.addedKg ?? 0;
}

/** Epley estimated 1RM; only for sets with reps ≤ 15 and weight > 0. */
export function e1rm(weightKg: number | null, reps: number): number | null {
  if (weightKg === null || weightKg <= 0 || reps <= 0 || reps > 15) return null;
  return weightKg * (1 + reps / 30);
}

export function bestE1rm(sets: readonly SetLike[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const v = e1rm(s.weightKg, s.reps);
    if (v !== null && (best === null || v > best)) best = v;
  }
  return best;
}

export interface Volume {
  /** Σ weight × reps over weighted sets. */
  weightedKg: number;
  /** Total reps of bodyweight / band sets (no dumbbell weight). */
  bodyweightReps: number;
}

export function volume(sets: readonly SetLike[]): Volume {
  let weightedKg = 0;
  let bodyweightReps = 0;
  for (const s of sets) {
    if (s.weightKg !== null) weightedKg += s.weightKg * s.reps;
    else bodyweightReps += s.reps;
  }
  return { weightedKg, bodyweightReps };
}

export function totalReps(sets: readonly SetLike[]): number {
  return sets.reduce((t, s) => t + s.reps, 0);
}

/** Heaviest set, ties broken by reps. */
export function topSet<T extends SetLike>(sets: readonly T[]): T | undefined {
  let top: T | undefined;
  for (const s of sets) {
    if (!top || loadOf(s) > loadOf(top) || (loadOf(s) === loadOf(top) && s.reps > top.reps))
      top = s;
  }
  return top;
}

export interface PRs<T> {
  weight?: T;
  reps?: T;
}

/**
 * PRs in `current` against all `prior` sets of the same exercise.
 * Weight PR: heavier than any prior set that reached repMin, itself at ≥ repMin reps.
 * Rep PR: more reps than any prior set at the same or a higher load.
 * Returns at most one of each (the best). No PRs on the first ever session.
 */
export function findPRs<T extends SetLike>(
  prior: readonly SetLike[],
  current: readonly T[],
  repMin: number,
): PRs<T> {
  const result: PRs<T> = {};
  if (prior.length === 0) return result;
  const priorQualified = prior.filter((s) => s.reps >= repMin).map(loadOf);
  const bestPriorLoad = priorQualified.length ? Math.max(...priorQualified) : -Infinity;

  for (const s of current) {
    const load = loadOf(s);
    if (s.reps >= repMin && load > bestPriorLoad) {
      if (
        !result.weight ||
        load > loadOf(result.weight) ||
        (load === loadOf(result.weight) && s.reps > result.weight.reps)
      ) {
        result.weight = s;
      }
    }
    const comparable = prior.filter((p) => loadOf(p) >= load);
    if (comparable.length > 0) {
      const bestReps = Math.max(...comparable.map((p) => p.reps));
      if (s.reps > bestReps && (!result.reps || s.reps > result.reps.reps)) result.reps = s;
    }
  }
  return result;
}

export type Comparison = 'beat' | 'matched' | 'short' | 'new';

/** Compare this session's sets for an exercise to last time: top load first, then total reps. */
export function compareToLast(current: readonly SetLike[], last: readonly SetLike[]): Comparison {
  if (last.length === 0) return 'new';
  if (current.length === 0) return 'short';
  const curTop = loadOf(topSet(current) as SetLike);
  const lastTop = loadOf(topSet(last) as SetLike);
  if (curTop > lastTop) return 'beat';
  if (curTop < lastTop) return 'short';
  const cur = totalReps(current);
  const prev = totalReps(last);
  return cur > prev ? 'beat' : cur === prev ? 'matched' : 'short';
}

export interface WeekMuscleSets {
  weekStart: number;
  counts: Record<string, number>;
}

/** Working sets per muscle per week, oldest first. Each set counts once for every target muscle. */
export function weeklySetsPerMuscle(
  sets: readonly { completedAt: number; targets: readonly string[] }[],
  weeks: number,
  now: number,
): WeekMuscleSets[] {
  const thisWeek = mondayOf(now);
  const result: WeekMuscleSets[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    result.push({ weekStart: mondayOf(thisWeek - i * WEEK_MS + 86_400_000), counts: {} });
  }
  for (const s of sets) {
    const ws = mondayOf(s.completedAt);
    const bucket = result.find((w) => w.weekStart === ws);
    if (!bucket) continue;
    for (const m of s.targets) bucket.counts[m] = (bucket.counts[m] ?? 0) + 1;
  }
  return result;
}

export function sessionsThisWeek(sessions: readonly { startedAt: number }[], now: number): number {
  const ws = mondayOf(now);
  return sessions.filter((s) => mondayOf(s.startedAt) === ws).length;
}

/**
 * Consecutive training weeks (≥ 1 session) ending this week. An empty current week
 * doesn't break the streak yet; counting then starts from last week.
 */
export function weekStreak(sessions: readonly { startedAt: number }[], now: number): number {
  const weeks = new Set(sessions.map((s) => mondayOf(s.startedAt)));
  let cursor = mondayOf(now);
  if (!weeks.has(cursor)) cursor = mondayOf(cursor - 86_400_000);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = mondayOf(cursor - 86_400_000);
  }
  return streak;
}

export interface ExercisePoint {
  date: number;
  /** Heaviest dumbbell weight, or null for bodyweight/band sessions. */
  topWeight: number | null;
  e1rm: number | null;
  totalReps: number;
  volume: number;
}

/** One chart point per session for an exercise, oldest first. */
export function exerciseSeries(
  entries: readonly { startedAt: number; sets: readonly SetLike[] }[],
): ExercisePoint[] {
  return entries
    .filter((e) => e.sets.length > 0)
    .map((e) => {
      const weights = e.sets.flatMap((s) => (s.weightKg !== null ? [s.weightKg] : []));
      return {
        date: e.startedAt,
        topWeight: weights.length ? Math.max(...weights) : null,
        e1rm: bestE1rm(e.sets),
        totalReps: totalReps(e.sets),
        volume: volume(e.sets).weightedKg,
      };
    })
    .sort((a, b) => a.date - b.date);
}
