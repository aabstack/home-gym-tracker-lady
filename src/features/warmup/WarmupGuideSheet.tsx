import { useMemo } from 'react';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import type { Exercise, WarmupItem } from '../../data/types';
import { programTempo, timelineFor, WARMUP_DEMOS } from '../exercise/demos';
import { AnimationPlayer, ExerciseAnimation } from '../exercise/ExerciseAnimation';
import { WatchDemo } from '../exercise/WatchDemo';
import { useI18n } from '../../i18n/i18n';

/** How-to for one warm-up item: animation(s), the cue, a video link and a done toggle. */
export function WarmupGuideSheet({
  item,
  firstExercise,
  done,
  onToggle,
  onClose,
}: {
  item: WarmupItem | null;
  /** Today's first exercise, demonstrated for the ramp-up set. */
  firstExercise?: Exercise;
  done: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const text = item ? i18n.warmup(item) : null;
  const demos = useMemo(() => (item ? (WARMUP_DEMOS[item.id] ?? []) : []), [item]);
  const isRamp = item?.id === 'wu_ramp';

  return (
    <Sheet
      open={item !== null}
      onClose={onClose}
      title={
        text && (
          <>
            {text.name} <span className="num font-normal text-muted">{text.dose}</span>
          </>
        )
      }
      footer={
        <Button
          variant={done ? 'secondary' : 'primary'}
          block
          onClick={() => {
            onToggle();
            onClose();
          }}
        >
          {done ? (
            t('warmup.notDone')
          ) : (
            <>
              <Icon name="check" /> {t('common.done')}
            </>
          )}
        </Button>
      }
    >
      {item && (
        <div className="flex flex-col gap-4">
          {demos.map((d, i) => (
            <div key={i}>
              {d.title && <h3 className="mb-1 font-semibold">{i18n.phase(d.title)}</h3>}
              <AnimationPlayer
                demo={d.demo}
                steps={timelineFor(d.demo, '2-0-1-0')}
                name={d.title ? i18n.phase(d.title) : (text?.name ?? item.name)}
              />
            </div>
          ))}
          {isRamp && firstExercise && (
            <div>
              <h3 className="mb-1 font-semibold">
                {t('warmup.todayEx', { name: i18n.exName(firstExercise) })}
              </h3>
              <ExerciseAnimation
                exerciseId={firstExercise.id}
                name={i18n.exName(firstExercise)}
                tempo={programTempo(firstExercise.id)}
              />
            </div>
          )}
          <p>{text?.detail}.</p>
          {isRamp && <p className="text-label text-muted">{t('warmup.rampNote')}</p>}
          <WatchDemo
            name={isRamp && firstExercise ? firstExercise.name : item.name}
            suffix={isRamp ? 'exercise proper form' : 'warm up how to'}
          />
        </div>
      )}
    </Sheet>
  );
}
