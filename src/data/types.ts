export type DayId = 'A' | 'B' | 'C';

export type Pattern =
  | 'vertical_pull'
  | 'horizontal_pull'
  | 'horizontal_push'
  | 'vertical_push'
  | 'knee'
  | 'hip'
  | 'core'
  | 'arms'
  | 'shoulder_health'
  /** Glute isolation (abduction, kickbacks): swaps only with each other. */
  | 'glute';

export type LoadType = 'dumbbell' | 'bodyweight' | 'assisted' | 'band';

export type Rir = 0 | 1 | 2 | 3 | 4;

export const TECHNIQUES = [
  'tempo',
  'pause',
  '1.5 reps',
  'unilateral',
  'drop set',
  'band',
  'rest-pause',
  'partials',
] as const;
export type Technique = (typeof TECHNIQUES)[number];

// ---- Seed (read-only) ----

export interface Exercise {
  id: string;
  name: string;
  targets: string[];
  pattern: Pattern;
  loadType: LoadType;
  perSide: boolean;
  setup: string;
  execution: string;
  progression: string;
}

export interface ProgramItem {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  tempo: string;
  supersetGroup?: string;
}

export interface ProgramDay {
  id: DayId;
  name: string;
  focus: string;
  order: number;
  items: ProgramItem[];
}

export interface WarmupItem {
  id: string;
  name: string;
  detail: string;
  dose: string;
}

export interface ProgramSeed {
  seedVersion: number;
  warmup: WarmupItem[];
  exercises: Exercise[];
  days: ProgramDay[];
  progressionLadder: { id: string; label: string }[];
  defaults: {
    dumbbellWeightsKg: number[];
    deloadEveryNWeeks: number;
    defaultRir: number;
    /** Minimum RIR for a set to count towards hitting the target (default 1). */
    minTargetRir?: number;
    /** Cap on added load suggested for bodyweight moves (default: heaviest dumbbell). */
    maxAddedKg?: number;
  };
}

// ---- User data (never touched by seeding) ----

/** One exercise slot in a session. Copied from the program day at start, then editable (swap, add/remove sets). */
export interface SessionItem {
  exerciseId: string;
  /** The program's exercise for this slot, kept when the user swaps. */
  programExerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  tempo: string;
  supersetGroup?: string;
}

/** Unsaved values the user dialled in for a set row before ticking it. */
export interface SetDraft {
  weightKg?: number | null;
  addedKg?: number;
  bandAssist?: boolean;
  reps?: number;
  rir?: Rir;
  techniques?: string[];
  note?: string;
}

export interface RestTimerState {
  endAt: number;
  durationSec: number;
}

export interface Session {
  id: string;
  dayId: DayId;
  startedAt: number;
  endedAt?: number;
  weekNumber: number;
  isDeload: boolean;
  bodyweightKg?: number;
  notes?: string;
  warmupDone: boolean;
  /** Where to resume an unfinished session. */
  phase?: 'warmup' | 'lifting';
  /** Exercise plan for this session. */
  items: SessionItem[];
  /** Draft row values keyed by `${exerciseId}:${setIndex}`. */
  drafts?: Record<string, SetDraft>;
  warmupChecked?: string[];
  rest?: RestTimerState | null;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number | null;
  addedKg?: number;
  bandAssist?: boolean;
  reps: number;
  rir: Rir;
  techniques: string[];
  completedAt: number;
  /** Optional free text, e.g. "left side weaker". */
  note?: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface MetaRow {
  key: string;
  value: unknown;
}
