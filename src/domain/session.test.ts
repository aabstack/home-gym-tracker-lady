import type { ProgramDay } from '../data/types';
import {
  BAND_ASSIST,
  buildSessionItems,
  decodeBodyweightLoad,
  encodeBodyweightLoad,
  stepBodyweightLoad,
  draftKey,
  estimateMinutes,
  groupItems,
  nextSlot,
  setOrder,
  stepWeight,
} from './session';

const day: ProgramDay = {
  id: 'C',
  name: 'C',
  focus: '',
  order: 3,
  items: [
    { exerciseId: 'a', sets: 3, repMin: 8, repMax: 12, restSec: 90, tempo: '3-1-1-0' },
    {
      exerciseId: 'curl',
      sets: 3,
      repMin: 12,
      repMax: 15,
      restSec: 0,
      tempo: '3-0-1-0',
      supersetGroup: 'arms',
    },
    {
      exerciseId: 'tri',
      sets: 2,
      repMin: 12,
      repMax: 15,
      restSec: 60,
      tempo: '3-0-1-0',
      supersetGroup: 'arms',
    },
  ],
};

describe('session helpers', () => {
  it('builds items, halving sets on deload', () => {
    const items = buildSessionItems(day, false);
    expect(items.map((i) => i.sets)).toEqual([3, 3, 2]);
    expect(items[0]).toMatchObject({ exerciseId: 'a', programExerciseId: 'a' });
    expect(items[0]).not.toHaveProperty('supersetGroup');
    expect(items[1].supersetGroup).toBe('arms');
    expect(buildSessionItems(day, true).map((i) => i.sets)).toEqual([2, 2, 1]);
  });

  it('groups consecutive superset items', () => {
    expect(groupItems(day.items)).toEqual([
      { supersetGroup: undefined, itemIndexes: [0] },
      { supersetGroup: 'arms', itemIndexes: [1, 2] },
    ]);
  });

  it('alternates superset sets A1, B1, A2, B2…', () => {
    expect(setOrder(day.items)).toEqual([
      { itemIndex: 0, setIndex: 0 },
      { itemIndex: 0, setIndex: 1 },
      { itemIndex: 0, setIndex: 2 },
      { itemIndex: 1, setIndex: 0 },
      { itemIndex: 2, setIndex: 0 },
      { itemIndex: 1, setIndex: 1 },
      { itemIndex: 2, setIndex: 1 },
      { itemIndex: 1, setIndex: 2 },
    ]);
  });

  it('finds the next unlogged slot', () => {
    const logged = new Set(['a:0', 'a:1', 'a:2', 'curl:0']);
    expect(nextSlot(day.items, (e, s) => logged.has(draftKey(e, s)))).toEqual({
      itemIndex: 2,
      setIndex: 0,
    });
    expect(nextSlot(day.items, () => true)).toBeUndefined();
  });

  it('continues from the most recently logged set, wrapping around', () => {
    const logged = new Set(['curl:0', 'tri:0']);
    const isLogged = (e: string, s: number) => logged.has(draftKey(e, s));
    // After B1 comes A2, even though exercise "a" is untouched.
    expect(nextSlot(day.items, isLogged, { exerciseId: 'tri', setIndex: 0 })).toEqual({
      itemIndex: 1,
      setIndex: 1,
    });
    // Last slot logged → wrap to the first unlogged set.
    logged.add('curl:2');
    expect(nextSlot(day.items, isLogged, { exerciseId: 'curl', setIndex: 2 })).toEqual({
      itemIndex: 0,
      setIndex: 0,
    });
    // Unknown "after" falls back to the first unlogged set.
    expect(nextSlot(day.items, isLogged, { exerciseId: 'gone', setIndex: 0 })).toEqual({
      itemIndex: 0,
      setIndex: 0,
    });
  });

  it('steps weights through the available list', () => {
    const list = [2, 4, 6, 10, 12];
    expect(stepWeight(6, 1, list)).toBe(10);
    expect(stepWeight(6, -1, list)).toBe(4);
    expect(stepWeight(7, 1, list)).toBe(10);
    expect(stepWeight(7, -1, list)).toBe(6);
    expect(stepWeight(12, 1, list)).toBe(12);
    expect(stepWeight(2, -1, list)).toBe(2);
    expect(stepWeight(null, 1, list)).toBe(6);
    expect(stepWeight(undefined, -1, list)).toBe(6);
    expect(stepWeight(5, 1, [])).toBe(6);
    expect(stepWeight(0, -1, [])).toBe(0);
  });

  it('estimates duration rounded to 5 minutes', () => {
    expect(estimateMinutes([])).toBe(5);
    // 5 min warm-up + 3 × (40 + 90) s = 11.5 min → 10
    expect(estimateMinutes([{ sets: 3, restSec: 90, perSide: false }])).toBe(10);
    // 5 min + 3 × (75 + 90) s = 13.25 min → 15
    expect(estimateMinutes([{ sets: 3, restSec: 90, perSide: true }])).toBe(15);
  });

  it('steps bodyweight load through band, BW and added kg', () => {
    expect(stepBodyweightLoad(0, -1, true)).toBe(BAND_ASSIST);
    expect(stepBodyweightLoad(0, -1, false)).toBe(0);
    expect(stepBodyweightLoad(BAND_ASSIST, -1, true)).toBe(BAND_ASSIST);
    expect(stepBodyweightLoad(BAND_ASSIST, 1, true)).toBe(0);
    expect(stepBodyweightLoad(0, 1, true)).toBe(2.5);
    expect(stepBodyweightLoad(5, -1, false)).toBe(2.5);
    expect(stepBodyweightLoad(1, -1, false)).toBe(0);
    expect(encodeBodyweightLoad(5, false)).toBe(5);
    expect(encodeBodyweightLoad(undefined, true)).toBe(BAND_ASSIST);
    expect(encodeBodyweightLoad(undefined, undefined)).toBe(0);
    expect(decodeBodyweightLoad(BAND_ASSIST)).toEqual({ addedKg: 0, bandAssist: true });
    expect(decodeBodyweightLoad(7.5)).toEqual({ addedKg: 7.5, bandAssist: false });
  });
});
