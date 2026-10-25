import type { BodyMetric } from '../../domain/body';
import type { StringKey } from '../../i18n/strings.en';

/** Fields of a body check-in, in the order the form and the Body tab show them. */
export interface FieldDef {
  key: BodyMetric;
  label: StringKey;
  unit?: StringKey | '%';
  /** Plausible range; anything outside is almost certainly a typo (or the wrong field). */
  range: [number, number];
}

export const INBODY_FIELDS: FieldDef[] = [
  { key: 'weightKg', label: 'body.weight', unit: 'unit.kg', range: [30, 200] },
  { key: 'bodyFatPct', label: 'body.fatPct', unit: '%', range: [3, 70] },
  { key: 'skeletalMuscleKg', label: 'body.muscle', unit: 'unit.kg', range: [5, 80] },
  { key: 'fatMassKg', label: 'body.fatMass', unit: 'unit.kg', range: [1, 120] },
  { key: 'bmi', label: 'body.bmi', range: [10, 60] },
  { key: 'bmrKcal', label: 'body.bmr', unit: 'unit.kcal', range: [600, 4000] },
  { key: 'waistHipRatio', label: 'body.whr', range: [0.5, 1.5] },
];

export const TAPE_FIELDS: FieldDef[] = [
  { key: 'waistCm', label: 'body.waist', unit: 'unit.cm', range: [40, 200] },
  { key: 'hipsCm', label: 'body.hips', unit: 'unit.cm', range: [50, 200] },
  { key: 'thighCm', label: 'body.thigh', unit: 'unit.cm', range: [25, 120] },
];
