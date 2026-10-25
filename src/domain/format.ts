import type { LoadType, Rir, SetLog } from '../data/types';

export type SetLike = Pick<SetLog, 'weightKg' | 'reps' | 'rir'> &
  Partial<Pick<SetLog, 'setIndex' | 'addedKg' | 'bandAssist' | 'techniques'>>;

/** Round to the app's 0.25 kg precision. */
export function roundKg(kg: number): number {
  return Math.round(kg * 4) / 4;
}

export function formatKg(kg: number): string {
  return String(roundKg(kg));
}

export function formatRir(rir: Rir | number): string {
  return rir >= 4 ? '4+' : String(rir);
}

/** "12.5 kg", "BW", "BW +5 kg", "BW (band)" or "Band" (band exercises). */
export function formatLoad(
  set: Pick<SetLike, 'weightKg' | 'addedKg' | 'bandAssist'>,
  loadType?: LoadType,
): string {
  if (set.weightKg !== null) return `${formatKg(set.weightKg)} kg`;
  if (loadType === 'band') return 'Band';
  if (set.bandAssist) return 'BW (band)';
  if (set.addedKg) return `BW +${formatKg(set.addedKg)} kg`;
  return 'BW';
}

/** "12.5 kg × 12, 12, 11 @ RIR 2" (RIR of the last set). Mixed loads are listed per set. */
export function formatSetLine(sets: readonly SetLike[], loadType?: LoadType): string {
  if (sets.length === 0) return '';
  const sorted = [...sets].sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0));
  const loads = sorted.map((s) => formatLoad(s, loadType));
  const sameLoad = loads.every((l) => l === loads[0]);
  const body = sameLoad
    ? `${loads[0]} × ${sorted.map((s) => s.reps).join(', ')}`
    : sorted.map((s, i) => `${loads[i]} × ${s.reps}`).join(', ');
  return `${body} @ RIR ${formatRir(sorted[sorted.length - 1].rir)}`;
}

/** "3-1-1-0" → "3 s down, 1 s pause, 1 s up, 0 s at top". */
export function tempoToWords(tempo: string): string {
  const parts = tempo.split('-').map((p) => p.trim());
  if (parts.length !== 4 || parts.some((p) => p === '' || Number.isNaN(Number(p)))) return tempo;
  const [down, pause, up, top] = parts;
  return `${down} s down, ${pause} s pause, ${up} s up, ${top} s at top`;
}

/** "3 × 10–12 / leg · Tempo 3-1-1-0 · Rest 90s" */
export function formatPrescription(
  item: { sets: number; repMin: number; repMax: number; tempo: string; restSec: number },
  perSide: boolean,
): string {
  const reps = item.repMin === item.repMax ? `${item.repMax}` : `${item.repMin}–${item.repMax}`;
  const side = perSide ? ' / side' : '';
  const rest = item.restSec > 0 ? `Rest ${item.restSec}s` : 'No rest → next';
  return `${item.sets} × ${reps}${side} · Tempo ${item.tempo} · ${rest}`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
