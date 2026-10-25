import { format } from 'date-fns';
import { useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Sheet } from '../../components/Sheet';
import { Stepper } from '../../components/Stepper';
import { Toggle } from '../../components/Toggle';
import { useUi } from '../../components/ui-context';
import {
  backupFileName,
  deleteAllData,
  exportBackup,
  exportCsv,
  importBackup,
  parseBackup,
  type BackupCounts,
  type BackupFile,
  type ImportMode,
} from '../../data/backup';
import { useSessions } from '../../data/repo';
import { programSeed } from '../../data/seed';
import { DEFAULT_SETTINGS, setSetting, useSettings } from '../../data/settings';
import { mondayOf, resolveProgramStart, weekNumber } from '../../domain/deload';
import { formatKg, roundKg } from '../../domain/format';
import { checkForUpdate } from '../../pwa/register';
import { LANG_STORAGE_KEY, useI18n, type Lang } from '../../i18n/i18n';
import { Segmented } from '../../components/Segmented';
import { downloadText } from './download';

export function SettingsScreen() {
  const ui = useUi();
  const i18n = useI18n();
  const { t } = i18n;
  const settings = useSettings();
  const sessions = useSessions();
  const [newWeight, setNewWeight] = useState('');
  const [pending, setPending] = useState<{ data: BackupFile; counts: BackupCounts } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const weights = [...settings.dumbbellWeightsKg].sort((a, b) => a - b);
  const now = Date.now();
  const start = resolveProgramStart(settings.programStartDate, sessions?.[0]?.startedAt, now);

  const addWeight = () => {
    const n = Number(newWeight.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > 200) {
      ui.snackbar({ message: t('settings.enterWeight') });
      return;
    }
    const kg = roundKg(n);
    void setSetting(
      'dumbbellWeightsKg',
      [...new Set([...weights, kg])].sort((a, b) => a - b),
    );
    setNewWeight('');
  };

  const removeWeight = (kg: number) => {
    const prev = weights;
    void setSetting(
      'dumbbellWeightsKg',
      weights.filter((w) => w !== kg),
    );
    ui.snackbar({
      message: t('settings.removed', { kg: formatKg(kg) }),
      actionLabel: t('common.undo'),
      onAction: () => void setSetting('dumbbellWeightsKg', prev),
    });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = parseBackup(await file.text());
    if (fileInput.current) fileInput.current.value = '';
    if (!result.ok) {
      await ui.confirm({
        title: t('settings.importFailed'),
        message: result.error,
        confirmLabel: t('common.ok'),
        cancelLabel: t('common.close'),
      });
      return;
    }
    setPending({ data: result.data, counts: result.counts });
  };

  const doImport = async (mode: ImportMode) => {
    if (!pending) return;
    if (mode === 'replace') {
      const ok = await ui.confirm({
        title: t('settings.replaceTitle'),
        message: t('settings.replaceMsg'),
        confirmLabel: t('settings.replace'),
        danger: true,
      });
      if (!ok) return;
    }
    await importBackup(pending.data, mode);
    setPending(null);
    ui.snackbar({ message: t(mode === 'replace' ? 'settings.restored' : 'settings.merged') });
  };

  const deleteAll = async () => {
    const first = await ui.confirm({
      title: t('settings.deleteTitle'),
      message: t('settings.deleteMsg'),
      confirmLabel: t('settings.continue'),
      danger: true,
    });
    if (!first) return;
    const second = await ui.confirm({
      title: t('settings.sureTitle'),
      message: t('settings.sureMsg'),
      confirmLabel: t('settings.deleteEverything'),
      danger: true,
    });
    if (!second) return;
    await deleteAllData();
    ui.snackbar({ message: t('settings.deleted') });
  };

  return (
    <div>
      <PageHeader title={t('settings.title')} />
      <div className="flex flex-col gap-4 px-3">
        <Section title={t('settings.language')}>
          <Segmented<Lang | 'auto'>
            className="mt-2"
            label={t('settings.language')}
            value={settings.language ?? 'auto'}
            onChange={(v) => {
              const lang = v === 'auto' ? null : v;
              void setSetting('language', lang);
              // Mirror the choice so the next launch paints in the right language immediately.
              try {
                if (lang) localStorage.setItem(LANG_STORAGE_KEY, lang);
                else localStorage.removeItem(LANG_STORAGE_KEY);
              } catch {
                // ignore
              }
            }}
            options={[
              { value: 'auto', label: t('settings.languageAuto') },
              { value: 'en', label: t('lang.en') },
              { value: 'ar', label: t('lang.ar') },
            ]}
          />
        </Section>

        <Section title={t('settings.dumbbells')}>
          <p className="text-label text-muted">{t('settings.dumbbellsHint')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {weights.map((w) => (
              <li key={w}>
                <button
                  type="button"
                  onClick={() => removeWeight(w)}
                  className="num flex min-h-12 items-center gap-1 rounded-full bg-raised ps-4 pe-2"
                  aria-label={t('settings.removeKg', { kg: formatKg(w) })}
                >
                  {formatKg(w)}
                  <Icon name="close" size={16} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWeight()}
              placeholder={t('settings.addKgPh')}
              aria-label={t('settings.addKgAria')}
              className="num h-12 min-w-0 flex-1 rounded-xl bg-raised px-3 outline-none"
            />
            <Button onClick={addWeight}>{t('common.add')}</Button>
          </div>
          <button
            type="button"
            className="mt-2 min-h-12 text-label text-muted underline"
            onClick={() => void setSetting('dumbbellWeightsKg', DEFAULT_SETTINGS.dumbbellWeightsKg)}
          >
            {t('settings.resetList')}
          </button>
        </Section>

        <Section title={t('settings.rest')}>
          <Toggle
            label={t('settings.vibrate')}
            checked={settings.restVibrate}
            onChange={(v) => void setSetting('restVibrate', v)}
          />
          <Toggle
            label={t('settings.sound')}
            checked={settings.restSound}
            onChange={(v) => void setSetting('restSound', v)}
          />
          <div className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span>
              <span className="block">{t('settings.adjust')}</span>
              <span className="block text-label text-muted">{t('settings.adjustHint')}</span>
            </span>
            <Stepper<number>
              className="w-40"
              label={t('settings.adjustAria')}
              value={settings.restAdjustSec}
              display={`${settings.restAdjustSec > 0 ? '+' : ''}${settings.restAdjustSec}s`}
              step={(dir, v) => Math.min(120, Math.max(-60, v + dir * 15))}
              onChange={(v) => void setSetting('restAdjustSec', v)}
            />
          </div>
        </Section>

        <Section title={t('settings.workout')}>
          <Toggle
            label={t('settings.wake')}
            description={t('settings.wakeHint')}
            checked={settings.wakeLock}
            onChange={(v) => void setSetting('wakeLock', v)}
          />
          <label className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span>
              <span className="block">{t('settings.startDate')}</span>
              <span className="block text-label text-muted">
                {t(settings.programStartDate ? 'settings.startManual' : 'settings.startAuto')} ·{' '}
                {t('settings.nowWeek', { n: weekNumber(now, start) })}
              </span>
            </span>
            <input
              type="date"
              value={settings.programStartDate ?? format(start, 'yyyy-MM-dd')}
              onChange={(e) => void setSetting('programStartDate', e.target.value || null)}
              className="h-12 rounded-xl bg-raised px-2"
            />
          </label>
          <div className="flex flex-wrap gap-2 pb-2">
            {settings.programStartDate && (
              <Button onClick={() => void setSetting('programStartDate', null)}>
                {t('settings.useAuto')}
              </Button>
            )}
            <Button
              onClick={() =>
                void setSetting('programStartDate', format(mondayOf(now), 'yyyy-MM-dd'))
              }
            >
              {t('settings.startThisWeek')}
            </Button>
          </div>
          <Button
            block
            onClick={async () => {
              const ok = await ui.confirm({
                title: t('settings.resetTitle'),
                message: t('settings.resetMsg'),
                confirmLabel: t('common.reset'),
              });
              if (ok) {
                await setSetting('rotationResetAt', Date.now());
                ui.snackbar({ message: t('settings.resetDone') });
              }
            }}
          >
            {t('settings.resetRotation')}
          </Button>
        </Section>

        <Section title={t('settings.backup')}>
          <p className="text-label text-muted">{t('settings.backupHint')}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              block
              variant="primary"
              onClick={async () =>
                downloadText(
                  backupFileName(),
                  JSON.stringify(await exportBackup(), null, 1),
                  'application/json',
                )
              }
            >
              {t('settings.exportJson')}
            </Button>
            <Button
              block
              onClick={async () =>
                downloadText(
                  `gym-sets-${format(new Date(), 'yyyy-MM-dd')}.csv`,
                  await exportCsv(),
                  'text/csv',
                )
              }
            >
              {t('settings.exportCsv')}
            </Button>
            <Button block onClick={() => fileInput.current?.click()}>
              {t('settings.import')}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </div>
        </Section>

        <Section title={t('settings.danger')} danger>
          <Button block variant="danger" onClick={() => void deleteAll()}>
            {t('settings.deleteAll')}
          </Button>
        </Section>

        <AppVersion />

        {import.meta.env.DEV && <DevTools />}

        <p className="pb-4 text-center text-label text-muted">
          {t('settings.footer', { v: programSeed.seedVersion })}
        </p>
      </div>

      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('settings.importTitle')}
      >
        {pending && (
          <div className="flex flex-col gap-3">
            <ul className="num rounded-2xl bg-raised p-3">
              <li>
                {t('settings.importSessions', {
                  n: pending.counts.sessions,
                  c: pending.counts.completedSessions,
                })}
              </li>
              <li>{t('settings.importSets', { n: pending.counts.setLogs })}</li>
              <li>{t('settings.importChecks', { n: pending.counts.bodyChecks })}</li>
              <li>{t('settings.importDays', { n: pending.counts.dailyLogs })}</li>
              <li>{t('settings.importSettings', { n: pending.counts.settings })}</li>
              {pending.counts.firstDate !== undefined && pending.counts.lastDate !== undefined && (
                <li className="text-muted">
                  {i18n.date(pending.counts.firstDate, 'd MMM yyyy')} –{' '}
                  {i18n.date(pending.counts.lastDate, 'd MMM yyyy')}
                </li>
              )}
              <li className="text-muted">
                {t('settings.exported', {
                  date: i18n.date(new Date(pending.data.exportedAt), 'd MMM yyyy HH:mm'),
                })}
              </li>
            </ul>
            <Button block variant="primary" onClick={() => void doImport('merge')}>
              {t('settings.merge')}
            </Button>
            <p className="-mt-1 text-label text-muted">{t('settings.mergeHint')}</p>
            <Button block variant="danger" onClick={() => void doImport('replace')}>
              {t('settings.replaceAll')}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function DevTools() {
  const ui = useUi();
  const { t } = useI18n();
  return (
    <Section title={t('settings.dev')}>
      <Button
        block
        onClick={async () => {
          const { generateDemoData } = await import('../../data/demo');
          const r = await generateDemoData();
          ui.snackbar({ message: t('settings.demoAdded', { n: r.sessions }) });
        }}
      >
        {t('settings.demo')}
      </Button>
    </Section>
  );
}

function Section({
  title,
  children,
  danger,
}: {
  title: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className={`p-4 ${danger ? 'border border-danger/50' : ''}`}>
      <h2
        className={`mb-1 text-label font-semibold uppercase tracking-wide ${danger ? 'text-danger' : 'text-muted'}`}
      >
        {title}
      </h2>
      {children}
    </Card>
  );
}

function AppVersion() {
  const ui = useUi();
  const i18n = useI18n();
  const { t } = i18n;
  const [checking, setChecking] = useState(false);
  const built = new Date(__APP_BUILD__);
  const check = async () => {
    setChecking(true);
    const result = await checkForUpdate();
    setChecking(false);
    if (result === 'reloading') return;
    ui.snackbar({
      message: t(
        result === 'latest'
          ? 'settings.latest'
          : result === 'offline'
            ? 'settings.offline'
            : 'settings.autoUpdates',
      ),
    });
  };
  return (
    <Section title={t('settings.version')}>
      <p className="num text-label text-muted">
        {t('settings.built', {
          date: i18n.date(built, 'd MMM yyyy, HH:mm'),
          commit: __APP_COMMIT__,
        })}
      </p>
      <Button block className="mt-2" disabled={checking} onClick={() => void check()}>
        {checking ? t('settings.checking') : t('settings.checkUpdates')}
      </Button>
    </Section>
  );
}
