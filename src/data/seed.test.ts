import { GymDB } from './db';
import { ensureSeeded, programSeed } from './seed';
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
});
