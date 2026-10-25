import { format } from 'date-fns';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DAY_BORDER } from '../../components/dayColors';
import { DayBadge } from '../../components/DayBadge';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Sheet } from '../../components/Sheet';
import {
  startSession,
  useExercises,
  useHistories,
  useProgramDays,
  useSessions,
} from '../../data/repo';
import { programSeed } from '../../data/seed';
import { setSetting, useSettings } from '../../data/settings';
import type { DayId } from '../../data/types';
import { isDeloadWeek, prescribedSets, resolveProgramStart, weekNumber } from '../../domain/deload';
import { nextDayId, shouldRest } from '../../domain/rotation';
import { estimateMinutes } from '../../domain/session';
import { sessionsThisWeek, weekStreak } from '../../domain/stats';
import { requestNotificationPermission } from '../../hooks/useVibrate';
import { ExerciseGuideSheet } from '../exercise/ExerciseGuideSheet';

const ALL_EXERCISE_IDS = programSeed.exercises.map((e) => e.id);

export function TodayScreen() {
  const navigate = useNavigate();
  const sessions = useSessions();
  const days = useProgramDays();
  const exercises = useExercises();
  const settings = useSettings();
  const [chooseOpen, setChooseOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [guideId, setGuideId] = useState<string | null>(null);
  const histories = useHistories(ALL_EXERCISE_IDS);

  if (!sessions || !days || !exercises) return null;

  const now = Date.now();
  const active = sessions.find((s) => s.endedAt === undefined);
  const completed = sessions.filter((s) => s.endedAt !== undefined);
  const nextId = nextDayId(completed, settings.rotationResetAt);
  const day = days.find((d) => d.id === (active?.dayId ?? nextId)) ?? days[0];
  const start = resolveProgramStart(settings.programStartDate, sessions[0]?.startedAt, now);
  const week = weekNumber(now, start);
  const deload = isDeloadWeek(week, programSeed.defaults.deloadEveryNWeeks);
  const last = completed.reduce<(typeof completed)[number] | undefined>(
    (a, s) => (!a || (s.endedAt ?? 0) > (a.endedAt ?? 0) ? s : a),
    undefined,
  );
  const minutes = estimateMinutes(
    day.items.map((it) => ({
      sets: prescribedSets(it.sets, deload),
      restSec: it.restSec,
      perSide: exercises.get(it.exerciseId)?.perSide ?? false,
    })),
  );

  const guideItem = guideId ? day.items.find((it) => it.exerciseId === guideId) : undefined;

  const begin = async (dayId: DayId) => {
    if (starting) return;
    setStarting(true);
    try {
      if (!settings.notificationsAsked) {
        // Ask once, without blocking the start: an ignored prompt must not hold up the workout.
        void requestNotificationPermission();
        void setSetting('notificationsAsked', true);
      }
      await startSession(dayId);
      navigate('/warmup');
    } finally {
      setStarting(false);
    }
  };

  const resume = () => {
    if (!active) return;
    navigate(active.phase === 'warmup' ? '/warmup' : `/session/${active.id}`);
  };

  return (
    <div className="flex min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom)-env(safe-area-inset-top))] flex-col">
      <PageHeader title="Today" sub={`Training week ${week}`} />

      <div className="flex flex-col gap-3 px-3">
        {deload && (
          <div role="note" className="rounded-2xl border-2 border-warn px-4 py-3 text-warn">
            <div className="font-bold tracking-wide">DELOAD WEEK</div>
            <div className="text-label">Keep your weights, do half the sets.</div>
          </div>
        )}
        {!active && shouldRest(completed, now) && (
          <div role="note" className="rounded-2xl bg-raised px-4 py-3 text-label text-muted">
            Your last session ended less than 40 hours ago. Consider resting today.
          </div>
        )}

        <Card className={`border-l-4 p-4 ${DAY_BORDER[day.id]}`}>
          <div className="flex items-center gap-3">
            <DayBadge day={day.id} size="lg" />
            <div className="min-w-0">
              <div className="text-label uppercase tracking-wide text-muted">
                {active ? 'In progress' : 'Next workout'}
              </div>
              <h2 className="text-xl font-bold">{day.name}</h2>
            </div>
          </div>
          <p className="mt-2 text-muted">{day.focus}</p>
          <p className="mt-1 flex items-center gap-1 text-label text-muted">
            <Icon name="timer" size={16} /> About {minutes} min
          </p>
          <p className="mt-3 flex items-center gap-1 text-label text-muted">
            <Icon name="info" size={16} /> Tap an exercise for the how-to and animated demo
          </p>
          <ol className="mt-1 divide-y divide-line">
            {day.items.map((it) => {
              const ex = exercises.get(it.exerciseId);
              const sets = prescribedSets(it.sets, deload);
              const reps = it.repMin === it.repMax ? it.repMax : `${it.repMin}–${it.repMax}`;
              return (
                <li key={it.exerciseId}>
                  <button
                    type="button"
                    onClick={() => setGuideId(it.exerciseId)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
                  >
                    <span className="min-w-0">
                      {ex?.name ?? it.exerciseId}
                      {it.supersetGroup && (
                        <span className="ml-1 text-label text-muted">(superset)</span>
                      )}
                    </span>
                    <span className="num flex shrink-0 items-center gap-1 text-muted">
                      {sets}×{reps}
                      <Icon name="forward" size={16} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="grid grid-cols-3 gap-2" aria-label="Stats">
          <Stat label="This week" value={`${sessionsThisWeek(completed, now)}/3`} />
          <Stat label="Week streak" value={String(weekStreak(completed, now))} />
          <Stat label="Last session" value={last ? format(last.startedAt, 'EEE d MMM') : '—'} />
        </div>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] mt-auto flex flex-col gap-1 bg-gradient-to-t from-bg from-70% to-transparent px-3 pb-3 pt-6">
        {active ? (
          <Button variant="primary" block onClick={resume}>
            Resume Workout · started {format(active.startedAt, 'HH:mm')}
          </Button>
        ) : (
          <>
            <Button variant="primary" block onClick={() => void begin(day.id)} disabled={starting}>
              Start Workout
            </Button>
            <Button variant="ghost" block onClick={() => setChooseOpen(true)}>
              Choose a different day
            </Button>
          </>
        )}
      </div>

      <ExerciseGuideSheet
        exercise={guideId ? (exercises.get(guideId) ?? null) : null}
        item={guideItem && { ...guideItem, sets: prescribedSets(guideItem.sets, deload) }}
        history={guideId ? histories?.get(guideId) : undefined}
        onClose={() => setGuideId(null)}
      />

      <Sheet open={chooseOpen} onClose={() => setChooseOpen(false)} title="Choose a day">
        <div className="flex flex-col gap-2">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              disabled={starting}
              onClick={() => {
                setChooseOpen(false);
                void begin(d.id);
              }}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-raised px-3 text-left"
            >
              <DayBadge day={d.id} />
              <span className="min-w-0">
                <span className="block font-semibold">
                  {d.name}
                  {d.id === nextId && (
                    <span className="ml-2 text-label text-accent">suggested</span>
                  )}
                </span>
                <span className="block text-label text-muted">{d.focus}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-3 py-2">
      <div className="text-label text-muted">{label}</div>
      <div className="num truncate text-lg font-semibold">{value}</div>
    </Card>
  );
}
