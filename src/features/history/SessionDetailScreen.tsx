import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DayBadge } from '../../components/DayBadge';
import { Icon } from '../../components/Icon';
import { useUi } from '../../components/ui-context';
import { db } from '../../data/db';
import { deleteSession, useExercises } from '../../data/repo';
import type { Exercise, Rir, SetLog } from '../../data/types';
import { formatKg, formatRir, roundKg } from '../../domain/format';
import { useI18n } from '../../i18n/i18n';
import { volume } from '../../domain/stats';

export function SessionDetailScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const ui = useUi();
  const i18n = useI18n();
  const { t } = i18n;
  const exercises = useExercises();
  const session = useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(id).toArray(), [id]);
  const [editing, setEditing] = useState(false);

  if (session === null) return <Navigate to="/history" replace />;
  if (!session || !logs || !exercises) return null;

  // Exercises in session order, then any logged exercise no longer in the plan.
  const order = [...session.items.map((i) => i.exerciseId)];
  for (const l of logs) if (!order.includes(l.exerciseId)) order.push(l.exerciseId);
  const groups = order
    .map((exId) => ({
      ex: exercises.get(exId),
      exId,
      sets: logs.filter((l) => l.exerciseId === exId).sort((a, b) => a.setIndex - b.setIndex),
    }))
    .filter((g) => g.sets.length > 0 || editing);
  const vol = volume(logs);

  const remove = async () => {
    const ok = await ui.confirm({
      title: t('detail.deleteTitle'),
      message: t('detail.deleteMsg'),
      confirmLabel: t('detail.deleteOk'),
      danger: true,
    });
    if (!ok) return;
    await deleteSession(session.id);
    navigate('/history', { replace: true });
  };

  return (
    <div>
      <header className="flex items-center gap-2 px-2 pb-2 pt-3">
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="flex h-12 w-12 items-center justify-center rounded-full text-muted"
          aria-label={t('detail.back')}
        >
          <Icon name="back" />
        </button>
        <DayBadge day={session.dayId} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">
            {i18n.date(session.startedAt, 'EEE d MMM yyyy')}
          </h1>
          <p className="num text-label text-muted">
            {t('detail.meta', {
              time: i18n.date(session.startedAt, 'HH:mm'),
              dur: i18n.duration((session.endedAt ?? session.startedAt) - session.startedAt),
              w: session.weekNumber,
            })}
            {session.isDeload ? ` · ${t('history.deload')}` : ''}
          </p>
        </div>
        <Button variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing((e) => !e)}>
          <Icon name={editing ? 'check' : 'edit'} size={18} />{' '}
          {editing ? t('common.done') : t('common.edit')}
        </Button>
      </header>

      <div className="flex flex-col gap-3 px-3">
        <p className="num text-label text-muted">
          {t('detail.summary', {
            n: logs.length,
            kg: Math.round(vol.weightedKg).toLocaleString('en'),
          })}
          {vol.bodyweightReps ? ` · ${t('detail.bwReps', { n: vol.bodyweightReps })}` : ''}
          {session.warmupDone ? ` · ${t('detail.warmupDone')}` : ''}
        </p>

        {groups.map((g) => (
          <Card key={g.exId} className="p-3">
            <h2 className="font-semibold">{g.ex ? i18n.exName(g.ex) : g.exId}</h2>
            <ul className="mt-1 flex flex-col gap-1">
              {g.sets.map((s) =>
                editing && g.ex ? (
                  <EditableSet key={s.id} set={s} exercise={g.ex} />
                ) : (
                  <li key={s.id} className="num flex gap-3">
                    <span className="w-5 text-muted">{s.setIndex + 1}</span>
                    <span>
                      {i18n.load(s, g.ex?.loadType)} × {s.reps}{' '}
                      <span className="text-muted">· {t('fmt.rir', { r: formatRir(s.rir) })}</span>
                      {s.techniques.length > 0 && (
                        <span className="text-label text-muted">
                          {' '}
                          · {s.techniques.map(i18n.technique).join('، ')}
                        </span>
                      )}
                      {s.note && <span className="block text-label text-muted">{s.note}</span>}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </Card>
        ))}

        {editing ? (
          <Card className="p-3">
            <label className="block">
              <span className="text-label text-muted">{t('detail.notes')}</span>
              <textarea
                defaultValue={session.notes ?? ''}
                onBlur={(e) => void db.sessions.update(session.id, { notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-xl bg-raised p-3 outline-none"
              />
            </label>
            <label className="mt-2 flex items-center justify-between">
              <span>{t('detail.bodyweight')}</span>
              <input
                type="text"
                inputMode="decimal"
                defaultValue={session.bodyweightKg ?? ''}
                onBlur={(e) => {
                  const n = Number(e.target.value.replace(',', '.'));
                  void db.sessions.update(session.id, {
                    bodyweightKg: e.target.value.trim() && n > 0 ? roundKg(n) : undefined,
                  });
                }}
                className="num h-12 w-28 rounded-xl bg-raised px-3 text-end outline-none"
              />
            </label>
            <Button variant="danger" block className="mt-4" onClick={() => void remove()}>
              <Icon name="trash" /> {t('detail.deleteOk')}
            </Button>
          </Card>
        ) : (
          (session.notes || session.bodyweightKg !== undefined) && (
            <Card className="p-3">
              {session.notes && <p className="whitespace-pre-wrap">{session.notes}</p>}
              {session.bodyweightKg !== undefined && (
                <p className="text-label text-muted">
                  {t('summary.bodyweight', { kg: formatKg(session.bodyweightKg) })}
                </p>
              )}
            </Card>
          )
        )}
      </div>
    </div>
  );
}

function EditableSet({ set, exercise }: { set: SetLog; exercise: Exercise }) {
  const ui = useUi();
  const { t } = useI18n();
  const save = (patch: Partial<SetLog>) => void db.setLogs.update(set.id, patch);
  const num = (text: string) => {
    const n = Number(text.replace(',', '.'));
    return text.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const input = 'num h-12 min-w-0 rounded-xl bg-raised px-2 text-center outline-none';

  return (
    <li className="flex items-center gap-1">
      <span className="num w-5 text-muted">{set.setIndex + 1}</span>
      {exercise.loadType === 'dumbbell' ? (
        <input
          aria-label={t('set.weightAria', { n: set.setIndex + 1 })}
          className={`${input} w-20`}
          inputMode="decimal"
          defaultValue={set.weightKg ?? ''}
          onBlur={(e) => {
            const n = num(e.target.value);
            if (n !== undefined) save({ weightKg: roundKg(n) });
          }}
        />
      ) : exercise.loadType === 'band' ? (
        <span className="w-20 text-center text-muted">{t('fmt.band')}</span>
      ) : (
        <input
          aria-label={t('set.loadAria', { n: set.setIndex + 1 })}
          className={`${input} w-20`}
          inputMode="decimal"
          placeholder="—"
          defaultValue={set.addedKg ?? ''}
          onBlur={(e) => {
            const n = num(e.target.value);
            save({ addedKg: n ? roundKg(n) : undefined });
          }}
        />
      )}
      <span className="text-muted">×</span>
      <input
        aria-label={t('set.repsAria', { n: set.setIndex + 1 })}
        className={`${input} w-14`}
        inputMode="numeric"
        defaultValue={set.reps}
        onBlur={(e) => {
          const n = num(e.target.value);
          if (n !== undefined) save({ reps: Math.round(n) });
        }}
      />
      <select
        aria-label={t('opts.effort')}
        className="h-12 rounded-xl bg-raised px-2"
        defaultValue={set.rir}
        onChange={(e) => save({ rir: Number(e.target.value) as Rir })}
      >
        {[0, 1, 2, 3, 4].map((r) => (
          <option key={r} value={r}>
            {t('fmt.rir', { r: formatRir(r) })}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label={t('detail.deleteSetAria', { n: set.setIndex + 1 })}
        className="ms-auto flex h-12 w-12 items-center justify-center rounded-xl text-danger"
        onClick={() => {
          void db.setLogs.delete(set.id);
          ui.snackbar({
            message: t('detail.deletedSet', { n: set.setIndex + 1 }),
            actionLabel: t('common.undo'),
            onAction: () => void db.setLogs.put(set),
          });
        }}
      >
        <Icon name="trash" size={20} />
      </button>
    </li>
  );
}
