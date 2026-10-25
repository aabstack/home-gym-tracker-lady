import type { SetLike } from './format';
import {
  hitTarget,
  ladderFromSeed,
  nextLadderStep,
  nextWeight,
  prevWeight,
  suggestProgression,
  type HistorySession,
  type SuggestInput,
} from './progression';

const WEIGHTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];
const item = { sets: 3, repMin: 8, repMax: 12 };
const dumbbell = { loadType: 'dumbbell' as const, perSide: false };

function sets(
  weightKg: number | null,
  reps: number[],
  extra: Partial<SetLike> & { rir?: SetLike['rir'] } = {},
): SetLike[] {
  return reps.map((r, i) => ({ setIndex: i, weightKg, reps: r, rir: 2, techniques: [], ...extra }));
}

function session(s: SetLike[], isDeload = false): HistorySession {
  return { isDeload, sets: s };
}

function suggest(partial: Partial<SuggestInput>) {
  return suggestProgression({
    exercise: dumbbell,
    item,
    history: [],
    availableWeightsKg: WEIGHTS,
    ...partial,
  });
}

describe('hitTarget', () => {
  it('needs every prescribed set at repMax with RIR ≥ 1', () => {
    expect(hitTarget(sets(10, [12, 12, 12]), item)).toBe(true);
    expect(hitTarget(sets(10, [12, 12, 11]), item)).toBe(false);
    expect(hitTarget(sets(10, [12, 12, 12], { rir: 0 }), item)).toBe(false);
    expect(hitTarget(sets(10, [12, 12]), item)).toBe(false);
    expect(hitTarget(sets(10, [12, 12, 12, 6]), item)).toBe(true); // extra set ignored
  });
});

describe('weights', () => {
  it('finds next and previous available weights', () => {
    expect(nextWeight(10, WEIGHTS)).toBe(12);
    expect(nextWeight(11, WEIGHTS)).toBe(12);
    expect(nextWeight(20, WEIGHTS)).toBeUndefined();
    expect(prevWeight(10, WEIGHTS)).toBe(9);
    expect(prevWeight(2, WEIGHTS)).toBeUndefined();
  });
});

describe('suggestProgression', () => {
  it('first time: start message', () => {
    const s = suggest({});
    expect(s.kind).toBe('start');
    expect(s.message).toContain('8–12');
    const fixed = suggest({ item: { sets: 2, repMin: 12, repMax: 12 } });
    expect(fixed.message).toContain('for 12 reps');
  });

  it('deload session: keep weights, half the sets', () => {
    const s = suggest({ isDeload: true, history: [session(sets(14, [12, 12, 12]))] });
    expect(s).toEqual({
      kind: 'deload',
      message: 'Deload: keep weights, half the sets',
      suggestedWeightKg: 14,
    });
  });

  it('dumbbell step-up when target hit and a heavier dumbbell exists', () => {
    const s = suggest({ history: [session(sets(10, [12, 12, 12]))] });
    expect(s.kind).toBe('increase_weight');
    expect(s.message).toBe('Go up to 12 kg, aim for 8+ reps');
    expect(s.suggestedWeightKg).toBe(12);
  });

  it('ignores deload sessions when evaluating hit target', () => {
    const s = suggest({
      history: [session(sets(10, [12, 12]), true), session(sets(10, [12, 12, 9]))],
    });
    expect(s.kind).toBe('beat');
    expect(s.suggestedWeightKg).toBe(10);
  });

  it('only deload history → beat last time', () => {
    const s = suggest({ history: [session(sets(10, [12, 12]), true)] });
    expect(s.kind).toBe('beat');
  });

  it('at max dumbbell: ladder in order, skipping steps used in the last 2 sessions', () => {
    const top = (t: string[] = []) => session(sets(20, [12, 12, 12], { techniques: t }));
    expect(suggest({ history: [top()] })).toMatchObject({
      kind: 'ladder',
      suggestedTechnique: 'tempo',
      message: 'Next step: Tempo 4–5 s eccentric',
      suggestedWeightKg: 20,
    });
    expect(suggest({ history: [top(['tempo'])] }).suggestedTechnique).toBe('pause');
    expect(suggest({ history: [top(['pause']), top(['tempo'])] }).suggestedTechnique).toBe(
      '1.5 reps',
    );
    // Used 3 sessions ago no longer counts.
    expect(
      suggest({ history: [top(['pause']), top(['1.5 reps']), top(['tempo'])] }).suggestedTechnique,
    ).toBe('tempo');
    expect(suggest({ history: [top(['tempo', 'pause', '1.5 reps'])] }).suggestedTechnique).toBe(
      'unilateral',
    );
    expect(
      suggest({ history: [top(['tempo', 'pause', '1.5 reps', 'unilateral'])] }).suggestedTechnique,
    ).toBe('drop set');
    expect(
      suggest({ history: [top(['tempo', 'pause', '1.5 reps', 'unilateral', 'drop set'])] })
        .suggestedTechnique,
    ).toBe('rest-pause');
  });

  it('ladder skips unilateral for per-side exercises', () => {
    const s = suggest({
      exercise: { loadType: 'dumbbell', perSide: true },
      history: [session(sets(20, [12, 12, 12], { techniques: ['tempo', 'pause', '1.5 reps'] }))],
    });
    expect(s.suggestedTechnique).toBe('drop set');
  });

  it('ladder exhausted → beat last time', () => {
    const all = ['tempo', 'pause', '1.5 reps', 'unilateral', 'drop set', 'rest-pause'];
    const s = suggest({ history: [session(sets(20, [12, 12, 12], { techniques: all }))] });
    expect(s.kind).toBe('beat');
    expect(nextLadderStep([session(sets(20, [1], { techniques: all }))], false)).toBeUndefined();
  });

  it('band exercises go straight to the ladder', () => {
    const s = suggest({
      exercise: { loadType: 'band', perSide: true },
      item: { sets: 2, repMin: 12, repMax: 12 },
      history: [session(sets(null, [12, 12]))],
    });
    expect(s.kind).toBe('ladder');
    expect(s.suggestedTechnique).toBe('tempo');
  });

  describe('bodyweight / assisted path', () => {
    const assisted = { loadType: 'assisted' as const, perSide: false };
    const pull = { sets: 4, repMin: 5, repMax: 8 };

    it('drops band assist first', () => {
      const s = suggest({
        exercise: assisted,
        item: pull,
        history: [session(sets(null, [8, 8, 8, 8], { bandAssist: true }))],
      });
      expect(s.kind).toBe('remove_band');
    });

    it('then adds 2.5 kg', () => {
      const s = suggest({
        exercise: assisted,
        item: pull,
        history: [session(sets(null, [8, 8, 8, 8]))],
      });
      expect(s).toMatchObject({ kind: 'add_load', suggestedAddedKg: 2.5 });
      expect(s.message).toContain('between your feet');
    });

    it('keeps adding 2.5 kg on top of the last added load', () => {
      const s = suggest({
        exercise: { loadType: 'bodyweight', perSide: false },
        item: pull,
        history: [session(sets(null, [8, 8, 8, 8], { addedKg: 5 }))],
      });
      expect(s).toMatchObject({ kind: 'add_load', suggestedAddedKg: 7.5 });
      expect(s.message).toBe('Go up to +7.5 kg added');
    });

    it('then the ladder once added load exceeds the heaviest dumbbell', () => {
      const s = suggest({
        exercise: assisted,
        item: pull,
        history: [session(sets(null, [8, 8, 8, 8], { addedKg: 20 }))],
      });
      expect(s.kind).toBe('ladder');
    });

    it('band-assisted sets that miss the target get the default', () => {
      const s = suggest({
        exercise: assisted,
        item: pull,
        history: [session(sets(null, [8, 7, 6, 6], { bandAssist: true }))],
      });
      expect(s.kind).toBe('beat');
    });
  });

  describe('stall', () => {
    it('holds load when a set fell below repMin in 2 consecutive sessions', () => {
      const s = suggest({
        history: [session(sets(12, [9, 8, 7])), session(sets(12, [10, 8, 7]))],
      });
      expect(s).toMatchObject({
        kind: 'hold',
        message: 'Hold load, focus on form',
        suggestedWeightKg: 12,
      });
    });

    it('drops to the previous dumbbell when well short', () => {
      const s = suggest({
        history: [session(sets(12, [8, 7, 5])), session(sets(12, [9, 8, 7]))],
      });
      expect(s).toMatchObject({ kind: 'drop', message: 'Drop to 10 kg', suggestedWeightKg: 10 });
    });

    it('holds when no lighter dumbbell exists', () => {
      const s = suggest({
        history: [session(sets(2, [8, 7, 4])), session(sets(2, [9, 8, 5]))],
      });
      expect(s.kind).toBe('hold');
    });

    it('a single bad session is not a stall', () => {
      const s = suggest({
        history: [session(sets(12, [9, 8, 5])), session(sets(12, [10, 9, 8]))],
      });
      expect(s.kind).toBe('beat');
    });
  });

  it('default: beat last time', () => {
    const s = suggest({ history: [session(sets(12, [10, 9, 9]))] });
    expect(s).toEqual({
      kind: 'beat',
      message: 'Beat last time: +1 rep on any set',
      suggestedWeightKg: 12,
    });
  });
});

describe('program-specific rules (lady version)', () => {
  const herLadder = ladderFromSeed([
    { id: 'reps', label: 'Add reps to top of range' },
    { id: 'tempo', label: 'Tempo: 3–4 s lowering' },
    { id: 'pause', label: 'Pause 1–2 s in the stretch' },
    { id: '1.5 reps', label: '1.5 reps' },
    { id: 'unilateral', label: 'One side at a time' },
  ]);

  it('converts the seed ladder, dropping the "add reps" step', () => {
    expect(herLadder.map((s) => s.tag)).toEqual(['tempo', 'pause', '1.5 reps', 'unilateral']);
  });

  it('minTargetRir 2: sets at RIR 1 do not count as hitting the target', () => {
    expect(hitTarget(sets(10, [12, 12, 12], { rir: 1 }), item, 2)).toBe(false);
    expect(hitTarget(sets(10, [12, 12, 12], { rir: 2 }), item, 2)).toBe(true);
    const s = suggest({ history: [session(sets(8, [12, 12, 12], { rir: 1 }))], minTargetRir: 2 });
    expect(s.kind).toBe('beat');
  });

  it('caps dumbbell step-ups at the heaviest weight in her list (10 kg), then uses her ladder', () => {
    const light = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(
      suggest({ availableWeightsKg: light, history: [session(sets(9, [12, 12, 12]))] }),
    ).toMatchObject({ kind: 'increase_weight', suggestedWeightKg: 10 });
    const atCap = suggest({
      availableWeightsKg: light,
      ladder: herLadder,
      history: [session(sets(10, [12, 12, 12]))],
    });
    expect(atCap).toMatchObject({ kind: 'ladder', message: 'Next step: Tempo: 3–4 s lowering' });
  });

  it('maxAddedKg 0: bodyweight moves never get added weight, they climb the ladder', () => {
    const s = suggest({
      exercise: { loadType: 'bodyweight', perSide: true },
      item: { sets: 3, repMin: 10, repMax: 12 },
      history: [session(sets(null, [12, 12, 12]))],
      maxAddedKg: 0,
      ladder: herLadder,
    });
    expect(s).toMatchObject({ kind: 'ladder', suggestedTechnique: 'tempo' });
  });

  it('her ladder never suggests drop sets or rest-pause', () => {
    const all = ['tempo', 'pause', '1.5 reps', 'unilateral'];
    const s = suggest({
      ladder: herLadder,
      availableWeightsKg: [2, 4, 6],
      history: [session(sets(6, [12, 12, 12], { techniques: all }))],
    });
    expect(s.kind).toBe('beat');
  });
});
