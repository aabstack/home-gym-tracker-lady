import { useState } from 'react';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Stepper } from '../../components/Stepper';
import { saveDailyLog, useDailyLogs } from '../../data/repo';
import { useSettings } from '../../data/settings';
import { dateKey, habitStatus, type HabitStatus } from '../../domain/body';
import { useI18n } from '../../i18n/i18n';

/**
 * Opens Samsung Health so she can read today's step count. A web app can't read Health
 * Connect / Samsung Health data, so steps are copied in by hand (one number a day).
 */
const SAMSUNG_HEALTH_INTENT =
  'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.sec.android.app.shealth;end';
const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

function parseCount(text: string): number | undefined {
  const digits = text
    .replace(/[^\d٠-٩]/g, '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if (digits === '') return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n >= 0 && n <= 200_000 ? n : undefined;
}

export function HabitsCard() {
  const { t } = useI18n();
  const settings = useSettings();
  const logs = useDailyLogs();
  const today = dateKey(Date.now());
  const log = logs?.find((l) => l.date === today);
  const [stepsText, setStepsText] = useState<string | null>(null);

  if (!logs) return null;
  const steps = log?.steps;
  const protein = log?.proteinG ?? 0;

  return (
    <Card className="p-4">
      <h2 className="mb-3 font-bold">{t('habits.title')}</h2>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{t('habits.steps')}</div>
          <div className="num text-label text-muted">
            {t('habits.goal', {
              min: settings.stepsMin.toLocaleString('en'),
              max: settings.stepsMax.toLocaleString('en'),
            })}
          </div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          aria-label={t('habits.stepsAria')}
          placeholder="0"
          dir="ltr"
          className="num h-12 w-32 shrink-0 rounded-xl bg-raised px-3 text-center text-input font-semibold outline-none"
          value={stepsText ?? (steps ? steps.toLocaleString('en') : '')}
          onFocus={() => setStepsText(steps ? String(steps) : '')}
          onChange={(e) => {
            setStepsText(e.target.value);
            const n = parseCount(e.target.value);
            if (n !== undefined) void saveDailyLog(today, { steps: n || undefined });
          }}
          onBlur={() => setStepsText(null)}
        />
      </div>
      <Progress value={steps} min={settings.stepsMin} max={settings.stepsMax} />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-label text-muted">{t('habits.stepsHint')}</p>
        {isAndroid && (
          <a
            href={SAMSUNG_HEALTH_INTENT}
            className="flex min-h-10 items-center gap-1 rounded-full bg-raised px-3 text-label font-semibold"
          >
            {t('habits.openHealth')}
            <Icon name="external" size={14} className="text-muted" />
          </a>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">
            {t('habits.protein')} <span className="text-label text-muted">({t('unit.g')})</span>
          </div>
          <div className="num text-label text-muted">
            {t('habits.goal', { min: settings.proteinMin, max: settings.proteinMax })}
          </div>
        </div>
        <Stepper<number>
          className="w-44 shrink-0"
          label={t('habits.proteinAria')}
          value={protein}
          display={String(protein)}
          editText={protein ? String(protein) : ''}
          step={(dir, v) => Math.max(0, v + dir * 10)}
          parse={parseCount}
          onChange={(v) => void saveDailyLog(today, { proteinG: v || undefined })}
        />
      </div>
      <Progress value={protein} min={settings.proteinMin} max={settings.proteinMax} />
    </Card>
  );
}

const BAR: Record<HabitStatus, string> = {
  none: 'bg-line',
  below: 'bg-warn',
  met: 'bg-accent',
  above: 'bg-accent',
};

function Progress({ value, min, max }: { value: number | undefined; min: number; max: number }) {
  const { t } = useI18n();
  const status = habitStatus(value, min, max);
  const fraction = Math.min(1, (value ?? 0) / Math.max(1, min));
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
        <div
          className={`h-full rounded-full ${BAR[status]}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      {(status === 'met' || status === 'above') && (
        <span className="flex items-center gap-0.5 text-label font-semibold text-accent">
          <Icon name="check" size={14} /> {t('habits.met')}
        </span>
      )}
    </div>
  );
}
