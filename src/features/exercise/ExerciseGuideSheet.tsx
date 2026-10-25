import { format } from 'date-fns';
import { Sheet } from '../../components/Sheet';
import type { HistoryEntry } from '../../data/repo';
import type { Exercise, SessionItem } from '../../data/types';
import { formatLoad, formatPrescription, formatRir, tempoToWords } from '../../domain/format';
import { topSet } from '../../domain/stats';
import { programTempo } from './demos';
import { ExerciseAnimation } from './ExerciseAnimation';
import { WatchDemo } from './WatchDemo';

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
  return (
    <Sheet open={exercise !== null} onClose={onClose} title={exercise?.name ?? ''}>
      {exercise && (
        <div className="flex flex-col gap-4">
          <ExerciseAnimation
            key={exercise.id}
            exerciseId={exercise.id}
            name={exercise.name}
            tempo={item?.tempo ?? programTempo(exercise.id)}
          />
          <WatchDemo name={exercise.name} />
          <div>
            <p className="text-muted">{exercise.targets.join(' · ')}</p>
            {item && (
              <>
                <p className="num mt-1">{formatPrescription(item, exercise.perSide)}</p>
                <p className="mt-1 text-label text-muted">Tempo: {tempoToWords(item.tempo)}</p>
              </>
            )}
            {exercise.perSide && <p className="mt-1 text-label text-muted">Reps are per side.</p>}
          </div>
          <GuideSection title="Setup" text={exercise.setup} />
          <GuideSection title="Execution" text={exercise.execution} />
          <GuideSection title="Progression" text={exercise.progression} />
          <section>
            <h3 className="mb-1 text-label font-semibold uppercase tracking-wide text-muted">
              Recent top sets
            </h3>
            {history && history.length > 0 ? (
              <ul className="divide-y divide-line rounded-2xl bg-raised px-3">
                {history.slice(0, 5).map((h) => {
                  const t = topSet(h.sets);
                  return (
                    <li key={h.session.id} className="num flex justify-between py-2">
                      <span className="text-muted">{format(h.session.startedAt, 'EEE d MMM')}</span>
                      {t && (
                        <span>
                          {formatLoad(t, exercise.loadType)} × {t.reps}{' '}
                          <span className="text-muted">@ RIR {formatRir(t.rir)}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted">No history yet.</p>
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
