import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { programSeed } from './seed';
import type { Lang } from '../i18n/i18n';

export interface AppSettings {
  dumbbellWeightsKg: number[];
  restVibrate: boolean;
  restSound: boolean;
  /** Seconds added to every rest period (can be negative). */
  restAdjustSec: number;
  wakeLock: boolean;
  /** yyyy-mm-dd, or null for "Monday of the first session". */
  programStartDate: string | null;
  /** Sessions finished before this timestamp are ignored by the rotation. */
  rotationResetAt: number;
  notificationsAsked: boolean;
  /** UI language; null follows the phone. */
  language: Lang | null;
  // Profile and daily targets (from her InBody scan and her plan); editable on the Body tab.
  heightCm: number;
  age: number;
  targetWeightKg: number;
  stepsMin: number;
  stepsMax: number;
  proteinMin: number;
  proteinMax: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dumbbellWeightsKg: programSeed.defaults.dumbbellWeightsKg,
  restVibrate: true,
  restSound: false,
  restAdjustSec: 0,
  wakeLock: true,
  programStartDate: null,
  rotationResetAt: 0,
  notificationsAsked: false,
  language: null,
  heightCm: 160,
  age: 29,
  targetWeightKg: 57.6,
  stepsMin: 8000,
  stepsMax: 12000,
  proteinMin: 110,
  proteinMax: 120,
};

export async function loadSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) merged[r.key] = r.value;
  return merged as unknown as AppSettings;
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  return db.settings.put({ key, value });
}

/** Live settings merged with defaults. Returns defaults until loaded. */
export function useSettings(): AppSettings {
  return useLiveQuery(loadSettings, [], DEFAULT_SETTINGS);
}
