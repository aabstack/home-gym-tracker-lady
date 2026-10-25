import type { ProgramDay, SessionItem } from '../data/types';
import { prescribedSets } from './deload';
import { roundKg } from './format';

export function buildSessionItems(day: ProgramDay, isDeload: boolean): SessionItem[] {
  return day.items.map((it) => ({
    exerciseId: it.exerciseId,
    programExerciseId: it.exerciseId,
    sets: prescribedSets(it.sets, isDeload),
    repMin: it.repMin,
    repMax: it.repMax,
    restSec: it.restSec,
    tempo: it.tempo,
    ...(it.supersetGroup ? { supersetGroup: it.supersetGroup } : {}),
  }));
}

export interface Slot {
  itemIndex: number;
  setIndex: number;
}

export interface ItemGroup {
  supersetGroup?: string;
  itemIndexes: number[];
}

/** Consecutive items sharing a supersetGroup form one group; everything else is its own group. */
export function groupItems(items: readonly Pick<SessionItem, 'supersetGroup'>[]): ItemGroup[] {
  const groups: ItemGroup[] = [];
  items.forEach((it, i) => {
    const prev = groups[groups.length - 1];
    if (it.supersetGroup && prev?.supersetGroup === it.supersetGroup) prev.itemIndexes.push(i);
    else groups.push({ supersetGroup: it.supersetGroup, itemIndexes: [i] });
  });
  return groups;
}

/** Order in which sets are performed. Supersets alternate: A1, B1, A2, B2… */
export function setOrder(items: readonly Pick<SessionItem, 'sets' | 'supersetGroup'>[]): Slot[] {
  const order: Slot[] = [];
  for (const g of groupItems(items)) {
    const maxSets = Math.max(...g.itemIndexes.map((i) => items[i].sets));
    if (g.itemIndexes.length === 1) {
      const i = g.itemIndexes[0];
      for (let s = 0; s < items[i].sets; s++) order.push({ itemIndex: i, setIndex: s });
      continue;
    }
    for (let s = 0; s < maxSets; s++) {
      for (const i of g.itemIndexes)
        if (s < items[i].sets) order.push({ itemIndex: i, setIndex: s });
    }
  }
  return order;
}

/**
 * Next set to perform: the first unlogged set after `after` (the most recently logged set) in
 * performance order, wrapping around; without `after`, the first unlogged set.
 */
export function nextSlot(
  items: readonly Pick<SessionItem, 'sets' | 'supersetGroup' | 'exerciseId'>[],
  isLogged: (exerciseId: string, setIndex: number) => boolean,
  after?: { exerciseId: string; setIndex: number },
): Slot | undefined {
  const order = setOrder(items);
  const pos = after
    ? order.findIndex(
        (s) => items[s.itemIndex].exerciseId === after.exerciseId && s.setIndex === after.setIndex,
      )
    : -1;
  const rotated = pos >= 0 ? [...order.slice(pos + 1), ...order.slice(0, pos + 1)] : order;
  return rotated.find((s) => !isLogged(items[s.itemIndex].exerciseId, s.setIndex));
}

/**
 * Step a dumbbell weight to the next/previous available weight.
 * From blank, either direction starts at the middle of the list.
 */
export function stepWeight(
  current: number | null | undefined,
  dir: 1 | -1,
  available: readonly number[],
): number | null {
  const list = [...new Set(available)].sort((a, b) => a - b);
  if (list.length === 0) {
    const base = current ?? 0;
    return Math.max(0, roundKg(base + dir));
  }
  if (current === null || current === undefined) return list[Math.floor((list.length - 1) / 2)];
  if (dir === 1) return list.find((w) => w > current) ?? current;
  const lower = [...list].reverse().find((w) => w < current);
  return lower ?? current;
}

export function draftKey(exerciseId: string, setIndex: number): string {
  return `${exerciseId}:${setIndex}`;
}

export const WARMUP_MIN = 5;
/** Rough seconds of work per set (per-side moves do both sides). */
const WORK_SEC = { bilateral: 40, perSide: 75 };

/** Estimated session length in minutes (warm-up + work + rest), rounded to 5. */
export function estimateMinutes(
  items: readonly { sets: number; restSec: number; perSide: boolean }[],
): number {
  let sec = WARMUP_MIN * 60;
  for (const it of items) {
    sec += it.sets * ((it.perSide ? WORK_SEC.perSide : WORK_SEC.bilateral) + it.restSec);
  }
  return Math.max(5, Math.round(sec / 300) * 5);
}

/** Bodyweight load as one number: -1 band assist, 0 bodyweight, > 0 added kg. */
export const BAND_ASSIST = -1;
export const ADDED_STEP_KG = 2.5;

export function encodeBodyweightLoad(addedKg: number | undefined, bandAssist: boolean | undefined) {
  return bandAssist ? BAND_ASSIST : (addedKg ?? 0);
}

export function decodeBodyweightLoad(v: number): { addedKg: number; bandAssist: boolean } {
  return v < 0 ? { addedKg: 0, bandAssist: true } : { addedKg: roundKg(v), bandAssist: false };
}

/** Band ↔ BW ↔ +2.5 kg ↔ +5 kg … Band assist only exists for assisted exercises. */
export function stepBodyweightLoad(v: number, dir: 1 | -1, allowBand: boolean): number {
  if (dir === 1) return v < 0 ? 0 : roundKg(v + ADDED_STEP_KG);
  if (v > 0) return Math.max(0, roundKg(v - ADDED_STEP_KG));
  return allowBand ? BAND_ASSIST : v < 0 ? BAND_ASSIST : 0;
}
