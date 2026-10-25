import { useEffect, useRef } from 'react';
import type { RestTimerState } from '../../data/types';
import type { AppSettings } from '../../data/settings';
import { formatClock } from '../../domain/format';
import { useNow } from '../../hooks/useNow';
import { beep, notify, REST_DONE_VIBRATION, vibrate } from '../../hooks/useVibrate';
import { useI18n } from '../../i18n/i18n';

/** How long the "rest over" state stays up before the bar hides itself. */
const DONE_LINGER_MS = 15_000;
/** Don't alarm for timers that ran out long ago (e.g. the app was reopened much later). */
const STALE_MS = 5_000;

/**
 * Sticky rest timer. Remaining time is always derived from the stored end timestamp, so it
 * stays correct after backgrounding, screen-off, or the app being killed and reopened.
 */
export function RestTimerBar({
  rest,
  nextLabel,
  settings,
  onAdjust,
  onSkip,
}: {
  rest: RestTimerState;
  nextLabel?: string;
  settings: Pick<AppSettings, 'restVibrate' | 'restSound'>;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const now = useNow(250);
  const remainingMs = rest.endAt - now;
  const done = remainingMs <= 0;
  const firedFor = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const labelRef = useRef(nextLabel);
  labelRef.current = nextLabel;

  // Exact-time alarm, independent of the render tick (fires while backgrounded too).
  useEffect(() => {
    const fire = () => {
      if (firedFor.current === rest.endAt) return;
      firedFor.current = rest.endAt;
      if (Date.now() - rest.endAt > STALE_MS) return;
      const s = settingsRef.current;
      if (s.restVibrate) vibrate(REST_DONE_VIBRATION);
      if (s.restSound) beep();
      if (document.visibilityState === 'hidden') {
        const tt = tRef.current;
        void notify(
          tt('rest.notifTitle'),
          labelRef.current ? tt('rest.next', { label: labelRef.current }) : tt('rest.notifBody'),
        );
      }
    };
    const delay = rest.endAt - Date.now();
    if (delay <= 0) {
      fire();
      return;
    }
    const t = window.setTimeout(fire, delay);
    // Timers can be delayed while hidden; check again as soon as we're visible.
    const onVis = () =>
      document.visibilityState === 'visible' && Date.now() >= rest.endAt && fire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [rest.endAt]);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(onSkip, Math.max(0, rest.endAt + DONE_LINGER_MS - Date.now()));
    return () => window.clearTimeout(t);
  }, [done, rest.endAt, onSkip]);

  const fraction =
    rest.durationSec > 0 ? Math.min(1, Math.max(0, remainingMs / (rest.durationSec * 1000))) : 0;
  const btn = 'min-h-14 min-w-14 rounded-2xl bg-raised px-2 font-semibold num active:opacity-70';

  return (
    <div
      className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line bg-surface"
      role="timer"
      aria-label={t('rest.aria')}
    >
      <div className="h-1.5 w-full bg-raised">
        <div
          className={`h-full ${done ? 'bg-accent' : 'bg-text'} transition-[width] duration-200 ease-linear`}
          style={{ width: `${(done ? 1 : fraction) * 100}%` }}
        />
      </div>
      <div dir="ltr" className="flex items-center justify-between gap-2 px-3 pt-2">
        <button
          type="button"
          className={btn}
          onClick={() => onAdjust(-15)}
          aria-label={t('rest.minus')}
        >
          −15
        </button>
        <div
          className={`num text-timer font-bold leading-none ${done ? 'animate-pulse-soft text-accent' : ''}`}
          aria-live={done ? 'assertive' : 'off'}
        >
          {done ? t('rest.go') : formatClock(remainingMs / 1000)}
        </div>
        <button
          type="button"
          className={btn}
          onClick={() => onAdjust(15)}
          aria-label={t('rest.plus')}
        >
          +15
        </button>
        <button type="button" className={`${btn} text-muted`} onClick={onSkip}>
          {done ? t('rest.hide') : t('rest.skip')}
        </button>
      </div>
      <p className="truncate px-3 pb-2 pt-1 text-center text-label text-muted">
        {nextLabel ? t('rest.next', { label: nextLabel }) : t('rest.lastDone')}
      </p>
    </div>
  );
}
