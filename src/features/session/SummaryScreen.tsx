import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DayBadge } from '../../components/DayBadge';
import { Icon } from '../../components/Icon';
import { db } from '../../data/db';
import { useExercises, useHistories } from '../../data/repo';
import { formatKg } from '../../domain/format';
import { useI18n } from '../../i18n/i18n';
import type { StringKey } from '../../i18n/strings.en';
import { compareToLast, findPRs, volume, type Comparison } from '../../domain/stats';

const COMPARISON: Record<Comparison, { label: StringKey; cls: string }> = {
  beat: { label: 'cmp.beat', cls: 'bg-accent text-on-accent' },
  matched: { label: 'cmp.matched', cls: 'bg-raised text-text' },
  short: { label: 'cmp.short', cls: 'border border-warn text-warn' },
  new: { label: 'cmp.new', cls: 'bg-raised text-muted' },
};

export function SummaryScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const i18n = useI18n();
  const { t } = i18n;
  const exercises = useExercises();
  const session = useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(id).toArray(), [id]);
  const ids = useMemo(() => session?.items.map((i) => i.exerciseId) ?? [], [session?.items]);
  const histories = useHistories(ids, id);

  if (session === null) return <Navigate to="/" replace />;
  if (!session || !logs || !exercises || !histories) return null;

  const vol = volume(logs);
  const before = (h: { session: { startedAt: number } }) => h.session.startedAt < session.startedAt;

  const rows = session.items
    .map((item) => {
      const ex = exercises.get(item.exerciseId);
      const sets = logs
        .filter((l) => l.exerciseId === item.exerciseId)
        .sort((a, b) => a.setIndex - b.setIndex);
      if (!ex || sets.length === 0) return null;
      const prior = (histories.get(ex.id) ?? []).filter(before);
      const prs = findPRs(
        prior.flatMap((h) => h.sets),
        sets,
        item.repMin,
      );
      return {
        ex,
        sets,
        comparison: compareToLast(sets, prior[0]?.sets ?? []),
        prs,
      };
    })
    .filter((r) => r !== null);

  const prList = rows.flatMap((r) => [
    ...(r.prs.weight ? [{ ex: r.ex, set: r.prs.weight, kind: t('summary.weightPr') }] : []),
    ...(r.prs.reps ? [{ ex: r.ex, set: r.prs.reps, kind: t('summary.repPr') }] : []),
  ]);

  return (
    <div className="pt-safe flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-5">
        <DayBadge day={session.dayId} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{t('summary.title')}</h1>
          <p className="text-label text-muted">
            {t('day.dayWeek', { d: session.dayId, w: session.weekNumber })}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-3">
        <div className="grid grid-cols-3 gap-2">
          <Tile
            label={t('summary.duration')}
            value={i18n.duration((session.endedAt ?? Date.now()) - session.startedAt)}
          />
          <Tile label={t('summary.sets')} value={String(logs.length)} />
          <Tile
            label={t('summary.volume')}
            value={t('fmt.kg', { n: Math.round(vol.weightedKg).toLocaleString('en') })}
          />
        </div>
        {vol.bodyweightReps > 0 && (
          <p className="text-label text-muted">{t('summary.bwReps', { n: vol.bodyweightReps })}</p>
        )}

        <Card className="p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="trophy" className="text-warn" /> {t('summary.prs')}
          </h2>
          {prList.length === 0 ? (
            <p className="mt-1 text-muted">{t('summary.noPrs')}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {prList.map((p) => (
                <li key={`${p.ex.id}-${p.kind}`} className="num flex justify-between gap-2">
                  <span className="min-w-0 truncate">{i18n.exName(p.ex)}</span>
                  <span className="shrink-0">
                    <span className="text-label text-warn">{p.kind}</span>{' '}
                    {i18n.load(p.set, p.ex.loadType)} × {p.set.reps}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-2">
          <h2 className="px-2 pt-2 font-bold">{t('summary.exercises')}</h2>
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const c = COMPARISON[r.comparison];
              return (
                <li key={r.ex.id} className="px-2 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{i18n.exName(r.ex)}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-label font-semibold ${c.cls}`}
                    >
                      {t(c.label)}
                    </span>
                  </div>
                  <p className="num text-label text-muted">{i18n.setLine(r.sets, r.ex.loadType)}</p>
                </li>
              );
            })}
            {rows.length === 0 && <li className="px-2 py-3 text-muted">{t('summary.noSets')}</li>}
          </ul>
        </Card>
        {session.bodyweightKg !== undefined && (
          <p className="text-label text-muted">
            {t('summary.bodyweight', { kg: formatKg(session.bodyweightKg) })}
          </p>
        )}
      </div>

      <div className="pb-safe sticky bottom-0 mt-auto bg-gradient-to-t from-bg from-70% to-transparent px-3 pb-3 pt-6">
        <Button variant="primary" block onClick={() => navigate('/', { replace: true })}>
          {t('common.done')}
        </Button>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-3 py-2">
      <div className="text-label text-muted">{label}</div>
      <div className="num truncate text-lg font-semibold">{value}</div>
    </Card>
  );
}
