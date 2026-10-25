import { forwardRef } from 'react';
import { Icon } from '../../components/Icon';
import type { Exercise, SessionItem, SetDraft, SetLog } from '../../data/types';
import type { Suggestion } from '../../domain/progression';
import { draftKey, type Slot } from '../../domain/session';
import { useI18n } from '../../i18n/i18n';
import { SetRow, type RowValues } from './SetRow';

export interface CardHandlers {
  rowValues: (itemIndex: number, setIndex: number) => RowValues;
  onDraft: (exerciseId: string, setIndex: number, patch: SetDraft) => void;
  onTick: (itemIndex: number, setIndex: number) => void;
  onEdit: (itemIndex: number, setIndex: number) => void;
  onCancelEdit: () => void;
  onOptions: (itemIndex: number, setIndex: number) => void;
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
  const i18n = useI18n();
  const { t } = i18n;
  const name = i18n.exName(exercise);
  const swapped = item.exerciseId !== item.programExerciseId;
  const applicable =
    suggestion &&
    (suggestion.suggestedWeightKg !== undefined ||
      suggestion.suggestedAddedKg !== undefined ||
      suggestion.suggestedTechnique !== undefined ||
      suggestion.kind === 'remove_band');
  const suggestionText = suggestion ? i18n.suggestion(suggestion, item) : '';
  const doneCount = Array.from({ length: item.sets }, (_, s) =>
    logs.has(draftKey(exercise.id, s)),
  ).filter(Boolean).length;
  const weightHeading = exercise.loadType === 'dumbbell' ? t('card.colWeight') : t('card.colLoad');

  return (
    <section
      ref={ref}
      aria-label={name}
      className="scroll-mt-20 rounded-2xl bg-surface px-2 pb-2 pt-3"
    >
      <div className="px-2">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => handlers.onGuide(itemIndex)}
            className="flex min-h-12 min-w-0 items-start gap-2 text-start"
          >
            {letter && (
              <span className="num mt-0.5 rounded-md bg-raised px-1.5 text-label font-bold">
                {letter}
              </span>
            )}
            <span className="text-lg font-bold leading-snug">
              {name}
              <Icon name="info" size={18} className="ms-1 inline align-[-3px] text-muted" />
            </span>
          </button>
          <span className="num shrink-0 pt-1 text-label text-muted" dir="ltr">
            {doneCount}/{item.sets}
          </span>
        </div>
        <p className="text-label text-muted">
          {i18n.muscles(exercise.targets)}
          {swapped && ` · ${t('card.swapped')}`}
        </p>
        <p className="num mt-0.5 text-label">{i18n.prescription(item, exercise.perSide)}</p>
        <p className="num mt-0.5 text-label text-muted">
          {lastSets && lastSets.length > 0
            ? t('card.last', { line: i18n.setLine(lastSets, exercise.loadType) })
            : t('card.lastNone')}
        </p>
        {suggestion && (
          <button
            type="button"
            disabled={!applicable}
            onClick={() => applicable && handlers.onApplySuggestion(itemIndex, suggestion)}
            className={`mt-2 inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-start text-label font-semibold ${SUGGESTION_STYLE[suggestion.kind] ?? 'bg-raised text-text'}`}
            aria-label={`${t('card.suggestion', { msg: suggestionText })}${applicable ? ` ${t('card.tapApply')}` : ''}`}
          >
            <Icon name="up" size={16} />
            {suggestionText}
          </button>
        )}
      </div>

      <div className="@container mt-2">
        {/* Column headings, aligned with the set rows (hidden when rows wrap on narrow screens). */}
        <div
          aria-hidden
          className="hidden items-end gap-1 px-1 pb-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted @min-[19.5rem]:flex"
        >
          <span className="w-8 shrink-0 text-center">{t('card.colSet')}</span>
          <span className="min-w-0 flex-1 text-center">{weightHeading}</span>
          <span className="min-w-0 flex-1 text-center">
            {t(exercise.perSide ? 'card.colRepsSide' : 'card.colReps')}
          </span>
          <span className="w-12 shrink-0" />
        </div>
        <div className="flex flex-col gap-1">
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
                onOpenOptions={() => handlers.onOptions(itemIndex, s)}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-1 text-label">
        <button
          type="button"
          onClick={() => handlers.onAddSet(itemIndex)}
          className="flex min-h-12 items-center gap-1 whitespace-nowrap rounded-xl px-2 font-semibold text-accent"
        >
          <Icon name="plus" size={18} /> {t('card.addSet')}
        </button>
        <button
          type="button"
          disabled={item.sets <= 1}
          onClick={() => handlers.onRemoveSet(itemIndex)}
          className="flex min-h-12 items-center gap-1 whitespace-nowrap rounded-xl px-2 text-muted disabled:opacity-40"
        >
          <Icon name="minus" size={18} /> {t('card.removeSet')}
        </button>
        <button
          type="button"
          onClick={() => handlers.onMore(itemIndex)}
          className="ms-auto flex min-h-12 items-center gap-1 whitespace-nowrap rounded-xl px-2 text-muted"
          aria-label={t('card.moreAria', { name })}
        >
          <Icon name="swap" size={18} /> {t('card.more')}
        </button>
      </div>
    </section>
  );
});
