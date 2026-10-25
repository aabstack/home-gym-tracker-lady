/** DEV ONLY: generates fake history so the History/Progress screens can be checked. */
import { addDays, startOfWeek } from 'date-fns';
import { db } from './db';
import { setLogId, uuid } from './id';
import { loadSettings } from './settings';
import type { DayId, Rir, Session, SetLog } from './types';
import { isDeloadWeek, weekNumber } from '../domain/deload';
import { buildSessionItems } from '../domain/session';
import { nextWeight } from '../domain/progression';
import { roundKg } from '../domain/format';

export async function generateDemoData(sessionCount = 12) {
  const settings = await loadSettings();
  const days = await db.programDays.toArray();
  const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // Mon / Wed / Fri going back far enough for `sessionCount` sessions, ending last week.
  const weeks = Math.ceil(sessionCount / 3);
  const firstMonday = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), -7 * weeks);
  const weights = new Map<string, number>();
  const sessions: Session[] = [];
  const logs: SetLog[] = [];

  for (let i = 0; i < sessionCount; i++) {
    const date = addDays(firstMonday, Math.floor(i / 3) * 7 + (i % 3) * 2);
    date.setHours(18, Math.floor(rand() * 30), 0, 0);
    const startedAt = date.getTime();
    const dayId = (['A', 'B', 'C'] as DayId[])[i % 3];
    const day = days.find((d) => d.id === dayId);
    if (!day) continue;
    const week = weekNumber(startedAt, firstMonday.getTime());
    const isDeload = isDeloadWeek(week);
    const id = uuid();
    const items = buildSessionItems(day, isDeload);
    let t = startedAt + 8 * 60_000;

    for (const item of items) {
      const ex = exercises.get(item.exerciseId);
      if (!ex) continue;
      let w = weights.get(ex.id) ?? (ex.perSide ? 10 : 8);
      for (let s = 0; s < item.sets; s++) {
        t += (item.restSec + 45) * 1000;
        const reps = Math.max(item.repMin - 1, item.repMax - Math.floor(rand() * 4) - s);
        logs.push({
          id: setLogId(id, ex.id, s),
          sessionId: id,
          exerciseId: ex.id,
          setIndex: s,
          weightKg: ex.loadType === 'dumbbell' ? w : null,
          ...(ex.loadType === 'assisted' && i < 4 ? { bandAssist: true } : {}),
          reps,
          rir: (s === item.sets - 1 ? 1 : 2) as Rir,
          techniques: rand() > 0.85 ? ['tempo'] : [],
          completedAt: t,
        });
      }
      if (ex.loadType === 'dumbbell' && rand() > 0.6) {
        w = nextWeight(w, settings.dumbbellWeightsKg) ?? w;
      }
      weights.set(ex.id, w);
    }

    sessions.push({
      id,
      dayId,
      startedAt,
      endedAt: t + 2 * 60_000,
      weekNumber: week,
      isDeload,
      warmupDone: rand() > 0.3,
      phase: 'lifting',
      items,
      drafts: {},
      bodyweightKg: i % 2 === 0 ? roundKg(82 - i * 0.15 + rand() * 0.6) : undefined,
      rest: null,
    });
  }

  await db.transaction('rw', db.sessions, db.setLogs, async () => {
    await db.sessions.bulkAdd(sessions);
    await db.setLogs.bulkAdd(logs);
  });
  return { sessions: sessions.length, sets: logs.length };
}
