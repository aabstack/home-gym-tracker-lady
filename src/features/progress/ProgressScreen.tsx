import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Segmented } from '../../components/Segmented';
import { db } from '../../data/db';
import type { Exercise } from '../../data/types';
import { formatKg } from '../../domain/format';
import { exerciseSeries, weeklySetsPerMuscle } from '../../domain/stats';
import { useI18n } from '../../i18n/i18n';

type Range = '4w' | '12w' | 'all';
const RANGE_DAYS: Record<Range, number> = { '4w': 28, '12w': 84, all: Infinity };
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

export default function ProgressScreen() {
  const i18n = useI18n();
  const { t } = i18n;
  const dateTick = (d: number) => i18n.date(d, 'd MMM');
  const [range, setRange] = useState<Range>('12w');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const [sessions, logs, exercises, days] = await Promise.all([
      db.sessions.toArray(),
      db.setLogs.toArray(),
      db.exercises.toArray(),
      db.programDays.orderBy('order').toArray(),
    ]);
    return { sessions: sessions.filter((s) => s.endedAt !== undefined), logs, exercises, days };
  });

  const [now] = useState(() => Date.now());
  const since = now - RANGE_DAYS[range] * 86_400_000;

  const derived = useMemo(() => {
    if (!data) return null;
    const sessionById = new Map(data.sessions.map((s) => [s.id, s]));
    const exById = new Map(data.exercises.map((e) => [e.id, e]));
    const logs = data.logs.filter((l) => sessionById.has(l.sessionId));
    const withData = new Set(logs.map((l) => l.exerciseId));
    // Program order first, then any others.
    const ordered: Exercise[] = [];
    for (const d of data.days)
      for (const it of d.items) {
        const e = exById.get(it.exerciseId);
        if (e && !ordered.includes(e)) ordered.push(e);
      }
    for (const e of data.exercises) if (!ordered.includes(e)) ordered.push(e);

    const muscles = [...new Set(data.exercises.flatMap((e) => e.targets))].sort();
    const weekly = weeklySetsPerMuscle(
      logs.map((l) => ({
        completedAt: l.completedAt,
        targets: exById.get(l.exerciseId)?.targets ?? [],
      })),
      8,
      now,
    );
    return { sessionById, exById, logs, withData, ordered, muscles, weekly };
  }, [data, now]);

  if (!data || !derived) return null;

  const exerciseId =
    pickedId ??
    derived.ordered.find((e) => derived.withData.has(e.id))?.id ??
    derived.ordered[0]?.id;
  const exercise = exerciseId ? derived.exById.get(exerciseId) : undefined;

  const bySession = new Map<string, typeof derived.logs>();
  for (const l of derived.logs) {
    if (l.exerciseId !== exerciseId) continue;
    const arr = bySession.get(l.sessionId);
    if (arr) arr.push(l);
    else bySession.set(l.sessionId, [l]);
  }
  const series = exerciseSeries(
    [...bySession.entries()].map(([sid, sets]) => ({
      startedAt: derived.sessionById.get(sid)?.startedAt ?? 0,
      sets,
    })),
  ).filter((p) => p.date >= since);

  const bodyweight = data.sessions
    .filter((s) => s.bodyweightKg !== undefined && s.startedAt >= since)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => ({ date: s.startedAt, kg: s.bodyweightKg as number }));

  const selectedMuscle = muscle ?? derived.muscles[0];
  const weeklyData = derived.weekly.map((w) => ({
    week: w.weekStart,
    sets: selectedMuscle ? (w.counts[selectedMuscle] ?? 0) : 0,
  }));

  const isWeighted = exercise?.loadType === 'dumbbell';
  const noHistory = derived.logs.length === 0;

  return (
    <div>
      <PageHeader title={t('progress.title')} />
      <div className="flex flex-col gap-3 px-3">
        {noHistory && (
          <div className="rounded-2xl bg-surface px-4 py-6 text-center text-muted">
            <Icon name="chart" size={36} className="mx-auto mb-2" />
            <p className="font-semibold text-text">{t('progress.noData')}</p>
            <p>{t('progress.noDataHint')}</p>
          </div>
        )}

        <Segmented
          label={t('progress.range')}
          value={range}
          onChange={setRange}
          options={[
            { value: '4w', label: t('progress.4w') },
            { value: '12w', label: t('progress.12w') },
            { value: 'all', label: t('progress.all') },
          ]}
        />

        <label className="block">
          <span className="sr-only">{t('progress.exercise')}</span>
          <select
            value={exerciseId}
            onChange={(e) => setPickedId(e.target.value)}
            className="h-14 w-full rounded-2xl bg-surface px-3 text-body font-semibold"
          >
            {derived.ordered.map((e) => (
              <option key={e.id} value={e.id}>
                {i18n.exName(e)}
                {derived.withData.has(e.id) ? '' : t('progress.noDataSuffix')}
              </option>
            ))}
          </select>
        </label>

        {exercise && isWeighted && (
          <>
            <LineCard
              title={t('progress.topSet')}
              unit={t('unit.kg')}
              data={series}
              dataKey="topWeight"
            />
            <LineCard title={t('progress.e1rm')} unit={t('unit.kg')} data={series} dataKey="e1rm" />
            <LineCard
              title={t('progress.volume')}
              unit={t('unit.kg')}
              data={series}
              dataKey="volume"
            />
          </>
        )}
        {exercise && !isWeighted && (
          <LineCard
            title={t('progress.totalReps')}
            unit={t('unit.reps')}
            data={series}
            dataKey="totalReps"
          />
        )}

        <LineCard
          title={t('progress.bodyweight')}
          unit={t('unit.kg')}
          data={bodyweight}
          dataKey="kg"
          emptyText={t('progress.bodyweightEmpty')}
        />

        <Card className="p-3">
          <h2 className="font-semibold">{t('progress.weekly')}</h2>
          <p className="text-label text-muted">{t('progress.weeklyHint')}</p>
          <div
            className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-1"
            role="radiogroup"
            aria-label={t('progress.muscle')}
          >
            {derived.muscles.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={m === selectedMuscle}
                onClick={() => setMuscle(m)}
                className={`min-h-11 shrink-0 rounded-full px-3 text-label font-semibold ${m === selectedMuscle ? 'bg-text text-bg' : 'bg-raised text-muted'}`}
              >
                {i18n.muscle(m)}
              </button>
            ))}
          </div>
          <div className="mt-2 h-44" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={dateTick}
                  {...axis}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} {...axis} width={32} />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ fill: 'var(--raised)' }}
                  labelFormatter={(v) =>
                    t('progress.weekOf', { date: i18n.date(Number(v), 'd MMM') })
                  }
                  formatter={(v) => [
                    t('progress.setsValue', { n: String(v) }),
                    i18n.muscle(selectedMuscle ?? ''),
                  ]}
                />
                <Bar
                  dataKey="sets"
                  fill="var(--accent)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={ANIM_MS}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LineCard<T extends { date: number }>({
  title,
  unit,
  data,
  dataKey,
  emptyText,
}: {
  title: string;
  unit: string;
  data: T[];
  dataKey: keyof T & string;
  emptyText?: string;
}) {
  const i18n = useI18n();
  const points = data.filter((d) => d[dataKey] !== null && d[dataKey] !== undefined);
  return (
    <Card className="p-3">
      <h2 className="font-semibold">{title}</h2>
      {points.length === 0 ? (
        <p className="py-6 text-center text-muted">{emptyText ?? i18n.t('progress.emptyRange')}</p>
      ) : (
        <div className="mt-2 h-44" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(d: number) => i18n.date(d, 'd MMM')}
                {...axis}
                minTickGap={24}
              />
              <YAxis
                domain={['auto', 'auto']}
                {...axis}
                width={40}
                tickFormatter={(v: number) => String(Math.round(v * 10) / 10)}
              />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(v) => i18n.date(Number(v), 'EEE d MMM yyyy')}
                formatter={(v) => [`${formatKg(Number(v))} ${unit}`, title]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
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
  );
}
