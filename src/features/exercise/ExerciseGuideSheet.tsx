import { Sheet } from '../../components/Sheet';
import type { HistoryEntry } from '../../data/repo';
import type { Exercise, SessionItem } from '../../data/types';
import { topSet } from '../../domain/stats';
import { programTempo } from './demos';
import { ExerciseAnimation } from './ExerciseAnimation';
import { WatchDemo } from './WatchDemo';
import { useI18n } from '../../i18n/i18n';

export function ExerciseGuideSheet({
  exercise,
  item,
  history,
  onClose,
}: {
  exercise: Exercise | null;
  item?: Pick<SessionItem, 'sets' | 'repMin' | 'repMax' | 'tempo' | 'restSec'>;
  history?: HistoryEntry[];
  onClose: () => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <Sheet open={exercise !== null} onClose={onClose} title={exercise ? i18n.exName(exercise) : ''}>
      {exercise && (
        <div className="flex flex-col gap-4">
          <ExerciseAnimation
            key={exercise.id}
            exerciseId={exercise.id}
            name={i18n.exName(exercise)}
            tempo={item?.tempo ?? programTempo(exercise.id)}
          />
          <WatchDemo name={exercise.name} />
          <div>
            <p className="text-muted">{i18n.muscles(exercise.targets)}</p>
            {item && (
              <>
                <p className="num mt-1">{i18n.prescription(item, exercise.perSide)}</p>
                <p className="mt-1 text-label text-muted">
                  {t('guide.tempo', { words: i18n.tempoWords(item.tempo) })}
                </p>
              </>
            )}
            {exercise.perSide && <p className="mt-1 text-label text-muted">{t('guide.perSide')}</p>}
          </div>
          <GuideSection title={t('guide.setup')} text={i18n.exText(exercise, 'setup')} />
          <GuideSection title={t('guide.execution')} text={i18n.exText(exercise, 'execution')} />
          <GuideSection
            title={t('guide.progression')}
            text={i18n.exText(exercise, 'progression')}
          />
          <section>
            <h3 className="mb-1 text-label font-semibold uppercase tracking-wide text-muted">
              {t('guide.recent')}
            </h3>
            {history && history.length > 0 ? (
              <ul className="divide-y divide-line rounded-2xl bg-raised px-3">
                {history.slice(0, 5).map((h) => {
                  const top = topSet(h.sets);
                  return (
                    <li key={h.session.id} className="num flex justify-between py-2">
                      <span className="text-muted">
                        {i18n.date(h.session.startedAt, 'EEE d MMM')}
                      </span>
                      {top && (
                        <span>
                          {i18n.load(top, exercise.loadType)} × {top.reps}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted">{t('guide.noHistory')}</p>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}

function GuideSection({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h3 className="mb-1 text-label font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <p>{text}</p>
    </section>
  );
}
