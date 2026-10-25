import { programSeed } from '../data/seed';
import { TECHNIQUES } from '../data/types';
import { DEMOS, WARMUP_DEMOS, type Demo } from '../features/exercise/demos';
import {
  AR_DAYS,
  AR_EXERCISES,
  AR_LADDER,
  AR_MUSCLES,
  AR_PHASES,
  AR_TECHNIQUES,
  AR_WARMUP,
} from './content.ar';
import { makeI18n } from './i18n';
import { ar } from './strings.ar';
import { en, type StringKey } from './strings.en';

const ARABIC = /[؀-ۿ]/;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Arabic translations are complete', () => {
  it('every UI string uses the same placeholders as the English one', () => {
    for (const key of Object.keys(en) as StringKey[]) {
      expect(placeholders(ar[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it.each(programSeed.exercises.map((e) => [e.id]))('exercise %s is translated', (id) => {
    const tr = AR_EXERCISES[id];
    expect(tr, id).toBeDefined();
    for (const field of ['name', 'setup', 'execution', 'progression'] as const) {
      expect(tr[field], `${id}.${field}`).toMatch(ARABIC);
    }
  });

  it('warm-up items, days, muscles, techniques and ladder steps are translated', () => {
    for (const w of programSeed.warmup) expect(AR_WARMUP[w.id]?.name, w.id).toMatch(ARABIC);
    for (const d of programSeed.days) expect(AR_DAYS[d.id]?.focus, d.id).toMatch(ARABIC);
    for (const m of new Set(programSeed.exercises.flatMap((e) => e.targets))) {
      expect(AR_MUSCLES[m], m).toMatch(ARABIC);
    }
    for (const t of TECHNIQUES) expect(AR_TECHNIQUES[t], t).toMatch(ARABIC);
    for (const step of programSeed.progressionLadder)
      expect(AR_LADDER[step.id], step.id).toMatch(ARABIC);
  });

  it('every animation step label shown to her is translated', () => {
    const labels = new Set<string>(['Lower', 'Lift', 'Pause', 'Hold']);
    const collect = (d: Demo) => {
      d.labels.forEach((l) => labels.add(l));
      d.custom?.forEach((c) => labels.add(c.label));
    };
    for (const e of programSeed.exercises) collect(DEMOS[e.id]);
    for (const list of Object.values(WARMUP_DEMOS)) {
      for (const w of list) {
        collect(w.demo);
        if (w.title) labels.add(w.title);
      }
    }
    for (const l of labels) expect(AR_PHASES[l], l).toMatch(ARABIC);
  });
});

describe('formatting in both languages', () => {
  const enI = makeI18n('en');
  const arI = makeI18n('ar');
  const item = { sets: 3, repMin: 10, repMax: 15, tempo: '3-1-1-0', restSec: 75 };

  it('prescriptions, tempo and durations', () => {
    expect(enI.prescription(item, true)).toBe('3 × 10–15 / side · Tempo 3-1-1-0 · Rest 75s');
    expect(arI.prescription(item, false)).toBe('3 × 10–15 · الإيقاع 3-1-1-0 · راحة 75 ث');
    expect(arI.prescription({ ...item, restSec: 0 }, false)).toContain('بدون راحة');
    expect(enI.tempoWords('3-1-1-0')).toBe('3 s down, 1 s pause, 1 s up, 0 s at top');
    expect(arI.tempoWords('3-1-1-0')).toMatch(ARABIC);
    expect(arI.tempoWords('bad')).toBe('bad');
    expect(enI.duration(75 * 60_000)).toBe('1 h 15 min');
    expect(arI.duration(45 * 60_000)).toBe('45 د');
  });

  it('loads and the last-time line', () => {
    const sets = [
      { setIndex: 0, weightKg: 6, reps: 12, rir: 2 as const },
      { setIndex: 1, weightKg: 6, reps: 11, rir: 2 as const },
    ];
    expect(enI.setLine(sets)).toBe('6 kg × 12, 11');
    expect(arI.setLine(sets)).toBe('6 كغ × 12, 11');
    expect(enI.load({ weightKg: null })).toBe('BW');
    expect(arI.load({ weightKg: null }, 'band')).toBe('مطاط');
    expect(enI.load({ weightKg: null, addedKg: 2.5 })).toBe('BW +2.5 kg');
    expect(enI.setLine([])).toBe('');
  });

  it('suggestions for every kind', () => {
    const r = { repMin: 10, repMax: 15 };
    expect(enI.suggestion({ kind: 'increase_weight', message: '', suggestedWeightKg: 7 }, r)).toBe(
      'Go up to 7 kg, aim for 10+ reps',
    );
    expect(
      arI.suggestion(
        {
          kind: 'ladder',
          message: 'Next step: Tempo: 3–4 s lowering',
          suggestedTechnique: 'tempo',
        },
        r,
      ),
    ).toBe('الخطوة التالية: الإيقاع: نزول خلال 3–4 ثوانٍ');
    expect(enI.suggestion({ kind: 'ladder', message: 'Next step: Tempo: 3–4 s lowering' }, r)).toBe(
      'Next step: Tempo: 3–4 s lowering',
    );
    for (const kind of [
      'start',
      'deload',
      'remove_band',
      'add_load',
      'hold',
      'drop',
      'beat',
    ] as const) {
      expect(arI.suggestion({ kind, message: '' }, r), kind).toMatch(ARABIC);
    }
  });

  it('content falls back to English when no translation exists', () => {
    const ex = { id: 'unknown', name: 'Mystery Move' };
    expect(arI.exName(ex)).toBe('Mystery Move');
    expect(arI.muscle('Calves')).toBe('Calves');
    expect(arI.phase('Wiggle')).toBe('Wiggle');
    expect(enI.dir).toBe('ltr');
    expect(arI.dir).toBe('rtl');
    expect(arI.date(new Date(2026, 9, 25), 'd MMMM')).toMatch(ARABIC);
  });
});
