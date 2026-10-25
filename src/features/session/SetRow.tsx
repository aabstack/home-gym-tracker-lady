import { useRef } from 'react';
import { Icon } from '../../components/Icon';
import { Segmented } from '../../components/Segmented';
import { Stepper } from '../../components/Stepper';
import type { Exercise, Rir, SetDraft, SetLog } from '../../data/types';
import { formatKg, formatLoad, formatRir, roundKg } from '../../domain/format';
import {
  BAND_ASSIST,
  decodeBodyweightLoad,
  encodeBodyweightLoad,
  stepBodyweightLoad,
  stepWeight,
} from '../../domain/session';

export interface RowValues {
  weightKg: number | null;
  addedKg: number;
  bandAssist: boolean;
  reps: number;
  rir: Rir;
  techniques: string[];
  note: string;
}

const RIR_OPTIONS = [0, 1, 2, 3, 4].map((v) => ({ value: v as Rir, label: formatRir(v) }));
const LONG_PRESS_MS = 500;
const WEIGHT_CLS = 'min-w-0 flex-[1.15] basis-[calc(100%-2rem)] @min-[19rem]:basis-0';

function parseKg(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 500 ? roundKg(n) : undefined;
}

function parseReps(text: string): number | undefined {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n >= 0 && n <= 200 ? n : undefined;
}

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
  onOpenTechniques,
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
  onOpenTechniques: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);

  if (logged && !editing) {
    const startPress = () => {
      timer.current = window.setTimeout(onEdit, LONG_PRESS_MS);
    };
    const cancelPress = () => window.clearTimeout(timer.current);
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Set ${label} logged: ${formatLoad(logged, exercise.loadType)} × ${logged.reps}, RIR ${formatRir(logged.rir)}. Long-press to edit.`}
        className="flex min-h-12 items-center gap-2 rounded-xl px-1 opacity-75"
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit();
          }
        }}
      >
        <span className="num w-7 shrink-0 text-center text-label font-semibold text-muted">
          {label}
        </span>
        <span className="num min-w-0 flex-1 truncate">
          {formatLoad(logged, exercise.loadType)} × {logged.reps}
          <span className="text-muted"> @ RIR {formatRir(logged.rir)}</span>
          {logged.techniques.length > 0 && (
            <span className="text-label text-muted"> · {logged.techniques.join(', ')}</span>
          )}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
          <Icon name="check" size={20} />
        </span>
      </div>
    );
  }

  const isBodyweight = exercise.loadType === 'bodyweight' || exercise.loadType === 'assisted';
  const bwLoad = encodeBodyweightLoad(values.addedKg, values.bandAssist);

  return (
    // Container queries: on narrow rows (large system font / small screens) the reps stepper
    // and the RIR selector drop onto their own lines instead of squashing the values.
    <div
      className={`@container rounded-xl p-1 ${current || editing ? 'bg-raised/60 ring-2 ring-accent/60' : ''}`}
      data-current={current || undefined}
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className="num w-7 shrink-0 text-center text-label font-semibold text-muted">
          {label}
        </span>
        {exercise.loadType === 'dumbbell' && (
          <Stepper<number | null>
            className={WEIGHT_CLS}
            label={`Set ${label} weight in kg`}
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
            className={WEIGHT_CLS}
            label={`Set ${label} load`}
            value={bwLoad}
            display={bwLoad === BAND_ASSIST ? 'Band' : bwLoad === 0 ? 'BW' : `+${formatKg(bwLoad)}`}
            editText={bwLoad > 0 ? formatKg(bwLoad) : ''}
            step={(dir, v) => stepBodyweightLoad(v, dir, exercise.loadType === 'assisted')}
            parse={(t) => {
              const kg = parseKg(t);
              return kg === undefined ? undefined : (kg ?? 0);
            }}
            onChange={(v) => onChange(decodeBodyweightLoad(v))}
          />
        )}
        {exercise.loadType === 'band' && (
          <span
            className={`flex h-12 items-center justify-center text-input font-semibold text-muted ${WEIGHT_CLS}`}
          >
            Band
          </span>
        )}
        <Stepper<number>
          className="min-w-0 flex-1 basis-full pl-8 @min-[19rem]:basis-0 @min-[19rem]:pl-0"
          label={`Set ${label} reps${exercise.perSide ? ' per side' : ''}`}
          value={values.reps}
          display={String(values.reps)}
          editText={String(values.reps)}
          step={(dir, v) => Math.max(0, v + dir)}
          parse={parseReps}
          onChange={(v) => onChange({ reps: v })}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={onOpenTechniques}
          aria-label={`Set ${label} techniques${values.techniques.length ? `: ${values.techniques.join(', ')}` : ''}`}
          className={`relative order-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl @min-[19rem]:order-none ${values.techniques.length || values.note ? 'bg-text text-bg' : 'bg-raised text-muted'}`}
        >
          <Icon name="tag" size={20} />
          {values.techniques.length > 0 && (
            <span className="num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[12px] font-bold text-on-accent">
              {values.techniques.length}
            </span>
          )}
        </button>
        <div className="order-1 flex min-w-0 flex-1 basis-full items-center gap-1 @min-[19rem]:order-none @min-[19rem]:basis-0">
          <span className="text-[12px] font-semibold text-muted" aria-hidden>
            RIR
          </span>
          <Segmented
            className="min-w-0 flex-1"
            label={`Set ${label} reps in reserve`}
            options={RIR_OPTIONS}
            value={values.rir}
            onChange={(v) => onChange({ rir: v })}
          />
        </div>
        {editing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Cancel edit"
            className="order-2 flex h-12 w-11 shrink-0 items-center justify-center rounded-xl bg-raised text-muted @min-[19rem]:order-none"
          >
            <Icon name="close" size={20} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onTick}
          aria-label={editing ? `Save set ${label}` : `Complete set ${label}`}
          className="order-3 flex h-12 min-w-14 flex-1 items-center justify-center rounded-xl bg-accent text-on-accent active:opacity-70 @min-[19rem]:order-none @min-[19rem]:flex-none"
        >
          <Icon name="check" size={26} />
        </button>
      </div>
    </div>
  );
}
