import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import type { Exercise } from '../../data/types';
import { useI18n } from '../../i18n/i18n';

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
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <Sheet open={exercise !== null} onClose={onClose} title={exercise ? i18n.exName(exercise) : ''}>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onGuide}
          className="flex min-h-14 items-center gap-3 rounded-2xl bg-raised px-4 text-start"
        >
          <Icon name="info" /> {t('exmenu.guide')}
        </button>

        <h3 className="mt-3 text-label font-semibold uppercase tracking-wide text-muted">
          {t('exmenu.swapFor')}
        </h3>
        {alternatives.length === 0 && <p className="text-muted">{t('exmenu.none')}</p>}
        {alternatives.map((alt) => (
          <button
            key={alt.id}
            type="button"
            onClick={() => onSwap(alt)}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-raised px-4 py-2 text-start"
          >
            <Icon name="swap" />
            <span>
              <span className="block font-medium">{i18n.exName(alt)}</span>
              <span className="block text-label text-muted">{i18n.muscles(alt.targets)}</span>
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={onRemove}
          className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl px-4 text-start text-danger"
        >
          <Icon name="trash" /> {t('exmenu.remove')}
        </button>
      </div>
    </Sheet>
  );
}
