import seedJson from './program.seed.json';
import { db as defaultDb, SCHEMA_VERSION, type GymDB } from './db';
import type { ProgramSeed } from './types';

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
