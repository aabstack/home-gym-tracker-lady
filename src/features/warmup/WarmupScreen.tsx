import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { db } from '../../data/db';
import { getActiveSession } from '../../data/repo';
import { programSeed } from '../../data/seed';
import { formatClock } from '../../domain/format';
import { useNow } from '../../hooks/useNow';
import { beep, vibrate, REST_DONE_VIBRATION } from '../../hooks/useVibrate';
import { WarmupGuideSheet } from './WarmupGuideSheet';
import { useI18n } from '../../i18n/i18n';

const WARMUP_SECONDS = 4 * 60;
const warmupOrder = (id: string) => programSeed.warmup.findIndex((w) => w.id === id);

export function WarmupScreen() {
  const navigate = useNavigate();
  const i18n = useI18n();
  const { t } = i18n;
  const data = useLiveQuery(async () => {
    const session = (await getActiveSession()) ?? null;
    const firstId = session?.items[0]?.exerciseId;
    return {
      session,
      // IndexedDB returns rows in key order; show them in program order.
      items: (await db.warmup.toArray()).sort((a, b) => warmupOrder(a.id) - warmupOrder(b.id)),
      firstExercise: firstId ? await db.exercises.get(firstId) : undefined,
    };
  });
  const [guideId, setGuideId] = useState<string | null>(null);
  const [endAt, setEndAt] = useState<number | null>(null);
  const now = useNow(250, endAt !== null);
  const finished = endAt !== null && now >= endAt;

  useEffect(() => {
    if (!finished) return;
    vibrate(REST_DONE_VIBRATION);
    beep();
  }, [finished]);

  if (!data) return null;
  const { session, items, firstExercise } = data;
  if (!session) return <Navigate to="/" replace />;

  const checked = new Set(session.warmupChecked ?? []);
  const remaining = endAt === null ? WARMUP_SECONDS : Math.max(0, (endAt - now) / 1000);

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void db.sessions.update(session.id, { warmupChecked: [...next] });
  };

  const proceed = async (done: boolean) => {
    await db.sessions.update(session.id, { warmupDone: done, phase: 'lifting' });
    navigate(`/session/${session.id}`, { replace: true });
  };

  return (
    <div className="pt-safe flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-2 pt-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-12 w-12 items-center justify-center rounded-full text-muted"
          aria-label={t('warmup.back')}
        >
          <Icon name="back" />
        </button>
        <h1 className="text-2xl font-bold">{t('warmup.title')}</h1>
      </header>

      <div className="flex flex-col gap-3 px-3 pt-2">
        <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
          <div>
            <div className="text-label text-muted">{t('warmup.timer')}</div>
            <div
              className={`num text-4xl font-bold ${remaining === 0 ? 'animate-pulse-soft text-accent' : ''}`}
              aria-live="polite"
            >
              {formatClock(remaining)}
            </div>
          </div>
          {endAt === null ? (
            <Button onClick={() => setEndAt(Date.now() + WARMUP_SECONDS * 1000)}>
              {t('warmup.start')}
            </Button>
          ) : (
            <Button onClick={() => setEndAt(null)}>{t('common.reset')}</Button>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {items.map((w) => {
            const on = checked.has(w.id);
            const text = i18n.warmup(w);
            return (
              <li
                key={w.id}
                className={`flex overflow-hidden rounded-2xl ${on ? 'bg-raised opacity-70' : 'bg-surface'}`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(w.id)}
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-2 text-start"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-accent bg-accent text-on-accent' : 'border-line'}`}
                  >
                    {on && <Icon name="check" size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {text.name} <span className="num font-normal text-muted">{text.dose}</span>
                    </span>
                    <span className="block text-label text-muted">{text.detail}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuideId(w.id)}
                  aria-label={t('warmup.howAria', { name: text.name })}
                  className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-s border-line text-label font-semibold text-accent"
                >
                  <Icon name="play" size={20} />
                  {t('warmup.how')}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <WarmupGuideSheet
        item={items.find((w) => w.id === guideId) ?? null}
        firstExercise={firstExercise}
        done={guideId !== null && checked.has(guideId)}
        onToggle={() => guideId && toggle(guideId)}
        onClose={() => setGuideId(null)}
      />

      <div className="pb-safe sticky bottom-0 mt-auto flex gap-2 bg-gradient-to-t from-bg from-70% to-transparent px-3 pb-3 pt-6">
        <Button className="h-14 w-28" onClick={() => void proceed(false)}>
          {t('warmup.skip')}
        </Button>
        <Button variant="primary" block className="flex-1" onClick={() => void proceed(true)}>
          {t('warmup.done')}
        </Button>
      </div>
    </div>
  );
}
