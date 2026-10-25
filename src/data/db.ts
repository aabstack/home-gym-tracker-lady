import Dexie, { type Table } from 'dexie';
import type {
  BodyCheck,
  DailyLog,
  Exercise,
  MetaRow,
  ProgramDay,
  Session,
  SetLog,
  SettingRow,
  WarmupItem,
} from './types';

export class GymDB extends Dexie {
  // Seed tables (replaced on seed version bump)
  exercises!: Table<Exercise, string>;
  programDays!: Table<ProgramDay, string>;
  warmup!: Table<WarmupItem, string>;
  // User tables (never cleared by seeding)
  sessions!: Table<Session, string>;
  setLogs!: Table<SetLog, string>;
  settings!: Table<SettingRow, string>;
  bodyChecks!: Table<BodyCheck, string>;
  dailyLogs!: Table<DailyLog, string>;
  meta!: Table<MetaRow, string>;

  // Own database name: this app shares the aabstack.github.io origin with the male version.
  constructor(name = 'home-gym-tracker-lady') {
    super(name);
    // Schema history. Never remove a version; add a new one with an upgrade() for changes.
    this.version(1).stores({
      exercises: 'id, pattern',
      programDays: 'id, order',
      warmup: 'id',
      sessions: 'id, startedAt, dayId',
      setLogs: 'id, sessionId, exerciseId, [exerciseId+completedAt]',
      settings: 'key',
      meta: 'key',
    });
    // v2: body check-ins (InBody / tape) and daily habit logs. Existing tables are untouched.
    this.version(2).stores({
      bodyChecks: 'id, date',
      dailyLogs: 'date',
    });
  }
}

export const SCHEMA_VERSION = 2;

export const db = new GymDB();

export const SEED_TABLES = ['exercises', 'programDays', 'warmup'] as const;
export const USER_TABLES = ['sessions', 'setLogs', 'settings', 'bodyChecks', 'dailyLogs'] as const;
