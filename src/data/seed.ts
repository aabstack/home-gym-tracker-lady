import seedJson from './program.seed.json';
import { db as defaultDb, SCHEMA_VERSION, type GymDB } from './db';
import type { ProgramSeed } from './types';
import { STARTER_CHECK } from './profile.starter';

export const programSeed = seedJson as ProgramSeed;

/**
 * Loads the program seed if the stored seed version is older than the JSON's.
 * Only the Exercise / ProgramDay / Warmup tables are replaced; user tables are untouched.
 * Returns true when a (re)seed happened.
 */
export async function ensureSeeded(db: GymDB = defaultDb, seed: ProgramSeed = programSeed) {
  return db.transaction('rw', [db.exercises, db.programDays, db.warmup, db.meta], async () => {
    const current = await db.meta.get('seedVersion');
    const currentVersion = typeof current?.value === 'number' ? current.value : 0;
    const exerciseCount = await db.exercises.count();
    if (currentVersion >= seed.seedVersion && exerciseCount > 0) return false;

    await Promise.all([db.exercises.clear(), db.programDays.clear(), db.warmup.clear()]);
    await db.exercises.bulkAdd(seed.exercises);
    await db.programDays.bulkAdd(seed.days);
    await db.warmup.bulkAdd(seed.warmup);
    await db.meta.bulkPut([
      { key: 'seedVersion', value: seed.seedVersion },
      { key: 'schemaVersion', value: SCHEMA_VERSION },
    ]);
    return true;
  });
}

/**
 * Adds her starting InBody check-in once. A meta flag records that it was applied, so deleting
 * it (or "Delete all data") never brings it back.
 */
export async function ensureStarterProfile(db: GymDB = defaultDb) {
  return db.transaction('rw', db.bodyChecks, db.meta, async () => {
    if (await db.meta.get('starterProfile')) return false;
    if ((await db.bodyChecks.count()) === 0) await db.bodyChecks.add(STARTER_CHECK);
    await db.meta.put({ key: 'starterProfile', value: STARTER_CHECK.id });
    return true;
  });
}
