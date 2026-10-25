import { parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { useBodyChecks, useDailyLogs } from '../../data/repo';
import { useSettings } from '../../data/settings';
import type { BodyCheck } from '../../data/types';
import {
  average,
  checkInDue,
  lastNDays,
  metricChange,
  metricSeries,
  sortChecks,
  targetProgress,
  type BodyMetric,
} from '../../domain/body';
import { useI18n, type I18n } from '../../i18n/i18n';
import { INBODY_FIELDS, TAPE_FIELDS, type FieldDef } from './bodyFields';
import { CheckInSheet } from './CheckInSheet';
import { ProfileSheet } from './ProfileSheet';

const ANIM_MS = 300;
const axis = { stroke: 'var(--muted)', fontSize: 12, tickLine: false } as const;
const tooltipStyle = {
  contentStyle: {
    background: 'var(--raised)',
    border: 'none',
    borderRadius: 12,
    color: 'var(--text)',
  },
  labelStyle: { color: 'var(--muted)' },
  itemStyle: { color: 'var(--text)' },
};
const TREND_METRICS: BodyMetric[] = [
  'weightKg',
  'bodyFatPct',
  'skeletalMuscleKg',
  'fatMassKg',
  'waistCm',
  'hipsCm',
  'thighCm',
];
const ALL_FIELDS: FieldDef[] = [...INBODY_FIELDS, ...TAPE_FIELDS];
const fieldOf = (m: BodyMetric) => ALL_FIELDS.find((f) => f.key === m) as FieldDef;

function unitText(i18n: I18n, def: FieldDef) {
  return def.unit === '%' ? '%' : def.unit ? ` ${i18n.t(def.unit)}` : '';
}

function fmt(v: number) {
  return String(Math.round(v * 100) / 100);
}

type SheetState = { kind: 'new' } | { kind: 'edit'; check: BodyCheck } | { kind: 'profile' } | null;

export default function BodyScreen() {
  const i18n = useI18n();
  const { t } = i18n;
  const settings = useSettings();
  const checks = useBodyChecks();
  const logs = useDailyLogs();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [trend, setTrend] = useState<BodyMetric>('weightKg');
  const [now] = useState(() => Date.now());

  const sorted = useMemo(() => (checks ? sortChecks(checks) : []), [checks]);
  if (!checks || !logs) return null;

  const latest = sorted[0];
  const due = checkInDue(checks, now);
  const weights = metricSeries(checks, 'weightKg');
  const startKg = weights[0]?.value;
  const currentKg = weights[weights.length - 1]?.value;
  const progress =
    startKg !== undefined && currentKg !== undefined
      ? targetProgress(startKg, currentKg, settings.targetWeightKg)
      : undefined;
  const series = metricSeries(checks, trend);
  const days = lastNDays(logs, 14, now);
  const last7 = days.slice(-7);
  const dateTick = (d: number) => i18n.date(d, 'd MMM');

  return (
    <div>
      <PageHeader title={t('body.title')} />
      <div className="flex flex-col gap-3 px-3">
        {due.due && (
          <Card className="border border-accent/60 p-4">
            <h2 className="font-bold">{t('body.dueTitle')}</h2>
            <p className="mt-1 text-label text-muted">{t('body.dueText', { n: due.days ?? 0 })}</p>
            <Button
              variant="primary"
              block
              className="mt-3"
              onClick={() => setSheet({ kind: 'new' })}
            >
              {t('body.addCheckin')}
            </Button>
          </Card>
        )}

        {/* Latest check-in */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold">{t('body.latest')}</h2>
              {latest && (
                <p className="text-label text-muted">
                  {latest.source ? `${latest.source} · ` : ''}
                  {i18n.date(parseISO(latest.date), 'd MMM yyyy')}
                </p>
              )}
            </div>
            <Icon name="scale" className="text-muted" />
          </div>
          {!latest ? (
            <p className="mt-2 text-muted">{t('body.noChecks')}</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ALL_FIELDS.map((def) => {
                const c = metricChange(checks, def.key);
                if (!c || c.date !== latest.date) return null;
                return (
                  <div key={def.key} className="rounded-xl bg-raised px-3 py-2">
                    <div className="text-label text-muted">{t(def.label)}</div>
                    <div className="num text-lg font-semibold" dir="ltr">
                      {fmt(c.value)}
                      <span className="text-label font-normal text-muted">
                        {unitText(i18n, def)}
                      </span>
                    </div>
                    {c.delta !== undefined && c.delta !== 0 && (
                      <div
                        dir="ltr"
                        className={`num text-[12px] font-semibold ${c.good === undefined ? 'text-muted' : c.good ? 'text-accent' : 'text-warn'}`}
                        title={t('body.vsPrev')}
                      >
                        {c.delta > 0 ? '▲' : '▼'} {fmt(Math.abs(c.delta))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="flex-1" onClick={() => setSheet({ kind: 'new' })}>
              <Icon name="plus" size={18} /> {t('body.addCheckin')}
            </Button>
            {latest && (
              <Button className="flex-1" onClick={() => setSheet({ kind: 'edit', check: latest })}>
                <Icon name="edit" size={18} /> {t('body.editLatest')}
              </Button>
            )}
          </div>
        </Card>

        {/* Target weight */}
        {progress && startKg !== undefined && currentKg !== undefined && (
          <Card className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-bold">{t('body.target')}</h2>
              <span className="num text-lg font-semibold">
                {t('fmt.kg', { n: fmt(settings.targetWeightKg) })}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(4, progress.fraction * 100)}%` }}
              />
            </div>
            <div className="num mt-2 flex justify-between text-label text-muted">
              <span>
                {t('body.start')}: {t('fmt.kg', { n: fmt(startKg) })}
              </span>
              <span>
                {t('body.now')}: {t('fmt.kg', { n: fmt(currentKg) })}
              </span>
            </div>
            <p className="mt-1 font-semibold text-accent">
              {progress.reached
                ? t('body.reached')
                : t('body.toGo', { kg: fmt(progress.remainingKg) })}
            </p>
          </Card>
        )}

        {/* Trends */}
        <Card className="p-3">
          <h2 className="font-semibold">{t('body.trends')}</h2>
          <div
            className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-1"
            role="radiogroup"
            aria-label={t('body.trends')}
          >
            {TREND_METRICS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={m === trend}
                onClick={() => setTrend(m)}
                className={`min-h-11 shrink-0 rounded-full px-3 text-label font-semibold ${m === trend ? 'bg-text text-bg' : 'bg-raised text-muted'}`}
              >
                {t(fieldOf(m).label)}
              </button>
            ))}
          </div>
          {series.length < 2 ? (
            <p className="py-6 text-center text-muted">{t('body.trendEmpty')}</p>
          ) : (
            <div className="mt-2 h-44" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={dateTick}
                    {...axis}
                    minTickGap={24}
                  />
                  <YAxis domain={['auto', 'auto']} {...axis} width={40} />
                  {trend === 'weightKg' && (
                    <ReferenceLine
                      y={settings.targetWeightKg}
                      stroke="var(--muted)"
                      strokeDasharray="4 4"
                    />
                  )}
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(v) => i18n.date(Number(v), 'd MMM yyyy')}
                    formatter={(v) => [
                      `${fmt(Number(v))}${unitText(i18n, fieldOf(trend))}`,
                      t(fieldOf(trend).label),
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                    activeDot={{ r: 7 }}
                    animationDuration={ANIM_MS}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Daily habits */}
        <Card className="p-3">
          <h2 className="font-semibold">{t('body.habits')}</h2>
          <p className="text-label text-muted">{t('body.last14')}</p>
          {days.every((d) => !d.steps && !d.proteinG) ? (
            <p className="py-6 text-center text-muted">{t('body.noHabits')}</p>
          ) : (
            <>
              <HabitChart
                title={t('habits.steps')}
                data={days.map((d) => ({ ts: d.ts, value: d.steps ?? 0 }))}
                goal={settings.stepsMin}
                avg={average(last7.map((d) => d.steps))}
                dateTick={dateTick}
              />
              <HabitChart
                title={`${t('habits.protein')} (${t('unit.g')})`}
                data={days.map((d) => ({ ts: d.ts, value: d.proteinG ?? 0 }))}
                goal={settings.proteinMin}
                avg={average(last7.map((d) => d.proteinG))}
                dateTick={dateTick}
              />
            </>
          )}
        </Card>

        {/* Profile & targets */}
        <Card className="p-4">
          <h2 className="font-bold">{t('body.profile')}</h2>
          <dl className="num mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-label">
            <dt className="text-muted">{t('body.height')}</dt>
            <dd>
              {settings.heightCm} {t('unit.cm')}
            </dd>
            <dt className="text-muted">{t('body.age')}</dt>
            <dd>{t('body.years', { n: settings.age })}</dd>
            <dt className="text-muted">{t('body.target')}</dt>
            <dd>{t('fmt.kg', { n: fmt(settings.targetWeightKg) })}</dd>
            <dt className="text-muted">{t('habits.steps')}</dt>
            <dd>
              {settings.stepsMin.toLocaleString('en')}–{settings.stepsMax.toLocaleString('en')}
            </dd>
            <dt className="text-muted">{t('habits.protein')}</dt>
            <dd>
              {settings.proteinMin}–{settings.proteinMax} {t('unit.g')}
            </dd>
          </dl>
          <Button block className="mt-3" onClick={() => setSheet({ kind: 'profile' })}>
            <Icon name="edit" size={18} /> {t('body.editProfile')}
          </Button>
        </Card>

        {/* History */}
        <Card className="mb-4 p-2">
          <h2 className="px-2 pt-2 font-semibold">{t('body.history')}</h2>
          {sorted.length === 0 ? (
            <p className="px-2 py-3 text-muted">{t('body.noChecks')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {sorted.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: 'edit', check: c })}
                    className="flex min-h-14 w-full items-center gap-3 px-2 py-2 text-start"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {i18n.date(parseISO(c.date), 'd MMM yyyy')}
                      </span>
                      <span className="block text-label text-muted">{c.source ?? ''}</span>
                    </span>
                    <span className="num shrink-0 text-end text-label" dir="ltr">
                      {c.weightKg !== undefined && (
                        <span className="block">{fmt(c.weightKg)} kg</span>
                      )}
                      {c.bodyFatPct !== undefined && (
                        <span className="block text-muted">{fmt(c.bodyFatPct)}%</span>
                      )}
                    </span>
                    <Icon name="forward" size={16} className="text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(sheet?.kind === 'new' || sheet?.kind === 'edit') && (
        <CheckInSheet
          open
          check={sheet.kind === 'edit' ? sheet.check : null}
          latest={latest}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'profile' && <ProfileSheet open onClose={() => setSheet(null)} />}
    </div>
  );
}

function HabitChart({
  title,
  data,
  goal,
  avg,
  dateTick,
}: {
  title: string;
  data: { ts: number; value: number }[];
  goal: number;
  avg: number | undefined;
  dateTick: (d: number) => string;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-label font-semibold">{title}</h3>
        {avg !== undefined && (
          <span className="num text-label text-muted">
            {t('body.avg7', { n: avg.toLocaleString('en') })}
          </span>
        )}
      </div>
      <div className="mt-1 h-32" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="ts" tickFormatter={dateTick} {...axis} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} {...axis} width={44} />
            <ReferenceLine y={goal} stroke="var(--accent)" strokeDasharray="4 4" />
            <Tooltip
              {...tooltipStyle}
              cursor={{ fill: 'var(--raised)' }}
              labelFormatter={(v) => dateTick(Number(v))}
              formatter={(v) => [Number(v).toLocaleString('en'), title]}
            />
            <Bar
              dataKey="value"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              animationDuration={ANIM_MS}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
