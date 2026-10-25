import { Icon } from '../../components/Icon';
import { Stepper } from '../../components/Stepper';
import type { Exercise, Rir, SetDraft, SetLog } from '../../data/types';
import { formatKg, roundKg } from '../../domain/format';
import {
  BAND_ASSIST,
  decodeBodyweightLoad,
  encodeBodyweightLoad,
  stepBodyweightLoad,
  stepWeight,
} from '../../domain/session';
import { useI18n } from '../../i18n/i18n';

export interface RowValues {
  weightKg: number | null;
  addedKg: number;
  bandAssist: boolean;
  reps: number;
  rir: Rir;
  techniques: string[];
  note: string;
}

/** Default effort (reps in reserve) when she doesn't open the set options. */
export const DEFAULT_RIR: Rir = 2;

// Narrow rows (large system font): weight on one line, reps + tick on the next.
const WEIGHT_CLS = 'min-w-0 flex-1 basis-[calc(100%-2.5rem)] @min-[19rem]:basis-0';
const REPS_CLS = 'min-w-0 flex-1 basis-[calc(100%-3.5rem)] @min-[19rem]:basis-0';

function parseKg(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.').replace('٫', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 500 ? roundKg(n) : undefined;
}

function parseReps(text: string): number | undefined {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n >= 0 && n <= 200 ? n : undefined;
}

/**
 * One set = one line: [set no.] [weight] [reps] [✓].
 * Effort (RIR), technique tags and a note live behind the set number.
 */
export function SetRow({
  label,
  exercise,
  values,
  logged,
  editing,
  current,
  weights,
  onChange,
  onTick,
  onEdit,
  onCancelEdit,
  onOpenOptions,
}: {
  label: string;
  exercise: Exercise;
  values: RowValues;
  logged?: SetLog;
  editing: boolean;
  current: boolean;
  weights: readonly number[];
  onChange: (patch: SetDraft) => void;
  onTick: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onOpenOptions: () => void;
}) {
  const { t, load } = useI18n();

  if (logged && !editing) {
    const loadText = load(logged, exercise.loadType);
    return (
      <button
        type="button"
        onClick={onEdit}
        aria-label={t('set.loggedAria', { n: label, load: loadText, reps: logged.reps })}
        className="flex min-h-12 w-full items-center gap-1 rounded-xl px-1 text-start opacity-80 active:bg-raised"
      >
        <span className="num w-8 shrink-0 text-center text-label font-semibold text-muted">
          {label}
        </span>
        <span className="num min-w-0 flex-1 truncate text-lg">
          {loadText} × {logged.reps}
        </span>
        <span className="flex h-10 w-12 shrink-0 items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon name="check" size={20} />
          </span>
        </span>
      </button>
    );
  }

  const isBodyweight = exercise.loadType === 'bodyweight' || exercise.loadType === 'assisted';
  const bwLoad = encodeBodyweightLoad(values.addedKg, values.bandAssist);
  const hasExtras =
    values.techniques.length > 0 || values.note !== '' || values.rir !== DEFAULT_RIR;

  return (
    <div
      className={`@container rounded-xl p-1 ${current || editing ? 'bg-raised/60 ring-2 ring-accent/60' : ''}`}
      data-current={current || undefined}
    >
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={onOpenOptions}
          aria-label={t('set.optionsAria', { n: label })}
          className="relative flex h-12 w-8 shrink-0 items-center justify-center rounded-lg text-label font-bold text-muted active:bg-raised"
        >
          <span className="num">{label}</span>
          <span
            aria-hidden
            className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${hasExtras ? 'bg-accent' : 'bg-line'}`}
          />
        </button>

        {exercise.loadType === 'dumbbell' && (
          <Stepper<number | null>
            compact
            className={WEIGHT_CLS}
            label={t('set.weightAria', { n: label })}
            value={values.weightKg}
            display={values.weightKg === null ? '–' : formatKg(values.weightKg)}
            editText={values.weightKg === null ? '' : formatKg(values.weightKg)}
            step={(dir, v) => stepWeight(v, dir, weights)}
            parse={parseKg}
            onChange={(v) => onChange({ weightKg: v })}
          />
        )}
        {isBodyweight && (
          <Stepper<number>
            compact
            className={WEIGHT_CLS}
            label={t('set.loadAria', { n: label })}
            value={bwLoad}
            display={
              bwLoad === BAND_ASSIST ? t('fmt.band') : bwLoad === 0 ? '—' : `+${formatKg(bwLoad)}`
            }
            editText={bwLoad > 0 ? formatKg(bwLoad) : ''}
            step={(dir, v) => stepBodyweightLoad(v, dir, exercise.loadType === 'assisted')}
            parse={(text) => {
              const kg = parseKg(text);
              return kg === undefined ? undefined : (kg ?? 0);
            }}
            onChange={(v) => onChange(decodeBodyweightLoad(v))}
          />
        )}
        {exercise.loadType === 'band' && (
          <span
            className={`flex h-12 items-center justify-center rounded-xl bg-raised/50 font-semibold text-muted ${WEIGHT_CLS}`}
          >
            {t('fmt.band')}
          </span>
        )}

        <Stepper<number>
          compact
          className={REPS_CLS}
          label={t(exercise.perSide ? 'set.repsSideAria' : 'set.repsAria', { n: label })}
          value={values.reps}
          display={String(values.reps)}
          editText={String(values.reps)}
          step={(dir, v) => Math.max(0, v + dir)}
          parse={parseReps}
          onChange={(v) => onChange({ reps: v })}
        />

        <button
          type="button"
          onClick={onTick}
          aria-label={t(editing ? 'set.save' : 'set.complete', { n: label })}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent active:opacity-70"
        >
          <Icon name="check" size={26} />
        </button>
      </div>
      {editing && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="mt-1 flex min-h-10 w-full items-center justify-center gap-1 text-label text-muted"
        >
          <Icon name="close" size={16} /> {t('set.cancelEdit')}
        </button>
      )}
    </div>
  );
}
