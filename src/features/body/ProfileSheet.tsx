import { useState } from 'react';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { useUi } from '../../components/ui-context';
import { setSetting, useSettings, type AppSettings } from '../../data/settings';
import { useI18n } from '../../i18n/i18n';
import type { StringKey } from '../../i18n/strings.en';

type ProfileKey =
  'heightCm' | 'age' | 'targetWeightKg' | 'stepsMin' | 'stepsMax' | 'proteinMin' | 'proteinMax';

const FIELDS: { key: ProfileKey; label: StringKey; decimal?: boolean }[] = [
  { key: 'heightCm', label: 'form.heightCm' },
  { key: 'age', label: 'form.age' },
  { key: 'targetWeightKg', label: 'form.targetKg', decimal: true },
  { key: 'stepsMin', label: 'form.stepsMin' },
  { key: 'stepsMax', label: 'form.stepsMax' },
  { key: 'proteinMin', label: 'form.proteinMin' },
  { key: 'proteinMax', label: 'form.proteinMax' },
];

/** Height, age, target weight and daily goals. */
export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const ui = useUi();
  const settings = useSettings();
  const [form, setForm] = useState<Record<ProfileKey, string>>(
    () =>
      Object.fromEntries(FIELDS.map((f) => [f.key, String(settings[f.key])])) as Record<
        ProfileKey,
        string
      >,
  );

  const save = async () => {
    const next = { ...settings } as Pick<AppSettings, ProfileKey>;
    for (const f of FIELDS) {
      const n = Number(form[f.key].trim().replace(',', '.'));
      if (Number.isFinite(n) && n > 0)
        next[f.key] = f.decimal ? Math.round(n * 10) / 10 : Math.round(n);
    }
    // Keep each goal range in order, even if she types them the wrong way round.
    if (next.stepsMin > next.stepsMax)
      [next.stepsMin, next.stepsMax] = [next.stepsMax, next.stepsMin];
    if (next.proteinMin > next.proteinMax) {
      [next.proteinMin, next.proteinMax] = [next.proteinMax, next.proteinMin];
    }
    for (const f of FIELDS) {
      if (next[f.key] !== settings[f.key]) await setSetting(f.key, next[f.key]);
    }
    ui.snackbar({ message: t('form.saved') });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('body.profile')}
      footer={
        <Button variant="primary" block onClick={() => void save()}>
          {t('common.save')}
        </Button>
      }
    >
      {FIELDS.map((f) => (
        <label key={f.key} className="flex items-center justify-between gap-3 py-1.5">
          <span>{t(f.label)}</span>
          <input
            type="text"
            inputMode={f.decimal ? 'decimal' : 'numeric'}
            dir="ltr"
            value={form[f.key]}
            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            className="num h-12 w-28 shrink-0 rounded-xl bg-raised px-3 text-center text-lg outline-none"
          />
        </label>
      ))}
    </Sheet>
  );
}
