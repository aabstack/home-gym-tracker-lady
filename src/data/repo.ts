import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { uuid } from './id';
import { loadSettings } from './settings';
import type { BodyCheck, DailyLog, DayId, Session, SetLog } from './types';
import { isDeloadWeek, resolveProgramStart, weekNumber } from '../domain/deload';
import { buildSessionItems } from '../domain/session';
import { programSeed } from './seed';

export interface HistoryEntry {
  session: Session;
  sets: SetLog[];
}

export async function firstSessionStart(): Promise<number | undefined> {
  return (await db.sessions.orderBy('startedAt').first())?.startedAt;
}

export async function weekInfo(at: number) {
  const settings = await loadSettings();
  const start = resolveProgramStart(settings.programStartDate, await firstSessionStart(), at);
  const week = weekNumber(at, start);
  return { weekNumber: week, isDeload: isDeloadWeek(week, programSeed.defaults.deloadEveryNWeeks) };
}

export async function getActiveSession(): Promise<Session | undefined> {
  const all = await db.sessions.toArray();
  return all.filter((s) => s.endedAt === undefined).sort((a, b) => b.startedAt - a.startedAt)[0];
}

export async function startSession(dayId: DayId): Promise<Session> {
  const day = await db.programDays.get(dayId);
  if (!day) throw new Error(`Program day ${dayId} not found`);
  const now = Date.now();
  const { weekNumber: week, isDeload } = await weekInfo(now);
  const session: Session = {
    id: uuid(),
    dayId,
    startedAt: now,
    weekNumber: week,
    isDeload,
    warmupDone: false,
    phase: 'warmup',
    items: buildSessionItems(day, isDeload),
    drafts: {},
    warmupChecked: [],
    rest: null,
  };
  await db.sessions.add(session);
  return session;
}

export async function finishSession(id: string) {
  await db.sessions.update(id, { endedAt: Date.now(), rest: null, drafts: {} });
}

/** Delete a session and all its set logs. */
export async function deleteSession(id: string) {
  await db.transaction('rw', db.sessions, db.setLogs, async () => {
    await db.setLogs.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

/** Completed sessions containing each exercise, most recent first. */
export async function loadHistories(
  exerciseIds: readonly string[],
  excludeSessionId?: string,
): Promise<Map<string, HistoryEntry[]>> {
  const [logs, sessions] = await Promise.all([
    db.setLogs
      .where('exerciseId')
      .anyOf([...exerciseIds])
      .toArray(),
    db.sessions.toArray(),
  ]);
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const result = new Map<string, HistoryEntry[]>();
  const grouped = new Map<string, Map<string, SetLog[]>>();
  for (const l of logs) {
    const s = byId.get(l.sessionId);
    if (!s || s.endedAt === undefined || s.id === excludeSessionId) continue;
    let perEx = grouped.get(l.exerciseId);
    if (!perEx) grouped.set(l.exerciseId, (perEx = new Map()));
    const arr = perEx.get(l.sessionId);
    if (arr) arr.push(l);
    else perEx.set(l.sessionId, [l]);
  }
  for (const id of exerciseIds) {
    const perEx = grouped.get(id);
    const entries: HistoryEntry[] = perEx
      ? [...perEx.entries()].map(([sid, sets]) => ({
          session: byId.get(sid) as Session,
          sets: sets.sort((a, b) => a.setIndex - b.setIndex),
        }))
      : [];
    entries.sort((a, b) => b.session.startedAt - a.session.startedAt);
    result.set(id, entries);
  }
  return result;
}

export function useHistories(exerciseIds: readonly string[], excludeSessionId?: string) {
  const key = exerciseIds.join('|');
  return useLiveQuery(
    () => loadHistories(key ? key.split('|') : [], excludeSessionId),
    [key, excludeSessionId],
  );
}

export function useExercises() {
  return useLiveQuery(async () => {
    const list = await db.exercises.toArray();
    return new Map(list.map((e) => [e.id, e]));
  }, []);
}

export function useProgramDays() {
  return useLiveQuery(() => db.programDays.orderBy('order').toArray(), []);
}

export function useSessions() {
  return useLiveQuery(() => db.sessions.orderBy('startedAt').toArray(), []);
}

// ---- Body tracking ----

export function useBodyChecks() {
  return useLiveQuery(() => db.bodyChecks.toArray(), []);
}

export function useDailyLogs() {
  return useLiveQuery(() => db.dailyLogs.toArray(), []);
}

/** Create or update one day's habits (steps, protein). */
export async function saveDailyLog(date: string, patch: Partial<Omit<DailyLog, 'date'>>) {
  await db.transaction('rw', db.dailyLogs, async () => {
    const existing = await db.dailyLogs.get(date);
    await db.dailyLogs.put({ ...existing, ...patch, date, updatedAt: Date.now() });
  });
}

export async function saveBodyCheck(check: BodyCheck) {
  await db.bodyChecks.put(check);
}

export async function deleteBodyCheck(id: string) {
  await db.bodyChecks.delete(id);
}
