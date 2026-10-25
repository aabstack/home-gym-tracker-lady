import { GymDB } from './db';
import { ensureSeeded, ensureStarterProfile, programSeed } from './seed';
import { STARTER_CHECK } from './profile.starter';
import type { Session, SetLog } from './types';

let db: GymDB;
let n = 0;

beforeEach(() => {
  db = new GymDB(`test-seed-${n++}`);
});

afterEach(async () => {
  await db.delete();
});

const session: Session = {
  id: 's1',
  dayId: 'A',
  startedAt: 1,
  endedAt: 2,
  weekNumber: 1,
  isDeload: false,
  warmupDone: true,
  items: [],
};

const log: SetLog = {
  id: 'l1',
  sessionId: 's1',
  exerciseId: 'pull_up',
  setIndex: 0,
  weightKg: null,
  reps: 8,
  rir: 2,
  techniques: [],
  completedAt: 2,
};

describe('ensureSeeded', () => {
  it('loads all exercises, days and warm-up items', async () => {
    expect(await ensureSeeded(db)).toBe(true);
    expect(await db.exercises.count()).toBe(programSeed.exercises.length);
    expect(await db.exercises.count()).toBe(23);
    expect(await db.programDays.count()).toBe(3);
    expect(await db.warmup.count()).toBe(6);
    expect((await db.meta.get('seedVersion'))?.value).toBe(programSeed.seedVersion);
  });

  it('is idempotent', async () => {
    await ensureSeeded(db);
    expect(await ensureSeeded(db)).toBe(false);
    expect(await db.exercises.count()).toBe(23);
    expect(await db.programDays.count()).toBe(3);
  });

  it('never touches sessions or set logs, including on a version bump', async () => {
    await ensureSeeded(db);
    await db.sessions.add(session);
    await db.setLogs.add(log);
    await db.settings.put({ key: 'wakeLock', value: false });

    await ensureSeeded(db);
    const bumped = { ...programSeed, seedVersion: programSeed.seedVersion + 1 };
    expect(await ensureSeeded(db, bumped)).toBe(true);

    expect(await db.sessions.toArray()).toEqual([session]);
    expect(await db.setLogs.toArray()).toEqual([log]);
    expect((await db.settings.get('wakeLock'))?.value).toBe(false);
    expect((await db.meta.get('seedVersion'))?.value).toBe(bumped.seedVersion);
  });

  it('copies the program data unchanged', async () => {
    await ensureSeeded(db);
    const bss = await db.exercises.get('bulgarian_split_squat');
    expect(bss).toEqual(programSeed.exercises.find((e) => e.id === 'bulgarian_split_squat'));
    const dayC = await db.programDays.get('C');
    expect(dayC?.items).toHaveLength(6);
  });

  it('keeps every load light (lady version)', () => {
    expect(Math.max(...programSeed.defaults.dumbbellWeightsKg)).toBeLessThanOrEqual(10);
    expect(programSeed.defaults.maxAddedKg).toBe(0);
    expect(programSeed.defaults.minTargetRir).toBe(2);
    const ladder = programSeed.progressionLadder.map((s) => s.id);
    expect(ladder).not.toContain('drop set');
    expect(ladder).not.toContain('rest-pause');
  });

  it('adds her starting InBody check-in exactly once', async () => {
    expect(await ensureStarterProfile(db)).toBe(true);
    expect(await db.bodyChecks.get(STARTER_CHECK.id)).toMatchObject({
      weightKg: 63.5,
      bodyFatPct: 30.2,
    });
    // Deleted later (or "Delete all data"): never re-added.
    await db.bodyChecks.clear();
    expect(await ensureStarterProfile(db)).toBe(false);
    expect(await db.bodyChecks.count()).toBe(0);
  });

  it('does not add the starter check-in when she already has check-ins', async () => {
    await db.bodyChecks.add({ id: 'mine', date: '2026-10-01', weightKg: 63, createdAt: 1 });
    await ensureStarterProfile(db);
    expect((await db.bodyChecks.toArray()).map((c) => c.id)).toEqual(['mine']);
  });
});
