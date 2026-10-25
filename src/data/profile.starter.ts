import type { BodyCheck } from './types';

/**
 * Her InBody 770 scan (26 Sep 2026, age 29), added once as the first check-in so the Body tab
 * starts with real numbers. Height, age and the 57.6 kg target weight from the same report are
 * the defaults in settings.ts. Everything stays editable in the app.
 */
export const STARTER_CHECK: BodyCheck = {
  id: 'inbody-2026-09-26',
  date: '2026-09-26',
  source: 'InBody 770',
  weightKg: 63.5,
  bodyFatPct: 30.2,
  skeletalMuscleKg: 24.4,
  fatMassKg: 19.1,
  bmi: 24.8,
  bmrKcal: 1328,
  waistHipRatio: 0.91,
  createdAt: Date.UTC(2026, 8, 26),
};
