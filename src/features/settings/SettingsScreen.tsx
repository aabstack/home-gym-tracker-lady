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
import { downloadText } from './download';

export function SettingsScreen() {
  const ui = useUi();
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
      ui.snackbar({ message: 'Enter a weight in kg, e.g. 11 or 12.5' });
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
      message: `Removed ${formatKg(kg)} kg`,
      actionLabel: 'Undo',
      onAction: () => void setSetting('dumbbellWeightsKg', prev),
    });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = parseBackup(await file.text());
    if (fileInput.current) fileInput.current.value = '';
    if (!result.ok) {
      await ui.confirm({
        title: 'Import failed',
        message: result.error,
        confirmLabel: 'OK',
        cancelLabel: 'Close',
      });
      return;
    }
    setPending({ data: result.data, counts: result.counts });
  };

  const doImport = async (mode: ImportMode) => {
    if (!pending) return;
    if (mode === 'replace') {
      const ok = await ui.confirm({
        title: 'Replace all data?',
        message: 'Everything currently on this phone is deleted and replaced by the backup.',
        confirmLabel: 'Replace',
        danger: true,
      });
      if (!ok) return;
    }
    await importBackup(pending.data, mode);
    setPending(null);
    ui.snackbar({ message: mode === 'replace' ? 'Backup restored' : 'Backup merged' });
  };

  const deleteAll = async () => {
    const first = await ui.confirm({
      title: 'Delete all data?',
      message: 'All sessions, sets and settings will be erased from this phone.',
      confirmLabel: 'Continue',
      danger: true,
    });
    if (!first) return;
    const second = await ui.confirm({
      title: 'Are you absolutely sure?',
      message: 'This cannot be undone. Export a backup first if you might need it.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!second) return;
    await deleteAllData();
    ui.snackbar({ message: 'All data deleted' });
  };

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4 px-3">
        <Section title="Dumbbells (kg per handle)">
          <p className="text-label text-muted">Weight steppers snap to these values.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {weights.map((w) => (
              <li key={w}>
                <button
                  type="button"
                  onClick={() => removeWeight(w)}
                  className="num flex min-h-12 items-center gap-1 rounded-full bg-raised pl-4 pr-2"
                  aria-label={`Remove ${formatKg(w)} kg`}
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
              placeholder="Add kg"
              aria-label="Add a dumbbell weight in kg"
              className="num h-12 min-w-0 flex-1 rounded-xl bg-raised px-3 outline-none"
            />
            <Button onClick={addWeight}>Add</Button>
          </div>
          <button
            type="button"
            className="mt-2 min-h-12 text-label text-muted underline"
            onClick={() => void setSetting('dumbbellWeightsKg', DEFAULT_SETTINGS.dumbbellWeightsKg)}
          >
            Reset to default list
          </button>
        </Section>

        <Section title="Rest timer">
          <Toggle
            label="Vibrate"
            checked={settings.restVibrate}
            onChange={(v) => void setSetting('restVibrate', v)}
          />
          <Toggle
            label="Sound"
            checked={settings.restSound}
            onChange={(v) => void setSetting('restSound', v)}
          />
          <div className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span>
              <span className="block">Adjust every rest</span>
              <span className="block text-label text-muted">
                Added to each exercise's rest time
              </span>
            </span>
            <Stepper<number>
              className="w-40"
              label="Rest adjustment in seconds"
              value={settings.restAdjustSec}
              display={`${settings.restAdjustSec > 0 ? '+' : ''}${settings.restAdjustSec}s`}
              step={(dir, v) => Math.min(120, Math.max(-60, v + dir * 15))}
              onChange={(v) => void setSetting('restAdjustSec', v)}
            />
          </div>
        </Section>

        <Section title="Workout">
          <Toggle
            label="Keep screen awake"
            description="During an active workout"
            checked={settings.wakeLock}
            onChange={(v) => void setSetting('wakeLock', v)}
          />
          <label className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span>
              <span className="block">Program start date</span>
              <span className="block text-label text-muted">
                {settings.programStartDate ? 'Set manually' : 'Auto: Monday of your first session'}{' '}
                · now week {weekNumber(now, start)}
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
                Use automatic date
              </Button>
            )}
            <Button
              onClick={() =>
                void setSetting('programStartDate', format(mondayOf(now), 'yyyy-MM-dd'))
              }
            >
              Start this week
            </Button>
          </div>
          <Button
            block
            onClick={async () => {
              const ok = await ui.confirm({
                title: 'Reset rotation to Day A?',
                message: 'Your next workout will be Day A. History is not changed.',
                confirmLabel: 'Reset',
              });
              if (ok) {
                await setSetting('rotationResetAt', Date.now());
                ui.snackbar({ message: 'Next workout: Day A' });
              }
            }}
          >
            Reset rotation to Day A
          </Button>
        </Section>

        <Section title="Backup">
          <p className="text-label text-muted">
            Your data lives only on this phone. Export regularly and keep the file somewhere safe.
          </p>
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
              Export backup (JSON)
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
              Export sets (CSV)
            </Button>
            <Button block onClick={() => fileInput.current?.click()}>
              Import backup…
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

        <Section title="Danger zone" danger>
          <Button block variant="danger" onClick={() => void deleteAll()}>
            Delete all data
          </Button>
        </Section>

        <AppVersion />

        {import.meta.env.DEV && <DevTools />}

        <p className="pb-4 text-center text-label text-muted">
          Home Gym Tracker — Lady version · program v{programSeed.seedVersion} · works offline
        </p>
      </div>

      <Sheet open={pending !== null} onClose={() => setPending(null)} title="Import backup">
        {pending && (
          <div className="flex flex-col gap-3">
            <ul className="num rounded-2xl bg-raised p-3">
              <li>
                {pending.counts.sessions} sessions ({pending.counts.completedSessions} completed)
              </li>
              <li>{pending.counts.setLogs} sets</li>
              <li>{pending.counts.settings} settings</li>
              {pending.counts.firstDate !== undefined && pending.counts.lastDate !== undefined && (
                <li className="text-muted">
                  {format(pending.counts.firstDate, 'd MMM yyyy')} –{' '}
                  {format(pending.counts.lastDate, 'd MMM yyyy')}
                </li>
              )}
              <li className="text-muted">
                Exported {format(new Date(pending.data.exportedAt), 'd MMM yyyy HH:mm')}
              </li>
            </ul>
            <Button block variant="primary" onClick={() => void doImport('merge')}>
              Merge with current data
            </Button>
            <p className="-mt-1 text-label text-muted">
              Adds sessions from the backup; same-id sessions are overwritten. Your settings are
              kept.
            </p>
            <Button block variant="danger" onClick={() => void doImport('replace')}>
              Replace all current data
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function DevTools() {
  const ui = useUi();
  return (
    <Section title="Developer">
      <Button
        block
        onClick={async () => {
          const { generateDemoData } = await import('../../data/demo');
          const r = await generateDemoData();
          ui.snackbar({ message: `Added ${r.sessions} demo sessions (${r.sets} sets)` });
        }}
      >
        Generate demo data
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
  const [checking, setChecking] = useState(false);
  const built = new Date(__APP_BUILD__);
  const check = async () => {
    setChecking(true);
    const result = await checkForUpdate();
    setChecking(false);
    if (result === 'reloading') return;
    ui.snackbar({
      message:
        result === 'latest'
          ? "You're on the latest version"
          : result === 'offline'
            ? 'You are offline. Connect to check for updates.'
            : 'Updates are checked automatically in the installed app.',
    });
  };
  return (
    <Section title="App version">
      <p className="num text-label text-muted">
        Built {format(built, 'd MMM yyyy, HH:mm')} · {__APP_COMMIT__}
      </p>
      <Button block className="mt-2" disabled={checking} onClick={() => void check()}>
        {checking ? 'Checking…' : 'Check for updates'}
      </Button>
    </Section>
  );
}
