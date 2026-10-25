import type { Exercise, ProgramItem } from '../data/types';
import { formatKg, roundKg, type SetLike } from './format';

export type SuggestionKind =
  | 'start'
  | 'deload'
  | 'increase_weight'
  | 'remove_band'
  | 'add_load'
  | 'ladder'
  | 'hold'
  | 'drop'
  | 'beat';

export interface Suggestion {
  kind: SuggestionKind;
  message: string;
  suggestedWeightKg?: number;
  suggestedAddedKg?: number;
  suggestedTechnique?: string;
}

export interface HistorySession {
  isDeload: boolean;
  sets: readonly SetLike[];
}

export interface SuggestInput {
  exercise: Pick<Exercise, 'loadType' | 'perSide'>;
  item: Pick<ProgramItem, 'sets' | 'repMin' | 'repMax'>;
  /** Completed sessions containing this exercise, most recent first, excluding the current one. */
  history: readonly HistorySession[];
  availableWeightsKg: readonly number[];
  /** The session being planned is a deload session. */
  isDeload?: boolean;
  /** Technique ladder after "add reps" (defaults to LADDER). */
  ladder?: readonly LadderStep[];
  /**
   * Heaviest added load ever suggested for bodyweight / assisted moves (defaults to the heaviest
   * dumbbell). 0 means never suggest adding weight: go straight to the ladder.
   */
  maxAddedKg?: number;
  /** Minimum RIR for a set to count towards hitting the target (default 1). */
  minTargetRir?: number;
}

export interface LadderStep {
  /** Matches the technique tags logged per set. */
  tag: string;
  label: string;
}

/** Ladder after "add reps", in order. `tag` matches the technique tags logged per set. */
export const LADDER: readonly LadderStep[] = [
  { tag: 'tempo', label: 'Tempo 4–5 s eccentric' },
  { tag: 'pause', label: 'Pause 2–3 s in stretch' },
  { tag: '1.5 reps', label: '1.5 reps' },
  { tag: 'unilateral', label: 'Unilateral' },
  { tag: 'drop set', label: 'Mechanical drop set on last set' },
  { tag: 'rest-pause', label: 'Rest-pause last set' },
];

/** The seed's progressionLadder minus its first "add reps" step, as ladder steps. */
export function ladderFromSeed(steps: readonly { id: string; label: string }[]): LadderStep[] {
  return steps.filter((s) => s.id !== 'reps').map((s) => ({ tag: s.id, label: s.label }));
}

export const ADDED_LOAD_STEP_KG = 2.5;

const BEAT = 'Beat last time: +1 rep on any set';

function sortedSets(sets: readonly SetLike[]) {
  return [...sets].sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0));
}

export function topWeight(sets: readonly SetLike[]): number | undefined {
  let top: number | undefined;
  for (const s of sets)
    if (s.weightKg !== null && (top === undefined || s.weightKg > top)) top = s.weightKg;
  return top;
}

function maxAdded(sets: readonly SetLike[]): number {
  return sets.reduce((m, s) => Math.max(m, s.addedKg ?? 0), 0);
}

/** Every prescribed working set reached repMax with RIR ≥ minRir (default 1). */
export function hitTarget(
  sets: readonly SetLike[],
  item: SuggestInput['item'],
  minRir = 1,
): boolean {
  const working = sortedSets(sets).slice(0, item.sets);
  return (
    working.length >= item.sets && working.every((s) => s.reps >= item.repMax && s.rir >= minRir)
  );
}

function anyBelowMin(sets: readonly SetLike[], repMin: number) {
  return sets.some((s) => s.reps < repMin);
}

export function nextWeight(current: number, available: readonly number[]): number | undefined {
  return [...available].sort((a, b) => a - b).find((w) => w > current);
}

export function prevWeight(current: number, available: readonly number[]): number | undefined {
  return [...available].sort((a, b) => b - a).find((w) => w < current);
}

/** First ladder step not used in the given sessions (skipping unilateral for per-side moves). */
export function nextLadderStep(
  recent: readonly HistorySession[],
  perSide: boolean,
  ladder: readonly LadderStep[] = LADDER,
) {
  const used = new Set(recent.flatMap((h) => h.sets.flatMap((s) => s.techniques ?? [])));
  return ladder.find((step) => !(perSide && step.tag === 'unilateral') && !used.has(step.tag));
}

function ladderOrBeat(
  recent: readonly HistorySession[],
  perSide: boolean,
  weight: number | undefined,
  ladder: readonly LadderStep[],
): Suggestion {
  const step = nextLadderStep(recent, perSide, ladder);
  if (!step) return { kind: 'beat', message: BEAT, suggestedWeightKg: weight };
  return {
    kind: 'ladder',
    message: `Next step: ${step.label}`,
    suggestedTechnique: step.tag,
    suggestedWeightKg: weight,
  };
}

/** Double progression + progression ladder (SPEC §5.2). */
export function suggestProgression(input: SuggestInput): Suggestion {
  const { exercise, item, history, availableWeightsKg } = input;
  const ladder = input.ladder ?? LADDER;
  const isDumbbell = exercise.loadType === 'dumbbell';
  const lastAny = history[0];
  const lastAnyWeight = lastAny ? topWeight(lastAny.sets) : undefined;

  if (input.isDeload) {
    return {
      kind: 'deload',
      message: 'Deload: keep weights, half the sets',
      suggestedWeightKg: lastAnyWeight,
    };
  }

  const evaluated = history.filter((h) => !h.isDeload);
  const last = evaluated[0];
  if (!last) {
    if (lastAny) return { kind: 'beat', message: BEAT, suggestedWeightKg: lastAnyWeight };
    const range = item.repMin === item.repMax ? `${item.repMax}` : `${item.repMin}–${item.repMax}`;
    return {
      kind: 'start',
      message: `First time: pick a load for ${range} reps at RIR 2`,
    };
  }

  const weight = topWeight(last.sets);
  const recent = evaluated.slice(0, 2);

  // 1–2. Hit target → add load, or climb the ladder.
  if (hitTarget(last.sets, item, input.minTargetRir)) {
    if (isDumbbell && weight !== undefined) {
      const next = nextWeight(weight, availableWeightsKg);
      if (next !== undefined) {
        return {
          kind: 'increase_weight',
          message: `Go up to ${formatKg(next)} kg, aim for ${item.repMin}+ reps`,
          suggestedWeightKg: next,
        };
      }
    }
    if (exercise.loadType === 'bodyweight' || exercise.loadType === 'assisted') {
      if (last.sets.some((s) => s.bandAssist)) {
        return { kind: 'remove_band', message: 'Drop the band assist' };
      }
      const added = maxAdded(last.sets);
      const next = roundKg(added + ADDED_LOAD_STEP_KG);
      const cap = Math.min(input.maxAddedKg ?? Infinity, Math.max(0, ...availableWeightsKg));
      if (next <= cap) {
        const where = exercise.loadType === 'assisted' ? ' (dumbbell between your feet)' : '';
        return {
          kind: 'add_load',
          message:
            added === 0
              ? `Add +${formatKg(next)} kg${where}`
              : `Go up to +${formatKg(next)} kg added${where}`,
          suggestedAddedKg: next,
        };
      }
    }
    return ladderOrBeat(recent, exercise.perSide, weight, ladder);
  }

  // 3. Stalled: a set below repMin in 2 consecutive sessions.
  const prior = evaluated[1];
  if (prior && anyBelowMin(last.sets, item.repMin) && anyBelowMin(prior.sets, item.repMin)) {
    const worstShortfall = Math.max(...last.sets.map((s) => item.repMin - s.reps));
    const lower =
      isDumbbell && weight !== undefined ? prevWeight(weight, availableWeightsKg) : undefined;
    if (lower !== undefined && worstShortfall >= 2) {
      return { kind: 'drop', message: `Drop to ${formatKg(lower)} kg`, suggestedWeightKg: lower };
    }
    return { kind: 'hold', message: 'Hold load, focus on form', suggestedWeightKg: weight };
  }

  // 4. Default.
  return { kind: 'beat', message: BEAT, suggestedWeightKg: weight };
}
