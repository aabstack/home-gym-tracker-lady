import { format } from 'date-fns';
import { db as defaultDb, type GymDB } from './db';
import type { Session, SetLog, SettingRow } from './types';

export const BACKUP_APP = 'home-gym-tracker-lady';
export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  formatVersion: number;
  exportedAt: string;
  seedVersion: number;
  sessions: Session[];
  setLogs: SetLog[];
  settings: SettingRow[];
}

export interface BackupCounts {
  sessions: number;
  setLogs: number;
  settings: number;
  completedSessions: number;
  firstDate?: number;
  lastDate?: number;
}

export type ParseResult =
  { ok: true; data: BackupFile; counts: BackupCounts } | { ok: false; error: string };

export type ImportMode = 'merge' | 'replace';

export function backupFileName(date: Date | number = new Date()): string {
  return `gym-backup-${format(date, 'yyyy-MM-dd')}.json`;
}

export async function exportBackup(db: GymDB = defaultDb): Promise<BackupFile> {
  const [sessions, setLogs, settings, seed] = await Promise.all([
    db.sessions.toArray(),
    db.setLogs.toArray(),
    db.settings.toArray(),
    db.meta.get('seedVersion'),
  ]);
  return {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    seedVersion: typeof seed?.value === 'number' ? seed.value : 0,
    sessions,
    setLogs,
    settings,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function sessionError(s: unknown, i: number): string | null {
  if (!isObj(s)) return `sessions[${i}] is not an object`;
  if (!isStr(s.id)) return `sessions[${i}].id is missing`;
  if (s.dayId !== 'A' && s.dayId !== 'B' && s.dayId !== 'C')
    return `sessions[${i}].dayId is invalid`;
  if (!isNum(s.startedAt)) return `sessions[${i}].startedAt is invalid`;
  if (s.endedAt !== undefined && !isNum(s.endedAt)) return `sessions[${i}].endedAt is invalid`;
  if (!isNum(s.weekNumber)) return `sessions[${i}].weekNumber is invalid`;
  if (typeof s.isDeload !== 'boolean') return `sessions[${i}].isDeload is invalid`;
  if (s.items !== undefined && !Array.isArray(s.items)) return `sessions[${i}].items is invalid`;
  return null;
}

function logError(l: unknown, i: number): string | null {
  if (!isObj(l)) return `setLogs[${i}] is not an object`;
  if (!isStr(l.id) || !isStr(l.sessionId) || !isStr(l.exerciseId))
    return `setLogs[${i}] is missing ids`;
  if (!isNum(l.setIndex) || !isNum(l.reps) || !isNum(l.completedAt))
    return `setLogs[${i}] has invalid numbers`;
  if (l.weightKg !== null && !isNum(l.weightKg)) return `setLogs[${i}].weightKg is invalid`;
  if (!isNum(l.rir) || l.rir < 0 || l.rir > 4) return `setLogs[${i}].rir is invalid`;
  if (!Array.isArray(l.techniques)) return `setLogs[${i}].techniques is invalid`;
  return null;
}

/** Validate a backup file's text without touching the database. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not a valid JSON file.' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) {
    return { ok: false, error: 'This is not a Home Gym Tracker backup.' };
  }
  if (!isNum(raw.formatVersion) || raw.formatVersion > BACKUP_FORMAT) {
    return { ok: false, error: 'This backup was made by a newer version of the app.' };
  }
  if (!Array.isArray(raw.sessions) || !Array.isArray(raw.setLogs) || !Array.isArray(raw.settings)) {
    return { ok: false, error: 'Backup is missing sessions, set logs or settings.' };
  }
  for (let i = 0; i < raw.sessions.length; i++) {
    const e = sessionError(raw.sessions[i], i);
    if (e) return { ok: false, error: e };
  }
  for (let i = 0; i < raw.setLogs.length; i++) {
    const e = logError(raw.setLogs[i], i);
    if (e) return { ok: false, error: e };
  }
  for (let i = 0; i < raw.settings.length; i++) {
    const s = raw.settings[i];
    if (!isObj(s) || !isStr(s.key)) return { ok: false, error: `settings[${i}] is invalid` };
  }
  const data = raw as unknown as BackupFile;
  const data2: BackupFile = {
    ...data,
    sessions: data.sessions.map((s) => ({ ...s, items: s.items ?? [] })),
  };
  const starts = data2.sessions.map((s) => s.startedAt);
  return {
    ok: true,
    data: data2,
    counts: {
      sessions: data2.sessions.length,
      setLogs: data2.setLogs.length,
      settings: data2.settings.length,
      completedSessions: data2.sessions.filter((s) => s.endedAt !== undefined).length,
      firstDate: starts.length ? Math.min(...starts) : undefined,
      lastDate: starts.length ? Math.max(...starts) : undefined,
    },
  };
}

/**
 * Replace: wipe user tables, then load the backup.
 * Merge: add/overwrite sessions and sets by id; keep existing settings, add missing ones.
 */
export async function importBackup(data: BackupFile, mode: ImportMode, db: GymDB = defaultDb) {
  await db.transaction('rw', db.sessions, db.setLogs, db.settings, async () => {
    if (mode === 'replace') {
      await Promise.all([db.sessions.clear(), db.setLogs.clear(), db.settings.clear()]);
      await db.sessions.bulkAdd(data.sessions);
      await db.setLogs.bulkAdd(data.setLogs);
      await db.settings.bulkAdd(data.settings);
      return;
    }
    await db.sessions.bulkPut(data.sessions);
    await db.setLogs.bulkPut(data.setLogs);
    const existing = new Set((await db.settings.toArray()).map((s) => s.key));
    await db.settings.bulkPut(data.settings.filter((s) => !existing.has(s.key)));
  });
}

/** Deletes all user data (sessions, sets, settings). Program seed is kept. */
export async function deleteAllData(db: GymDB = defaultDb) {
  await db.transaction('rw', db.sessions, db.setLogs, db.settings, async () => {
    await Promise.all([db.sessions.clear(), db.setLogs.clear(), db.settings.clear()]);
  });
}

export const CSV_COLUMNS = [
  'date',
  'day',
  'exercise',
  'set',
  'weight_kg',
  'added_kg',
  'band_assist',
  'reps',
  'rir',
  'techniques',
  'notes',
] as const;

export function csvEscape(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per set, oldest first. `notes` holds the set note. */
export async function exportCsv(db: GymDB = defaultDb): Promise<string> {
  const [sessions, logs, exercises] = await Promise.all([
    db.sessions.toArray(),
    db.setLogs.toArray(),
    db.exercises.toArray(),
  ]);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const nameById = new Map(exercises.map((e) => [e.id, e.name]));
  const rows = logs
    .filter((l) => sessionById.has(l.sessionId))
    .sort((a, b) => {
      const sa = sessionById.get(a.sessionId) as Session;
      const sb = sessionById.get(b.sessionId) as Session;
      return (
        sa.startedAt - sb.startedAt || a.completedAt - b.completedAt || a.setIndex - b.setIndex
      );
    })
    .map((l) => {
      const s = sessionById.get(l.sessionId) as Session;
      return [
        format(s.startedAt, 'yyyy-MM-dd'),
        s.dayId,
        nameById.get(l.exerciseId) ?? l.exerciseId,
        l.setIndex + 1,
        l.weightKg,
        l.addedKg,
        l.bandAssist ? 'true' : 'false',
        l.reps,
        l.rir,
        l.techniques.join('; '),
        l.note,
      ]
        .map(csvEscape)
        .join(',');
    });
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}
