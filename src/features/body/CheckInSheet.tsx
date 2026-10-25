import { useState } from 'react';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { useUi } from '../../components/ui-context';
import { uuid } from '../../data/id';
import { deleteBodyCheck, saveBodyCheck } from '../../data/repo';
import { useSettings } from '../../data/settings';
import type { BodyCheck } from '../../data/types';
import { bmi, dateKey, type BodyMetric } from '../../domain/body';
import { useI18n } from '../../i18n/i18n';
import { INBODY_FIELDS, TAPE_FIELDS, type FieldDef } from './bodyFields';

type Form = Record<BodyMetric, string> & { date: string; source: string; notes: string };

function toNumber(text: string): number | undefined {
  const n = Number(text.trim().replace(',', '.').replace('٫', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
}

function initialForm(check: BodyCheck | null, latest: BodyCheck | undefined): Form {
  const f = {
    date: check?.date ?? dateKey(Date.now()),
    source: check?.source ?? latest?.source ?? '',
    notes: check?.notes ?? '',
  } as Form;
  for (const def of [...INBODY_FIELDS, ...TAPE_FIELDS]) {
    const v = check?.[def.key];
    f[def.key] = typeof v === 'number' ? String(v) : '';
  }
  return f;
}

/** Add a new check-in (check = null) or edit an existing one. */
export function CheckInSheet({
  open,
  check,
  latest,
  onClose,
}: {
  open: boolean;
  /** The check-in being edited, or null for a new one. */
  check: BodyCheck | null;
  /** Latest check-in, used for placeholders and the default source. */
  latest?: BodyCheck;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ui = useUi();
  const settings = useSettings();
  const [form, setForm] = useState<Form>(() => initialForm(check, latest));

  const set = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const out: BodyCheck = {
      id: check?.id ?? uuid(),
      date: form.date || dateKey(Date.now()),
      createdAt: check?.createdAt ?? Date.now(),
      ...(form.source.trim() ? { source: form.source.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };
    for (const def of [...INBODY_FIELDS, ...TAPE_FIELDS]) {
      const n = toNumber(form[def.key]);
      if (n === undefined) continue;
      if (n < def.range[0] || n > def.range[1]) {
        ui.snackbar({
          message: t('form.outOfRange', {
            field: t(def.label),
            min: def.range[0],
            max: def.range[1],
          }),
        });
        return;
      }
      out[def.key] = n;
    }
    if (out.bmi === undefined && out.weightKg !== undefined) {
      const b = bmi(out.weightKg, settings.heightCm);
      if (b !== undefined) out.bmi = b;
    }
    await saveBodyCheck(out);
    ui.snackbar({ message: t('form.saved') });
    onClose();
  };

  const remove = async () => {
    if (!check) return;
    const ok = await ui.confirm({
      title: t('form.deleteTitle'),
      confirmLabel: t('form.delete'),
      danger: true,
    });
    if (!ok) return;
    await deleteBodyCheck(check.id);
    ui.snackbar({
      message: t('form.deleted'),
      actionLabel: t('common.undo'),
      onAction: () => void saveBodyCheck(check),
    });
    onClose();
  };

  const field = (def: FieldDef) => {
    const prev = latest?.[def.key];
    return (
      <label key={def.key} className="flex items-center justify-between gap-3 py-1.5">
        <span className="min-w-0">
          {t(def.label)}
          {def.unit && (
            <span className="ms-1 text-label text-muted">
              ({def.unit === '%' ? '%' : t(def.unit)})
            </span>
          )}
        </span>
        <input
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={form[def.key]}
          placeholder={!check && typeof prev === 'number' ? String(prev) : '—'}
          onChange={(e) => set(def.key, e.target.value)}
          className="num h-12 w-28 shrink-0 rounded-xl bg-raised px-3 text-center text-lg outline-none"
        />
      </label>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(check ? 'form.editTitle' : 'form.newTitle')}
      footer={
        <Button variant="primary" block onClick={() => void save()}>
          {t('common.save')}
        </Button>
      }
    >
      <div className="flex flex-col">
        <label className="flex items-center justify-between gap-3 py-1.5">
          <span>{t('form.date')}</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="h-12 rounded-xl bg-raised px-2"
          />
        </label>
        <label className="block py-1.5">
          <span className="text-label text-muted">{t('form.source')}</span>
          <input
            type="text"
            value={form.source}
            placeholder={t('form.sourcePh')}
            onChange={(e) => set('source', e.target.value)}
            className="mt-1 h-12 w-full rounded-xl bg-raised px-3 outline-none"
          />
        </label>

        <h3 className="mt-3 text-label font-semibold uppercase tracking-wide text-muted">
          {t('form.inbody')}
        </h3>
        {INBODY_FIELDS.map(field)}
        <p className="text-label text-muted">{t('form.bmiAuto')}</p>

        <h3 className="mt-4 text-label font-semibold uppercase tracking-wide text-muted">
          {t('form.tape')}
        </h3>
        {TAPE_FIELDS.map(field)}

        <label className="mt-3 block">
          <span className="text-label text-muted">{t('form.notes')}</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className="mt-1 w-full rounded-xl bg-raised p-3 outline-none"
          />
        </label>

        {check && (
          <button
            type="button"
            onClick={() => void remove()}
            className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl text-danger"
          >
            <Icon name="trash" size={18} /> {t('form.delete')}
          </button>
        )}
      </div>
    </Sheet>
  );
}
