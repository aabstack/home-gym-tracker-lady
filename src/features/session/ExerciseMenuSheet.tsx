import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import type { Exercise } from '../../data/types';

/** Swap to another exercise with the same movement pattern, open the guide, or remove the exercise. */
export function ExerciseMenuSheet({
  exercise,
  alternatives,
  onSwap,
  onGuide,
  onRemove,
  onClose,
}: {
  exercise: Exercise | null;
  alternatives: Exercise[];
  onSwap: (to: Exercise) => void;
  onGuide: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={exercise !== null} onClose={onClose} title={exercise?.name ?? ''}>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onGuide}
          className="flex min-h-14 items-center gap-3 rounded-2xl bg-raised px-4 text-left"
        >
          <Icon name="info" /> Exercise guide
        </button>

        <h3 className="mt-3 text-label font-semibold uppercase tracking-wide text-muted">
          Swap for (same movement pattern)
        </h3>
        {alternatives.length === 0 && (
          <p className="text-muted">No other exercises for this pattern.</p>
        )}
        {alternatives.map((alt) => (
          <button
            key={alt.id}
            type="button"
            onClick={() => onSwap(alt)}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-raised px-4 py-2 text-left"
          >
            <Icon name="swap" />
            <span>
              <span className="block font-medium">{alt.name}</span>
              <span className="block text-label text-muted">{alt.targets.join(' · ')}</span>
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={onRemove}
          className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-danger"
        >
          <Icon name="trash" /> Remove exercise from this workout
        </button>
      </div>
    </Sheet>
  );
}
