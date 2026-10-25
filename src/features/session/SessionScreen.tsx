import type { UpdateSpec } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { DayBadge } from '../../components/DayBadge';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { useUi } from '../../components/ui-context';
import { db } from '../../data/db';
import { setLogId } from '../../data/id';
import { deleteSession, finishSession, useExercises, useHistories } from '../../data/repo';
import { useSettings } from '../../data/settings';
import type { Exercise, Rir, Session, SessionItem, SetDraft, SetLog } from '../../data/types';
import { formatClock, roundKg } from '../../domain/format';
import { ladderFromSeed, suggestProgression, type Suggestion } from '../../domain/progression';
import { programSeed } from '../../data/seed';
import { draftKey, groupItems, nextSlot, setOrder, type Slot } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { TICK_VIBRATION, vibrate } from '../../hooks/useVibrate';
import { useWakeLock } from '../../hooks/useWakeLock';
import { ExerciseGuideSheet } from '../exercise/ExerciseGuideSheet';
import { ExerciseCard, type CardHandlers } from './ExerciseCard';
import { ExerciseMenuSheet } from './ExerciseMenuSheet';
import { RestTimerBar } from './RestTimerBar';
import { DEFAULT_RIR, type RowValues } from './SetRow';
import { SetOptionsSheet } from './SetOptionsSheet';
import { useI18n } from '../../i18n/i18n';

const LETTERS = 'ABCDEFGH';

/** Program-specific progression rules (ladder, effort target, added-load cap) from the seed. */
const PROGRESSION_RULES = {
  ladder: ladderFromSeed(programSeed.progressionLadder),
  maxAddedKg: programSeed.defaults.maxAddedKg,
  minTargetRir: programSeed.defaults.minTargetRir,
};

export function SessionScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const ui = useUi();
  const i18n = useI18n();
  const { t } = i18n;
  const settings = useSettings();
  const exercises = useExercises();
  const session = useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
  const logList = useLiveQuery(() => db.setLogs.where('sessionId').equals(id).toArray(), [id]);
  const exerciseIds = useMemo(
    () => session?.items.map((i) => i.exerciseId) ?? [],
    [session?.items],
  );
  const histories = useHistories(exerciseIds, id);

  // Drafts live in local state for instant feedback and are written through to IndexedDB.
  const [drafts, setDrafts] = useState<Record<string, SetDraft> | null>(null);
  const draftsRef = useRef<Record<string, SetDraft>>({});
  if (session && drafts === null) {
    draftsRef.current = session.drafts ?? {};
    setDrafts(draftsRef.current);
  }

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [optsSlot, setOptsSlot] = useState<Slot | null>(null);
  const [menuItem, setMenuItem] = useState<number | null>(null);
  const [guideItem, setGuideItem] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const now = useNow(1000);

  useWakeLock(settings.wakeLock && !!session && session.endedAt === undefined);

  const logs = useMemo(
    () => new Map((logList ?? []).map((l) => [draftKey(l.exerciseId, l.setIndex), l])),
    [logList],
  );

  const suggestions = useMemo(() => {
    const map = new Map<number, Suggestion>();
    if (!session || !exercises || !histories) return map;
    session.items.forEach((item, i) => {
      const ex = exercises.get(item.exerciseId);
      if (!ex) return;
      map.set(
        i,
        suggestProgression({
          exercise: ex,
          item,
          history: (histories.get(ex.id) ?? []).map((h) => ({
            isDeload: h.session.isDeload,
            sets: h.sets,
          })),
          availableWeightsKg: settings.dumbbellWeightsKg,
          isDeload: session.isDeload,
          ...PROGRESSION_RULES,
        }),
      );
    });
    return map;
  }, [session, exercises, histories, settings.dumbbellWeightsKg]);

  const updateDraft = useCallback(
    (exerciseId: string, setIndex: number, patch: SetDraft) => {
      const key = draftKey(exerciseId, setIndex);
      const merged = { ...draftsRef.current[key], ...patch };
      draftsRef.current = { ...draftsRef.current, [key]: merged };
      setDrafts(draftsRef.current);
      void db.sessions.update(id, { [`drafts.${key}`]: merged } as UpdateSpec<Session>);
    },
    [id],
  );

  const replaceDrafts = useCallback(
    (next: Record<string, SetDraft>) => {
      draftsRef.current = next;
      setDrafts(next);
      void db.sessions.update(id, { drafts: next });
    },
    [id],
  );

  const skipRest = useCallback(() => {
    void db.sessions.update(id, { rest: null });
  }, [id]);

  if (session === null) return <Navigate to="/" replace />;
  if (!session || !exercises || !logList || !histories || drafts === null) return null;
  if (session.endedAt !== undefined) return <Navigate to={`/summary/${session.id}`} replace />;

  const items = session.items;
  const exerciseOf = (i: number) => exercises.get(items[i].exerciseId) as Exercise;
  const isLogged = (exId: string, s: number) => logs.has(draftKey(exId, s));
  const lastLogged = logList.reduce<SetLog | undefined>(
    (a, l) => (!a || l.completedAt > a.completedAt ? l : a),
    undefined,
  );
  const current = nextSlot(items, isLogged, lastLogged);

  const lastSetsFor = (exId: string) => histories.get(exId)?.[0]?.sets;

  const rowValues = (itemIndex: number, setIndex: number): RowValues => {
    const item = items[itemIndex];
    const ex = exerciseOf(itemIndex);
    const key = draftKey(ex.id, setIndex);
    const d = drafts[key] ?? {};
    const logged = logs.get(key);
    // Base: the log itself (when editing), else the previous logged set in this session,
    // else the same set last session, else last session's final set.
    let base: Partial<SetLog> | undefined = logged;
    if (!base) {
      for (let s = setIndex - 1; s >= 0 && !base; s--) base = logs.get(draftKey(ex.id, s));
    }
    if (!base) {
      const last = lastSetsFor(ex.id);
      base = last?.find((l) => l.setIndex === setIndex) ?? last?.[last.length - 1];
    }
    return {
      weightKg:
        d.weightKg !== undefined
          ? d.weightKg
          : ex.loadType === 'dumbbell'
            ? (base?.weightKg ?? null)
            : null,
      addedKg: d.addedKg ?? base?.addedKg ?? 0,
      bandAssist: d.bandAssist ?? base?.bandAssist ?? false,
      reps: d.reps ?? (logged ? logged.reps : item.repMax),
      rir: (d.rir ?? logged?.rir ?? DEFAULT_RIR) as Rir,
      techniques: d.techniques ?? logged?.techniques ?? [],
      note: d.note ?? logged?.note ?? '',
    };
  };

  const slotLabel = (slot: Slot | undefined) => {
    if (!slot) return undefined;
    return t('session.nextLabel', {
      name: i18n.exName(exerciseOf(slot.itemIndex)),
      n: slot.setIndex + 1,
    });
  };

  const tick = async (itemIndex: number, setIndex: number) => {
    const item = items[itemIndex];
    const ex = exerciseOf(itemIndex);
    const key = draftKey(ex.id, setIndex);
    const v = rowValues(itemIndex, setIndex);
    if (ex.loadType === 'dumbbell' && v.weightKg === null) {
      ui.snackbar({ message: t('session.setWeightFirst') });
      return;
    }
    const existing = logs.get(key);
    const isBw = ex.loadType === 'bodyweight' || ex.loadType === 'assisted';
    const log: SetLog = {
      id: setLogId(session.id, ex.id, setIndex),
      sessionId: session.id,
      exerciseId: ex.id,
      setIndex,
      weightKg: ex.loadType === 'dumbbell' ? v.weightKg : null,
      ...(isBw && v.addedKg > 0 ? { addedKg: roundKg(v.addedKg) } : {}),
      ...(ex.loadType === 'assisted' && v.bandAssist ? { bandAssist: true } : {}),
      reps: v.reps,
      rir: v.rir,
      techniques: v.techniques,
      completedAt: existing?.completedAt ?? Date.now(),
      ...(v.note.trim() ? { note: v.note.trim() } : {}),
    };
    await db.setLogs.put(log);

    if (existing) {
      setEditingKey(null);
      return;
    }
    vibrate(TICK_VIBRATION);

    const next = nextSlot(items, (e, s) => (e === ex.id && s === setIndex) || isLogged(e, s), {
      exerciseId: ex.id,
      setIndex,
    });
    const restSec = item.restSec > 0 ? Math.max(0, item.restSec + settings.restAdjustSec) : 0;
    await db.sessions.update(session.id, {
      rest:
        next && restSec > 0 ? { endAt: Date.now() + restSec * 1000, durationSec: restSec } : null,
    });

    const itemDone = Array.from({ length: item.sets }, (_, s) => s).every(
      (s) => s === setIndex || isLogged(ex.id, s),
    );
    if (itemDone && next && next.itemIndex !== itemIndex) {
      cardRefs.current[next.itemIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updateItems = (next: SessionItem[]) => db.sessions.update(session.id, { items: next });

  const removeSet = async (itemIndex: number) => {
    const item = items[itemIndex];
    if (item.sets <= 1) return;
    const ex = exerciseOf(itemIndex);
    const setIndex = item.sets - 1;
    const removedLog = logs.get(draftKey(ex.id, setIndex));
    const prevItems = items;
    await db.transaction('rw', db.sessions, db.setLogs, async () => {
      if (removedLog) await db.setLogs.delete(removedLog.id);
      await updateItems(
        items.map((it, i) => (i === itemIndex ? { ...it, sets: it.sets - 1 } : it)),
      );
    });
    ui.snackbar({
      message: t('session.removedSet', { n: setIndex + 1, name: i18n.exName(ex) }),
      actionLabel: t('common.undo'),
      onAction: () =>
        void db.transaction('rw', db.sessions, db.setLogs, async () => {
          await updateItems(prevItems);
          if (removedLog) await db.setLogs.put(removedLog);
        }),
    });
  };

  const removeExercise = async (itemIndex: number) => {
    const ex = exerciseOf(itemIndex);
    const removedLogs = (logList ?? []).filter((l) => l.exerciseId === ex.id);
    const prevItems = items;
    setMenuItem(null);
    await db.transaction('rw', db.sessions, db.setLogs, async () => {
      await db.setLogs.bulkDelete(removedLogs.map((l) => l.id));
      await updateItems(items.filter((_, i) => i !== itemIndex));
    });
    ui.snackbar({
      message: t('session.removedEx', { name: i18n.exName(ex) }),
      actionLabel: t('common.undo'),
      onAction: () =>
        void db.transaction('rw', db.sessions, db.setLogs, async () => {
          await updateItems(prevItems);
          await db.setLogs.bulkPut(removedLogs);
        }),
    });
  };

  const swap = async (itemIndex: number, to: Exercise) => {
    const from = exerciseOf(itemIndex);
    const fromLogs = (logList ?? []).filter((l) => l.exerciseId === from.id);
    if (fromLogs.length > 0) {
      const ok = await ui.confirm({
        title: t('session.swapTitle', { name: i18n.exName(to) }),
        message: t('session.swapMsg', { name: i18n.exName(from) }),
        confirmLabel: t('session.swap'),
        danger: true,
      });
      if (!ok) return;
    }
    setMenuItem(null);
    await db.transaction('rw', db.sessions, db.setLogs, async () => {
      await db.setLogs.bulkDelete(fromLogs.map((l) => l.id));
      await updateItems(
        items.map((it, i) => (i === itemIndex ? { ...it, exerciseId: to.id } : it)),
      );
    });
    replaceDrafts(
      Object.fromEntries(
        Object.entries(draftsRef.current).filter(([k]) => !k.startsWith(`${from.id}:`)),
      ),
    );
  };

  const applySuggestion = (itemIndex: number, s: Suggestion) => {
    const item = items[itemIndex];
    const ex = exerciseOf(itemIndex);
    let count = 0;
    for (let set = 0; set < item.sets; set++) {
      if (isLogged(ex.id, set)) continue;
      const cur = rowValues(itemIndex, set);
      const patch: SetDraft = {};
      if (s.suggestedWeightKg !== undefined && ex.loadType === 'dumbbell')
        patch.weightKg = s.suggestedWeightKg;
      if (s.suggestedAddedKg !== undefined)
        Object.assign(patch, { addedKg: s.suggestedAddedKg, bandAssist: false });
      if (s.kind === 'remove_band') patch.bandAssist = false;
      if (s.suggestedTechnique && !cur.techniques.includes(s.suggestedTechnique)) {
        patch.techniques = [...cur.techniques, s.suggestedTechnique];
      }
      if (Object.keys(patch).length) {
        updateDraft(ex.id, set, patch);
        count++;
      }
    }
    ui.snackbar({
      message: count ? t('session.applied') : t('session.alreadyApplied'),
    });
  };

  const startEdit = (itemIndex: number, setIndex: number) => {
    const ex = exerciseOf(itemIndex);
    const key = draftKey(ex.id, setIndex);
    const log = logs.get(key);
    if (!log) return;
    vibrate(TICK_VIBRATION);
    updateDraft(ex.id, setIndex, {
      weightKg: log.weightKg,
      addedKg: log.addedKg ?? 0,
      bandAssist: log.bandAssist ?? false,
      reps: log.reps,
      rir: log.rir,
      techniques: log.techniques,
      note: log.note ?? '',
    });
    setEditingKey(key);
  };

  const unlogged = setOrder(items).filter(
    (s) => !isLogged(items[s.itemIndex].exerciseId, s.setIndex),
  ).length;

  const finish = async () => {
    if (unlogged > 0) {
      const ok = await ui.confirm({
        title: t('session.unlogged', { n: unlogged }),
        confirmLabel: t('session.finish'),
        cancelLabel: t('session.keepGoing'),
      });
      if (!ok) return;
    }
    await finishSession(session.id);
    navigate(`/summary/${session.id}`, { replace: true });
  };

  const discard = async () => {
    setMenuOpen(false);
    const ok = await ui.confirm({
      title: t('session.discardTitle'),
      message: t('session.discardMsg'),
      confirmLabel: t('session.discardOk'),
      danger: true,
    });
    if (!ok) return;
    await deleteSession(session.id);
    navigate('/', { replace: true });
  };

  const handlers: CardHandlers = {
    rowValues,
    onDraft: updateDraft,
    onTick: (i, s) => void tick(i, s),
    onEdit: startEdit,
    onCancelEdit: () => setEditingKey(null),
    onOptions: (i, s) => setOptsSlot({ itemIndex: i, setIndex: s }),
    onAddSet: (i) =>
      void updateItems(items.map((it, j) => (j === i ? { ...it, sets: it.sets + 1 } : it))),
    onRemoveSet: (i) => void removeSet(i),
    onMore: setMenuItem,
    onGuide: setGuideItem,
    onApplySuggestion: applySuggestion,
  };

  const optsValues = optsSlot ? rowValues(optsSlot.itemIndex, optsSlot.setIndex) : null;
  const optsEx = optsSlot ? exerciseOf(optsSlot.itemIndex) : null;
  const menuEx = menuItem !== null ? exerciseOf(menuItem) : null;
  const inSession = new Set(items.map((i) => i.exerciseId));
  const alternatives = menuEx
    ? [...exercises.values()].filter((e) => e.pattern === menuEx.pattern && !inSession.has(e.id))
    : [];
  const rest = session.rest;

  return (
    <div className="pt-safe min-h-dvh">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-12 w-12 items-center justify-center rounded-full text-muted"
          aria-label={t('session.back')}
        >
          <Icon name="back" />
        </button>
        <DayBadge day={session.dayId} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {t('day.dayWeek', { d: session.dayId, w: session.weekNumber })}
          </div>
          <div className="num text-label text-muted">
            {t('session.elapsed', { t: formatClock((now - session.startedAt) / 1000) })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full text-muted"
          aria-label={t('session.options')}
        >
          <Icon name="more" />
        </button>
      </header>

      {session.isDeload && (
        <div className="mx-3 mt-3 rounded-2xl border-2 border-warn px-4 py-2 text-label text-warn">
          {t('session.deload')}
        </div>
      )}

      <div className="flex flex-col gap-3 px-2 pt-3">
        {groupItems(items).map((g) => {
          const cards = g.itemIndexes.map((i, pos) => {
            const ex = exerciseOf(i);
            if (!ex) return null;
            return (
              <ExerciseCard
                key={`${i}-${ex.id}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                item={items[i]}
                itemIndex={i}
                exercise={ex}
                letter={g.itemIndexes.length > 1 ? LETTERS[pos] : undefined}
                lastSets={lastSetsFor(ex.id)}
                suggestion={suggestions.get(i)}
                logs={logs}
                current={current}
                editingKey={editingKey}
                weights={settings.dumbbellWeightsKg}
                handlers={handlers}
              />
            );
          });
          if (g.itemIndexes.length === 1) return cards;
          return (
            <div
              key={`ss-${g.itemIndexes[0]}`}
              className="rounded-3xl border-2 border-dashed border-line p-1"
            >
              <p className="px-3 py-1 text-label font-semibold uppercase tracking-wide text-muted">
                {t('session.superset')}
              </p>
              <div className="flex flex-col gap-2">{cards}</div>
            </div>
          );
        })}

        <section className="rounded-2xl bg-surface p-3">
          <label className="block">
            <span className="text-label text-muted">{t('session.notes')}</span>
            <textarea
              defaultValue={session.notes ?? ''}
              onChange={(e) => void db.sessions.update(session.id, { notes: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl bg-raised p-3 outline-none"
              placeholder={t('session.notesPh')}
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3">
            <span>
              {t('session.bodyweight')}{' '}
              <span className="text-label text-muted">{t('session.bodyweightHint')}</span>
            </span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={session.bodyweightKg ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value.replace(',', '.'));
                void db.sessions.update(session.id, {
                  bodyweightKg:
                    e.target.value.trim() && Number.isFinite(n) && n > 0 ? roundKg(n) : undefined,
                });
              }}
              className="num h-12 w-28 rounded-xl bg-raised px-3 text-end text-input outline-none"
              placeholder="—"
            />
          </label>
        </section>

        <Button variant="primary" block onClick={() => void finish()}>
          {t('session.finish')}
        </Button>
        <div className={rest ? 'h-36' : 'h-8'} />
      </div>

      {rest && (
        <RestTimerBar
          rest={rest}
          nextLabel={slotLabel(current)}
          settings={settings}
          onSkip={skipRest}
          onAdjust={(d) => {
            const endAt = Math.max(Date.now(), rest.endAt + d * 1000);
            void db.sessions.update(session.id, {
              rest: { endAt, durationSec: Math.max(1, rest.durationSec + d) },
            });
          }}
        />
      )}

      <SetOptionsSheet
        open={optsSlot !== null}
        title={
          optsSlot && optsEx
            ? t('opts.title', { name: i18n.exName(optsEx), n: optsSlot.setIndex + 1 })
            : ''
        }
        rir={optsValues?.rir ?? DEFAULT_RIR}
        techniques={optsValues?.techniques ?? []}
        note={optsValues?.note ?? ''}
        perSide={optsEx?.perSide ?? false}
        onChange={(patch) => optsSlot && optsEx && updateDraft(optsEx.id, optsSlot.setIndex, patch)}
        onClose={() => setOptsSlot(null)}
      />

      <ExerciseMenuSheet
        exercise={menuEx}
        alternatives={alternatives}
        onClose={() => setMenuItem(null)}
        onGuide={() => {
          setGuideItem(menuItem);
          setMenuItem(null);
        }}
        onSwap={(to) => menuItem !== null && void swap(menuItem, to)}
        onRemove={() => menuItem !== null && void removeExercise(menuItem)}
      />

      <ExerciseGuideSheet
        exercise={guideItem !== null ? exerciseOf(guideItem) : null}
        item={guideItem !== null ? items[guideItem] : undefined}
        history={guideItem !== null ? histories.get(items[guideItem].exerciseId) : undefined}
        onClose={() => setGuideItem(null)}
      />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={t('session.menu')}>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void finish();
            }}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-raised px-4 text-start"
          >
            <Icon name="check" /> {t('session.finish')}
          </button>
          <button
            type="button"
            onClick={() => void discard()}
            className="flex min-h-14 items-center gap-3 rounded-2xl px-4 text-start text-danger"
          >
            <Icon name="trash" /> {t('session.discard')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
