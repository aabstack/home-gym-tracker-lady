import { format as dfFormat } from 'date-fns';
import { ar as arDateLocale } from 'date-fns/locale';
import { createContext, useContext } from 'react';
import type { Exercise, LoadType, ProgramDay, WarmupItem } from '../data/types';
import { formatKg, type SetLike } from '../domain/format';
import type { Suggestion } from '../domain/progression';
import {
  AR_DAYS,
  AR_EXERCISES,
  AR_LADDER,
  AR_MUSCLES,
  AR_PHASES,
  AR_TECHNIQUES,
  AR_WARMUP,
} from './content.ar';
import { ar } from './strings.ar';
import { en, type StringKey } from './strings.en';

export type Lang = 'en' | 'ar';
export const LANGS: readonly Lang[] = ['en', 'ar'];
export const LANG_STORAGE_KEY = 'gym-lang';

type Vars = Record<string, string | number>;

/** Saved choice (mirrored to localStorage so the first paint is already right), else the phone. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // ignore
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar')
    ? 'ar'
    : 'en';
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export interface I18n {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  t: (key: StringKey, vars?: Vars) => string;
  date: (ts: number | Date, pattern: string) => string;
  exName: (ex: Pick<Exercise, 'id' | 'name'>) => string;
  exText: (ex: Exercise, field: 'setup' | 'execution' | 'progression') => string;
  warmup: (w: WarmupItem) => { name: string; detail: string; dose: string };
  dayName: (d: Pick<ProgramDay, 'id' | 'name'>) => string;
  dayFocus: (d: Pick<ProgramDay, 'id' | 'focus'>) => string;
  muscle: (m: string) => string;
  muscles: (list: readonly string[]) => string;
  technique: (tag: string) => string;
  phase: (label: string) => string;
  load: (set: Pick<SetLike, 'weightKg' | 'addedKg' | 'bandAssist'>, loadType?: LoadType) => string;
  setLine: (sets: readonly SetLike[], loadType?: LoadType) => string;
  prescription: (
    item: { sets: number; repMin: number; repMax: number; tempo: string; restSec: number },
    perSide: boolean,
  ) => string;
  tempoWords: (tempo: string) => string;
  duration: (ms: number) => string;
  suggestion: (s: Suggestion, item: { repMin: number; repMax: number }) => string;
}

export function makeI18n(lang: Lang): I18n {
  const isAr = lang === 'ar';
  const dict: Record<StringKey, string> = isAr ? ar : en;
  const t = (key: StringKey, vars?: Vars) => fill(dict[key] ?? en[key], vars);

  const load: I18n['load'] = (set, loadType) => {
    if (set.weightKg !== null) return t('fmt.kg', { n: formatKg(set.weightKg) });
    if (loadType === 'band') return t('fmt.band');
    if (set.bandAssist) return t('fmt.bwBand');
    if (set.addedKg) return t('fmt.bwPlus', { n: formatKg(set.addedKg) });
    return t('fmt.bw');
  };

  const range = (min: number, max: number) => (min === max ? `${max}` : `${min}–${max}`);

  return {
    lang,
    dir: isAr ? 'rtl' : 'ltr',
    t,
    date: (ts, pattern) => dfFormat(ts, pattern, isAr ? { locale: arDateLocale } : undefined),
    exName: (ex) => (isAr ? AR_EXERCISES[ex.id]?.name : undefined) ?? ex.name,
    exText: (ex, field) => (isAr ? AR_EXERCISES[ex.id]?.[field] : undefined) ?? ex[field],
    warmup: (w) => (isAr ? AR_WARMUP[w.id] : undefined) ?? w,
    dayName: (d) => (isAr ? AR_DAYS[d.id]?.name : undefined) ?? d.name,
    dayFocus: (d) => (isAr ? AR_DAYS[d.id]?.focus : undefined) ?? d.focus,
    muscle: (m) => (isAr ? AR_MUSCLES[m] : undefined) ?? m,
    muscles: (list) => list.map((m) => (isAr ? (AR_MUSCLES[m] ?? m) : m)).join(' · '),
    technique: (tag) => (isAr ? AR_TECHNIQUES[tag] : undefined) ?? tag,
    phase: (label) => (isAr ? AR_PHASES[label] : undefined) ?? label,
    load,
    // Kept deliberately simple: "6 kg × 12, 12, 11" (effort is in the set options).
    setLine: (sets, loadType) => {
      if (sets.length === 0) return '';
      const sorted = [...sets].sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0));
      const loads = sorted.map((s) => load(s, loadType));
      return loads.every((l) => l === loads[0])
        ? `${loads[0]} × ${sorted.map((s) => s.reps).join(', ')}`
        : sorted.map((s, i) => `${loads[i]} × ${s.reps}`).join('، ');
    },
    prescription: (item, perSide) => {
      const rest = item.restSec > 0 ? t('fmt.rest', { n: item.restSec }) : t('fmt.noRest');
      return `${item.sets} × ${range(item.repMin, item.repMax)}${perSide ? t('fmt.perSide') : ''} · ${t('fmt.tempo', { t: item.tempo })} · ${rest}`;
    },
    tempoWords: (tempo) => {
      const p = tempo.split('-').map((x) => x.trim());
      if (p.length !== 4 || p.some((x) => x === '' || Number.isNaN(Number(x)))) return tempo;
      return t('fmt.tempoWords', { a: p[0], b: p[1], c: p[2], d: p[3] });
    },
    duration: (ms) => {
      const total = Math.max(0, Math.round(ms / 60_000));
      const h = Math.floor(total / 60);
      return h > 0 ? t('fmt.hMin', { h, m: total % 60 }) : t('fmt.min', { m: total });
    },
    suggestion: (s, item) => {
      switch (s.kind) {
        case 'start':
          return t('sug.start', { range: range(item.repMin, item.repMax) });
        case 'deload':
          return t('sug.deload');
        case 'increase_weight':
          return t('sug.increase', { kg: formatKg(s.suggestedWeightKg ?? 0), min: item.repMin });
        case 'remove_band':
          return t('sug.removeBand');
        case 'add_load':
          return t('sug.addLoad', { kg: formatKg(s.suggestedAddedKg ?? 0) });
        case 'ladder': {
          const fallback = s.message.replace(/^Next step: /, '');
          const label =
            (isAr && s.suggestedTechnique ? AR_LADDER[s.suggestedTechnique] : undefined) ??
            fallback;
          return t('sug.ladder', { label });
        }
        case 'hold':
          return t('sug.hold');
        case 'drop':
          return t('sug.drop', { kg: formatKg(s.suggestedWeightKg ?? 0) });
        default:
          return t('sug.beat');
      }
    },
  };
}

/** English unless a provider says otherwise (tests render components without one). */
export const I18nContext = createContext<I18n>(makeI18n('en'));

export function useI18n(): I18n {
  return useContext(I18nContext);
}
