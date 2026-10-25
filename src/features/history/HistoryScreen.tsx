import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../../components/Card';
import { DAY_BG } from '../../components/dayColors';
import { DayBadge } from '../../components/DayBadge';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Segmented } from '../../components/Segmented';
import { db } from '../../data/db';
import type { Session } from '../../data/types';
import { formatDuration } from '../../domain/format';

type View = 'list' | 'calendar';

export function HistoryScreen() {
  const [view, setView] = useState<View>(
    () => (sessionStorage.getItem('historyView') as View) || 'list',
  );
  const data = useLiveQuery(async () => {
    const [sessions, logs] = await Promise.all([db.sessions.toArray(), db.setLogs.toArray()]);
    const counts = new Map<string, number>();
    for (const l of logs) counts.set(l.sessionId, (counts.get(l.sessionId) ?? 0) + 1);
    const completed = sessions
      .filter((s) => s.endedAt !== undefined)
      .sort((a, b) => b.startedAt - a.startedAt);
    return { completed, counts };
  });

  const changeView = (v: View) => {
    setView(v);
    try {
      sessionStorage.setItem('historyView', v);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <PageHeader title="History" />
      <div className="px-3">
        <Segmented
          label="History view"
          value={view}
          onChange={changeView}
          options={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
      </div>
      {data && data.completed.length === 0 && (
        <div className="px-6 py-12 text-center text-muted">
          <Icon name="history" size={40} className="mx-auto mb-3" />
          <p className="font-semibold text-text">No workouts yet</p>
          <p>Finished sessions will appear here.</p>
        </div>
      )}
      {data && data.completed.length > 0 && view === 'list' && (
        <ul className="flex flex-col gap-2 px-3 pt-3">
          {data.completed.map((s) => (
            <li key={s.id}>
              <SessionRow session={s} sets={data.counts.get(s.id) ?? 0} />
            </li>
          ))}
        </ul>
      )}
      {data && data.completed.length > 0 && view === 'calendar' && (
        <CalendarView sessions={data.completed} counts={data.counts} />
      )}
    </div>
  );
}

function SessionRow({ session, sets }: { session: Session; sets: number }) {
  return (
    <Link
      to={`/history/${session.id}`}
      className="flex min-h-16 items-center gap-3 rounded-2xl bg-surface px-3 py-2"
    >
      <DayBadge day={session.dayId} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{format(session.startedAt, 'EEE d MMM yyyy')}</div>
        <div className="num text-label text-muted">
          Day {session.dayId} ·{' '}
          {formatDuration((session.endedAt ?? session.startedAt) - session.startedAt)} · {sets} sets
          {session.isDeload ? ' · deload' : ''}
        </div>
      </div>
      <Icon name="forward" className="text-muted" />
    </Link>
  );
}

function CalendarView({ sessions, counts }: { sessions: Session[]; counts: Map<string, number> }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const byDay = (d: Date) => sessions.filter((s) => isSameDay(s.startedAt, d));
  const selectedSessions = selected ? byDay(selected) : [];

  return (
    <div className="px-3 pt-3">
      <Card className="p-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="flex h-12 w-12 items-center justify-center rounded-full"
            aria-label="Previous month"
          >
            <Icon name="back" />
          </button>
          <div className="font-semibold">{format(month, 'MMMM yyyy')}</div>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex h-12 w-12 items-center justify-center rounded-full"
            aria-label="Next month"
          >
            <Icon name="forward" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-label text-muted" aria-hidden>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d) => {
            const list = byDay(d);
            const inMonth = isSameMonth(d, month);
            const isSel = selected && isSameDay(d, selected);
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setSelected(d)}
                aria-label={`${format(d, 'd MMMM')}${list.length ? `, ${list.map((s) => `day ${s.dayId}`).join(', ')}` : ''}`}
                className={`flex h-12 flex-col items-center justify-center rounded-xl ${isSel ? 'bg-raised' : ''} ${inMonth ? '' : 'opacity-35'} ${isSameDay(d, new Date()) ? 'font-bold text-accent' : ''}`}
              >
                <span className="num text-label">{format(d, 'd')}</span>
                <span className="flex h-2 gap-0.5">
                  {list.map((s) => (
                    <span key={s.id} className={`h-2 w-2 rounded-full ${DAY_BG[s.dayId]}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center gap-4 text-label text-muted">
          {(['A', 'B', 'C'] as const).map((d) => (
            <span key={d} className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-full ${DAY_BG[d]}`} /> Day {d}
            </span>
          ))}
        </div>
      </Card>
      {selected && (
        <div className="mt-3 flex flex-col gap-2">
          {selectedSessions.length === 0 ? (
            <p className="text-center text-muted">No workout on {format(selected, 'EEE d MMM')}.</p>
          ) : (
            selectedSessions.map((s) => (
              <SessionRow key={s.id} session={s} sets={counts.get(s.id) ?? 0} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
