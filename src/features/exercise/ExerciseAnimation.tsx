import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import {
  add,
  buildSkeleton,
  lerpPose,
  sampleTimeline,
  type Skeleton,
  type Vec,
} from '../../domain/figure';
import type { Step } from '../../domain/figure';
import { bendsFor, DEMOS, timelineFor, type Demo, type Prop } from './demos';
import { useI18n } from '../../i18n/i18n';

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/** Looping stick-figure demo of an exercise, timed to its tempo. Tap to pause / play. */
export function ExerciseAnimation({
  exerciseId,
  name,
  tempo,
}: {
  exerciseId: string;
  name: string;
  tempo: string;
}) {
  const demo = DEMOS[exerciseId];
  const steps = useMemo(() => (demo ? timelineFor(demo, tempo) : []), [demo, tempo]);
  if (!demo) return null;
  return <AnimationPlayer demo={demo} steps={steps} name={name} />;
}

/** Plays any demo along a timeline. */
export function AnimationPlayer({
  demo,
  steps,
  name,
}: {
  demo: Demo;
  steps: Step[];
  name: string;
}) {
  const i18n = useI18n();
  const tr = i18n.t;
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [t, setT] = useState(0);
  const tRef = useRef(0);

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Real elapsed time keeps the tempo accurate; the cap avoids a jump after the tab was hidden.
      tRef.current += Math.min(0.25, (now - last) / 1000);
      last = now;
      setT(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, steps]);

  if (steps.length === 0) return null;

  const s = sampleTimeline(steps, t);
  const pose = lerpPose(demo.poses[s.step.from], demo.poses[s.step.to], s.alpha);
  const sk = buildSkeleton(pose, bendsFor(demo));

  return (
    <figure className="m-0">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="relative block w-full overflow-hidden rounded-2xl bg-raised"
        aria-label={tr('anim.aria', {
          name,
          action: tr(playing ? 'anim.tapPause' : 'anim.tapPlay'),
        })}
      >
        <svg viewBox={demo.viewBox} className="block h-auto w-full" role="img" aria-hidden>
          <Figure demo={demo} sk={sk} />
        </svg>
        {playing ? (
          <span className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-bg/70 text-muted">
            <Icon name="pause" size={16} />
          </span>
        ) : (
          <span className="absolute inset-x-0 bottom-3 mx-auto flex w-max items-center gap-1 rounded-full bg-bg/80 px-3 py-1.5 text-label font-semibold">
            <Icon name="play" size={16} className="text-accent" /> {tr('anim.tapPlay')}
          </span>
        )}
      </button>
      <figcaption className="num mt-2 flex items-center justify-between text-label" aria-live="off">
        <span className="font-semibold">{i18n.phase(s.step.label)}</span>
        <span className="text-muted">
          {tr(s.step.from === s.step.to ? 'anim.hold' : 'anim.move')} ·{' '}
          {tr('anim.sec', { n: Math.max(0, s.remaining).toFixed(1) })}
        </span>
      </figcaption>
    </figure>
  );
}

const EQUIP = {
  stroke: 'var(--muted)',
  strokeOpacity: 0.55,
  strokeLinecap: 'round' as const,
  fill: 'none',
};
const LIMB = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

function pts(points: readonly Vec[]) {
  return points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}

function Figure({ demo, sk }: { demo: Demo; sk: Skeleton }) {
  const lines = demo.props.filter((p): p is Extract<Prop, { kind: 'line' }> => p.kind === 'line');
  const bells = demo.props.filter(
    (p): p is Extract<Prop, { kind: 'dumbbell' }> => p.kind === 'dumbbell',
  );
  const bands = demo.props.filter((p): p is Extract<Prop, { kind: 'band' }> => p.kind === 'band');
  const bandBetween = demo.props.some((p) => p.kind === 'bandBetween');
  // Front view: both sides are equally visible; side view: far limbs are muted, behind the body.
  const front = demo.view === 'front';

  return (
    <g>
      {lines.map((l, i) => (
        <polyline
          key={i}
          points={pts(l.points)}
          {...EQUIP}
          stroke={l.tone === 'floor' ? 'var(--line)' : EQUIP.stroke}
          strokeOpacity={l.tone === 'floor' ? 1 : EQUIP.strokeOpacity}
          strokeWidth={l.width ?? 2}
        />
      ))}
      {/* Far side limbs, drawn behind the body */}
      <g {...LIMB} stroke={front ? 'var(--text)' : 'var(--muted)'} strokeWidth={front ? 3.6 : 3.2}>
        <polyline points={pts([sk.hip, sk.kneeF, sk.ankleF, sk.toeF])} />
        <polyline points={pts([sk.shoulder, sk.elbowF, sk.handF])} />
      </g>
      {bells
        .filter((b) => b.at === 'handF')
        .map((b, i) => (
          <Dumbbell key={`f${i}`} at={sk.handF} angle={b.angle ?? 0} far={!front} />
        ))}
      {/* Body */}
      <g {...LIMB} stroke="var(--text)">
        <line x1={sk.hip[0]} y1={sk.hip[1]} x2={sk.neck[0]} y2={sk.neck[1]} strokeWidth={4.6} />
        <polyline points={pts([sk.hip, sk.kneeN, sk.ankleN, sk.toeN])} strokeWidth={3.6} />
      </g>
      <circle cx={sk.head[0]} cy={sk.head[1]} r={5.5} fill="var(--text)" />
      {bells
        .filter((b) => b.at === 'hip')
        .map((b, i) => (
          <Dumbbell key={`h${i}`} at={add(sk.hip, b.d ?? [0, 0])} angle={b.angle ?? 0} />
        ))}
      <polyline
        points={pts([sk.shoulder, sk.elbowN, sk.handN])}
        {...LIMB}
        stroke="var(--text)"
        strokeWidth={3.6}
      />
      {bells
        .filter((b) => b.at === 'handN')
        .map((b, i) => (
          <Dumbbell key={`n${i}`} at={sk.handN} angle={b.angle ?? 0} />
        ))}
      {bandBetween && (
        <g stroke="var(--warn)" strokeLinecap="round" fill="var(--warn)">
          <line
            x1={sk.handF[0]}
            y1={sk.handF[1]}
            x2={sk.handN[0]}
            y2={sk.handN[1]}
            strokeWidth={1.6}
          />
          <circle cx={sk.handN[0]} cy={sk.handN[1]} r={1.7} />
          <circle cx={sk.handF[0]} cy={sk.handF[1]} r={1.7} />
        </g>
      )}
      {bands.map((b, i) => (
        <g key={i} stroke="var(--warn)" strokeWidth={1.4} strokeLinecap="round">
          {b.to === 'hands' && (
            <line
              x1={b.from[0]}
              y1={b.from[1]}
              x2={sk.handF[0]}
              y2={sk.handF[1]}
              strokeOpacity={0.6}
            />
          )}
          <line x1={b.from[0]} y1={b.from[1]} x2={sk.handN[0]} y2={sk.handN[1]} />
          <circle cx={b.from[0]} cy={b.from[1]} r={1.8} fill="var(--warn)" />
        </g>
      ))}
    </g>
  );
}

function Dumbbell({ at, angle, far }: { at: Vec; angle: number; far?: boolean }) {
  return (
    <g
      transform={`translate(${at[0].toFixed(2)} ${at[1].toFixed(2)}) rotate(${angle})`}
      fill="var(--accent)"
      opacity={far ? 0.55 : 1}
    >
      <rect x={-5} y={-0.8} width={10} height={1.6} rx={0.8} />
      <rect x={-6.5} y={-3.2} width={2.8} height={6.4} rx={1} />
      <rect x={3.7} y={-3.2} width={2.8} height={6.4} rx={1} />
    </g>
  );
}
