import { useMemo } from 'react';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import type { Exercise, WarmupItem } from '../../data/types';
import { programTempo, timelineFor, WARMUP_DEMOS } from '../exercise/demos';
import { AnimationPlayer, ExerciseAnimation } from '../exercise/ExerciseAnimation';
import { WatchDemo } from '../exercise/WatchDemo';

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
  const demos = useMemo(() => (item ? (WARMUP_DEMOS[item.id] ?? []) : []), [item]);
  const isRamp = item?.id === 'wu_ramp';

  return (
    <Sheet
      open={item !== null}
      onClose={onClose}
      title={
        item && (
          <>
            {item.name} <span className="num font-normal text-muted">{item.dose}</span>
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
            'Mark as not done'
          ) : (
            <>
              <Icon name="check" /> Done
            </>
          )}
        </Button>
      }
    >
      {item && (
        <div className="flex flex-col gap-4">
          {demos.map((d, i) => (
            <div key={i}>
              {d.title && <h3 className="mb-1 font-semibold">{d.title}</h3>}
              <AnimationPlayer
                demo={d.demo}
                steps={timelineFor(d.demo, '2-0-1-0')}
                name={d.title ?? item.name}
              />
            </div>
          ))}
          {isRamp && firstExercise && (
            <div>
              <h3 className="mb-1 font-semibold">Today: {firstExercise.name}</h3>
              <ExerciseAnimation
                exerciseId={firstExercise.id}
                name={firstExercise.name}
                tempo={programTempo(firstExercise.id)}
              />
            </div>
          )}
          <p>{item.detail}.</p>
          {isRamp && (
            <p className="text-label text-muted">
              Do one easy set of your first exercise with a light load or extra band help, about
              half your normal effort. It grooves the movement before your working sets.
            </p>
          )}
          <WatchDemo
            name={isRamp && firstExercise ? firstExercise.name : item.name}
            suffix={isRamp ? 'exercise proper form' : 'warm up how to'}
          />
        </div>
      )}
    </Sheet>
  );
}
