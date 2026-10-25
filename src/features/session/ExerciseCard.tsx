import { forwardRef } from 'react';
import { Icon } from '../../components/Icon';
import type { Exercise, SessionItem, SetDraft, SetLog } from '../../data/types';
import { formatPrescription, formatSetLine } from '../../domain/format';
import type { Suggestion } from '../../domain/progression';
import { draftKey, type Slot } from '../../domain/session';
import { SetRow, type RowValues } from './SetRow';

export interface CardHandlers {
  rowValues: (itemIndex: number, setIndex: number) => RowValues;
  onDraft: (exerciseId: string, setIndex: number, patch: SetDraft) => void;
  onTick: (itemIndex: number, setIndex: number) => void;
  onEdit: (itemIndex: number, setIndex: number) => void;
  onCancelEdit: () => void;
  onTechniques: (itemIndex: number, setIndex: number) => void;
  onAddSet: (itemIndex: number) => void;
  onRemoveSet: (itemIndex: number) => void;
  onMore: (itemIndex: number) => void;
  onGuide: (itemIndex: number) => void;
  onApplySuggestion: (itemIndex: number, s: Suggestion) => void;
}

const SUGGESTION_STYLE: Partial<Record<Suggestion['kind'], string>> = {
  increase_weight: 'bg-accent text-on-accent',
  add_load: 'bg-accent text-on-accent',
  remove_band: 'bg-accent text-on-accent',
  ladder: 'bg-accent text-on-accent',
  deload: 'border border-warn text-warn',
  drop: 'border border-warn text-warn',
  hold: 'border border-warn text-warn',
};

export const ExerciseCard = forwardRef<
  HTMLElement,
  {
    item: SessionItem;
    itemIndex: number;
    exercise: Exercise;
    letter?: string;
    lastSets?: SetLog[];
    suggestion?: Suggestion;
    logs: Map<string, SetLog>;
    current?: Slot;
    editingKey: string | null;
    weights: readonly number[];
    handlers: CardHandlers;
  }
>(function ExerciseCard(
  {
    item,
    itemIndex,
    exercise,
    letter,
    lastSets,
    suggestion,
    logs,
    current,
    editingKey,
    weights,
    handlers,
  },
  ref,
) {
  const swapped = item.exerciseId !== item.programExerciseId;
  const applicable =
    suggestion &&
    (suggestion.suggestedWeightKg !== undefined ||
      suggestion.suggestedAddedKg !== undefined ||
      suggestion.suggestedTechnique !== undefined ||
      suggestion.kind === 'remove_band');
  const doneCount = Array.from({ length: item.sets }, (_, s) =>
    logs.has(draftKey(exercise.id, s)),
  ).filter(Boolean).length;

  return (
    <section
      ref={ref}
      aria-label={exercise.name}
      className="scroll-mt-20 rounded-2xl bg-surface px-2 pb-2 pt-3"
    >
      <div className="px-2">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => handlers.onGuide(itemIndex)}
            className="flex min-h-12 min-w-0 items-start gap-2 text-left"
          >
            {letter && (
              <span className="num mt-0.5 rounded-md bg-raised px-1.5 text-label font-bold">
                {letter}
              </span>
            )}
            <span className="text-lg font-bold leading-snug">
              {exercise.name}
              <Icon name="info" size={18} className="ml-1 inline align-[-3px] text-muted" />
            </span>
          </button>
          <span className="num shrink-0 pt-1 text-label text-muted">
            {doneCount}/{item.sets}
          </span>
        </div>
        <p className="text-label text-muted">
          {exercise.targets.join(' · ')}
          {swapped && ' · swapped'}
        </p>
        <p className="num mt-0.5 text-label">{formatPrescription(item, exercise.perSide)}</p>
        <p className="num mt-0.5 text-label text-muted">
          {lastSets && lastSets.length > 0
            ? `Last: ${formatSetLine(lastSets, exercise.loadType)}`
            : 'Last: no history yet'}
        </p>
        {suggestion && (
          <button
            type="button"
            disabled={!applicable}
            onClick={() => applicable && handlers.onApplySuggestion(itemIndex, suggestion)}
            className={`mt-2 inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-label font-semibold ${SUGGESTION_STYLE[suggestion.kind] ?? 'bg-raised text-text'}`}
            aria-label={`Suggestion: ${suggestion.message}${applicable ? '. Tap to apply.' : ''}`}
          >
            <Icon name="up" size={16} />
            {suggestion.message}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {Array.from({ length: item.sets }, (_, s) => {
          const key = draftKey(exercise.id, s);
          return (
            <SetRow
              key={key}
              label={letter ? `${letter}${s + 1}` : String(s + 1)}
              exercise={exercise}
              values={handlers.rowValues(itemIndex, s)}
              logged={logs.get(key)}
              editing={editingKey === key}
              current={current?.itemIndex === itemIndex && current.setIndex === s}
              weights={weights}
              onChange={(patch) => handlers.onDraft(exercise.id, s, patch)}
              onTick={() => handlers.onTick(itemIndex, s)}
              onEdit={() => handlers.onEdit(itemIndex, s)}
              onCancelEdit={handlers.onCancelEdit}
              onOpenTechniques={() => handlers.onTechniques(itemIndex, s)}
            />
          );
        })}
      </div>

      <div className="mt-1 flex items-center gap-1 text-label">
        <button
          type="button"
          onClick={() => handlers.onAddSet(itemIndex)}
          className="flex min-h-12 items-center gap-1 rounded-xl px-3 font-semibold text-accent"
        >
          <Icon name="plus" size={18} /> Add set
        </button>
        <button
          type="button"
          disabled={item.sets <= 1}
          onClick={() => handlers.onRemoveSet(itemIndex)}
          className="flex min-h-12 items-center gap-1 rounded-xl px-3 text-muted disabled:opacity-40"
        >
          <Icon name="minus" size={18} /> Remove set
        </button>
        <button
          type="button"
          onClick={() => handlers.onMore(itemIndex)}
          className="ml-auto flex min-h-12 items-center gap-1 rounded-xl px-3 text-muted"
          aria-label={`More options for ${exercise.name}`}
        >
          <Icon name="swap" size={18} /> Swap / more
        </button>
      </div>
    </section>
  );
});
