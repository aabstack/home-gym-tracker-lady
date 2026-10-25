import {
  backupFileName,
  csvEscape,
  deleteAllData,
  exportBackup,
  exportCsv,
  importBackup,
  parseBackup,
} from './backup';
import { GymDB } from './db';
import { ensureSeeded } from './seed';
import type { Session, SetLog } from './types';

let db: GymDB;
let n = 0;

const session = (id: string, startedAt: number, extra: Partial<Session> = {}): Session => ({
  id,
  dayId: 'A',
  startedAt,
  endedAt: startedAt + 3_600_000,
  weekNumber: 1,
  isDeload: false,
  warmupDone: true,
  items: [],
  notes: 'felt "strong", good',
  ...extra,
});

const log = (id: string, sessionId: string, extra: Partial<SetLog> = {}): SetLog => ({
  id,
  sessionId,
  exerciseId: 'bulgarian_split_squat',
  setIndex: 0,
  weightKg: 12.5,
  reps: 10,
  rir: 2,
  techniques: [],
  completedAt: 1,
  ...extra,
});

beforeEach(async () => {
  db = new GymDB(`test-backup-${n++}`);
  await ensureSeeded(db);
  await db.sessions.bulkAdd([
    session('s1', new Date(2026, 0, 5, 18).getTime()),
    session('s2', new Date(2026, 0, 7, 18).getTime(), { dayId: 'B', bodyweightKg: 80.5 }),
  ]);
  await db.setLogs.bulkAdd([
    log('l1', 's1', { techniques: ['tempo', 'pause'], note: 'left, weaker' }),
    log('l2', 's1', { setIndex: 1, completedAt: 2 }),
    log('l3', 's2', {
      exerciseId: 'incline_push_up',
      weightKg: null,
      addedKg: 2.5,
      bandAssist: false,
    }),
    log('l4', 's2', {
      exerciseId: 'dead_bug',
      weightKg: null,
      bandAssist: true,
      setIndex: 0,
      completedAt: 5,
    }),
  ]);
  await db.settings.bulkPut([
    { key: 'wakeLock', value: false },
    { key: 'dumbbellWeightsKg', value: [5, 10, 15] },
  ]);
});

afterEach(async () => {
  await db.delete();
});

async function snapshot(d: GymDB) {
  const by = <T extends { id?: string; key?: string }>(a: T[]) =>
    a.sort((x, y) => String(x.id ?? x.key).localeCompare(String(y.id ?? y.key)));
  return {
    sessions: by(await d.sessions.toArray()),
    setLogs: by(await d.setLogs.toArray()),
    settings: by(await d.settings.toArray()),
  };
}

describe('backup', () => {
  it('names the file gym-backup-YYYY-MM-DD.json', () => {
    expect(backupFileName(new Date(2026, 9, 20))).toBe('gym-backup-2026-10-20.json');
  });

  it('export → delete all → import restores everything identically', async () => {
    const before = await snapshot(db);
    const text = JSON.stringify(await exportBackup(db));
    await deleteAllData(db);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.setLogs.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    expect(await db.exercises.count()).toBe(23); // seed untouched

    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.counts).toMatchObject({
      sessions: 2,
      setLogs: 4,
      settings: 2,
      completedSessions: 2,
    });
    await importBackup(parsed.data, 'replace', db);
    expect(await snapshot(db)).toEqual(before);
  });

  it('merge keeps existing data and current settings', async () => {
    const backup = await exportBackup(db);
    backup.sessions.push(session('s3', 3));
    backup.settings = [
      { key: 'wakeLock', value: true },
      { key: 'restSound', value: true },
    ];
    await importBackup(backup, 'merge', db);
    expect(await db.sessions.count()).toBe(3);
    expect((await db.settings.get('wakeLock'))?.value).toBe(false);
    expect((await db.settings.get('restSound'))?.value).toBe(true);
  });

  it('replace removes data not in the backup', async () => {
    const backup = await exportBackup(db);
    await db.sessions.add(session('extra', 9));
    await importBackup(backup, 'replace', db);
    expect(await db.sessions.get('extra')).toBeUndefined();
  });

  it('rejects invalid files with a reason', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'Not a valid JSON file.' });
    expect(parseBackup('{"app":"home-gym-tracker"}').ok).toBe(false);
    const base = {
      app: 'home-gym-tracker-lady',
      formatVersion: 1,
      sessions: [],
      setLogs: [],
      settings: [],
    };
    expect(parseBackup(JSON.stringify({ ...base, formatVersion: 99 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...base, setLogs: undefined })).ok).toBe(false);
    const bad = (patch: object) => parseBackup(JSON.stringify({ ...base, ...patch }));
    expect(bad({ sessions: [{ id: 's', dayId: 'D', startedAt: 1 }] })).toMatchObject({
      ok: false,
      error: 'sessions[0].dayId is invalid',
    });
    expect(bad({ sessions: ['x'] }).ok).toBe(false);
    expect(bad({ sessions: [{ dayId: 'A' }] }).ok).toBe(false);
    expect(bad({ sessions: [{ id: 's', dayId: 'A', startedAt: 'x' }] }).ok).toBe(false);
    expect(bad({ sessions: [{ id: 's', dayId: 'A', startedAt: 1, endedAt: 'x' }] }).ok).toBe(false);
    expect(bad({ sessions: [{ id: 's', dayId: 'A', startedAt: 1 }] }).ok).toBe(false);
    expect(bad({ sessions: [{ id: 's', dayId: 'A', startedAt: 1, weekNumber: 1 }] }).ok).toBe(
      false,
    );
    expect(
      bad({
        sessions: [{ id: 's', dayId: 'A', startedAt: 1, weekNumber: 1, isDeload: false, items: 3 }],
      }).ok,
    ).toBe(false);
    const goodLog = log('l', 's');
    expect(bad({ setLogs: [{ ...goodLog, rir: 7 }] }).ok).toBe(false);
    expect(bad({ setLogs: [{ ...goodLog, weightKg: 'x' }] }).ok).toBe(false);
    expect(bad({ setLogs: [{ ...goodLog, techniques: null }] }).ok).toBe(false);
    expect(bad({ setLogs: [{ ...goodLog, id: 3 }] }).ok).toBe(false);
    expect(bad({ setLogs: [{ ...goodLog, reps: '3' }] }).ok).toBe(false);
    expect(bad({ setLogs: [null] }).ok).toBe(false);
    expect(bad({ settings: [{ value: 1 }] }).ok).toBe(false);
  });

  it('fills missing session items for older backups', () => {
    const r = parseBackup(
      JSON.stringify({
        app: 'home-gym-tracker-lady',
        formatVersion: 1,
        sessions: [
          { id: 's', dayId: 'A', startedAt: 1, weekNumber: 1, isDeload: false, warmupDone: true },
        ],
        setLogs: [],
        settings: [],
      }),
    );
    expect(r.ok && r.data.sessions[0].items).toEqual([]);
    expect(r.ok && r.counts.completedSessions).toBe(0);
  });
});

describe('CSV export', () => {
  it('has the spec columns and one row per set', async () => {
    const csv = await exportCsv(db);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(
      'date,day,exercise,set,weight_kg,added_kg,band_assist,reps,rir,techniques,notes',
    );
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe(
      '2026-01-05,A,Bulgarian Split Squat,1,12.5,,false,10,2,tempo; pause,"left, weaker"',
    );
    expect(lines[3]).toBe('2026-01-07,B,Incline Push-Up (hands on bench),1,,2.5,false,10,2,,');
    expect(lines[4]).toContain(',true,');
  });

  it('escapes quotes, commas and newlines', () => {
    expect(csvEscape('a "b"')).toBe('"a ""b"""');
    expect(csvEscape('a\nb')).toBe('"a\nb"');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(3)).toBe('3');
  });
});
