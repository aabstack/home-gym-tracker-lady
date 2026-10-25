/**
 * Stick-figure animation engine for the exercise demos (side view, facing right).
 *
 * Coordinates are SVG units with y pointing down. Angles are in degrees:
 * 0 = right (in front of the figure), 90 = down, 180 / -180 = left (behind), -90 = up.
 * Hands and feet are placed with 2-bone inverse kinematics, so bones keep their length
 * and hands/feet stay on the bar, bench or floor while the body moves.
 */

export type Vec = readonly [number, number];

/** An absolute point, or an offset from the shoulder or hip (so it moves with the body). */
export type Target = Vec | { from: 'shoulder' | 'hip'; d: Vec };

export interface Pose {
  hip: Vec;
  /** Direction from hip to shoulder. */
  torso: number;
  /** Direction of the head from the neck; defaults to the torso direction. */
  head?: number;
  handN: Target;
  /** Far-side hand; defaults to the near hand shifted slightly. */
  handF?: Target;
  footN: Target;
  footF?: Target;
  /** Toe direction from the ankle (default 0 = pointing forward). */
  toeN?: number;
  toeF?: number;
  /**
   * Arm length factor (default 1). Below 1 draws arms foreshortened, i.e. pointing towards or
   * away from the viewer (front-view pull-aparts, shoulder-blade-only movements).
   */
  armScale?: number;
}

export type Bend = 1 | -1;
/** Which side each elbow/knee bends to: +1 rotates clockwise from the hip→foot line on screen. */
export interface Bends {
  elbowN: Bend;
  elbowF: Bend;
  kneeN: Bend;
  kneeF: Bend;
}

export const DEFAULT_BENDS: Bends = { elbowN: 1, elbowF: 1, kneeN: -1, kneeF: -1 };

export const BONES = {
  torso: 25,
  neck: 3,
  head: 9,
  headRadius: 5.5,
  upperArm: 14,
  forearm: 13,
  thigh: 19,
  shin: 19,
  foot: 6,
} as const;

const FAR_HAND_SHIFT: Vec = [-2.5, -1];
const FAR_FOOT_SHIFT: Vec = [-3, 0];

export interface Skeleton {
  hip: Vec;
  shoulder: Vec;
  neck: Vec;
  head: Vec;
  elbowN: Vec;
  handN: Vec;
  elbowF: Vec;
  handF: Vec;
  kneeN: Vec;
  ankleN: Vec;
  toeN: Vec;
  kneeF: Vec;
  ankleF: Vec;
  toeF: Vec;
}

const RAD = Math.PI / 180;

export function dir(deg: number, len = 1): Vec {
  return [Math.cos(deg * RAD) * len, Math.sin(deg * RAD) * len];
}

export function add(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1]];
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate angles along the shortest way round (e.g. 180 → -135 goes through 202.5). */
export function lerpAngle(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return a + delta * t;
}

function lerpVec(a: Vec, b: Vec, t: number): Vec {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

/**
 * 2-bone IK: places the middle joint so that root→joint = l1 and joint→end = l2, reaching
 * towards `target`. Out-of-reach targets are clamped (the limb points straight at them).
 */
export function solveLimb(root: Vec, target: Vec, l1: number, l2: number, bend: Bend) {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const raw = Math.hypot(dx, dy);
  const d = Math.min(Math.max(raw, Math.abs(l1 - l2) + 1e-6), l1 + l2 - 1e-6);
  const base = raw < 1e-9 ? 90 : Math.atan2(dy, dx) / RAD;
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA))) / RAD;
  const joint = add(root, dir(base + bend * a, l1));
  const end = add(root, dir(base, d));
  return { joint, end };
}

export function shoulderOf(pose: Pick<Pose, 'hip' | 'torso'>): Vec {
  return add(pose.hip, dir(pose.torso, BONES.torso));
}

export function resolveTarget(t: Target, hip: Vec, shoulder: Vec): Vec {
  if (Array.isArray(t)) return t as Vec;
  const o = t as { from: 'shoulder' | 'hip'; d: Vec };
  return add(o.from === 'hip' ? hip : shoulder, o.d);
}

function farTarget(t: Target | undefined, near: Target, shift: Vec): Target {
  if (t) return t;
  if (Array.isArray(near)) return add(near as Vec, shift);
  const o = near as { from: 'shoulder' | 'hip'; d: Vec };
  return { from: o.from, d: add(o.d, shift) };
}

function lerpTarget(
  a: Target,
  b: Target,
  t: number,
  hipA: Vec,
  shA: Vec,
  hipB: Vec,
  shB: Vec,
): Target {
  const aRel = !Array.isArray(a);
  const bRel = !Array.isArray(b);
  if (aRel && bRel) {
    const ao = a as { from: 'shoulder' | 'hip'; d: Vec };
    const bo = b as { from: 'shoulder' | 'hip'; d: Vec };
    if (ao.from === bo.from) return { from: ao.from, d: lerpVec(ao.d, bo.d, t) };
  }
  return lerpVec(resolveTarget(a, hipA, shA), resolveTarget(b, hipB, shB), t);
}

/** Blend two poses; t = 0 gives `a`, t = 1 gives `b`. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const shA = shoulderOf(a);
  const shB = shoulderOf(b);
  const lt = (x: Target, y: Target) => lerpTarget(x, y, t, a.hip, shA, b.hip, shB);
  return {
    hip: lerpVec(a.hip, b.hip, t),
    torso: lerpAngle(a.torso, b.torso, t),
    head: lerpAngle(a.head ?? a.torso, b.head ?? b.torso, t),
    handN: lt(a.handN, b.handN),
    handF: lt(
      farTarget(a.handF, a.handN, FAR_HAND_SHIFT),
      farTarget(b.handF, b.handN, FAR_HAND_SHIFT),
    ),
    footN: lt(a.footN, b.footN),
    footF: lt(
      farTarget(a.footF, a.footN, FAR_FOOT_SHIFT),
      farTarget(b.footF, b.footN, FAR_FOOT_SHIFT),
    ),
    toeN: lerpAngle(a.toeN ?? 0, b.toeN ?? 0, t),
    toeF: lerpAngle(a.toeF ?? a.toeN ?? 0, b.toeF ?? b.toeN ?? 0, t),
    armScale: lerp(a.armScale ?? 1, b.armScale ?? 1, t),
  };
}

/** Joint positions for a pose. */
export function buildSkeleton(pose: Pose, bends: Bends = DEFAULT_BENDS): Skeleton {
  const hip = pose.hip;
  const shoulder = shoulderOf(pose);
  const neck = add(hip, dir(pose.torso, BONES.torso + BONES.neck));
  const head = add(neck, dir(pose.head ?? pose.torso, BONES.head - BONES.neck));
  const k = pose.armScale ?? 1;
  const arm = (t: Target, bend: Bend) =>
    solveLimb(
      shoulder,
      resolveTarget(t, hip, shoulder),
      BONES.upperArm * k,
      BONES.forearm * k,
      bend,
    );
  const leg = (t: Target, bend: Bend) =>
    solveLimb(hip, resolveTarget(t, hip, shoulder), BONES.thigh, BONES.shin, bend);

  const aN = arm(pose.handN, bends.elbowN);
  const aF = arm(farTarget(pose.handF, pose.handN, FAR_HAND_SHIFT), bends.elbowF);
  const lN = leg(pose.footN, bends.kneeN);
  const lF = leg(farTarget(pose.footF, pose.footN, FAR_FOOT_SHIFT), bends.kneeF);
  return {
    hip,
    shoulder,
    neck,
    head,
    elbowN: aN.joint,
    handN: aN.end,
    elbowF: aF.joint,
    handF: aF.end,
    kneeN: lN.joint,
    ankleN: lN.end,
    toeN: add(lN.end, dir(pose.toeN ?? 0, BONES.foot)),
    kneeF: lF.joint,
    ankleF: lF.end,
    toeF: add(lF.end, dir(pose.toeF ?? pose.toeN ?? 0, BONES.foot)),
  };
}

// ---- Tempo timeline ----

export interface Tempo {
  eccentric: number;
  bottom: number;
  concentric: number;
  top: number;
}

/** "3-1-1-0" → seconds for each phase. Falls back to 2-0-1-0 if unparsable. */
export function parseTempo(tempo: string): Tempo {
  const parts = tempo.split('-').map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    return { eccentric: 2, bottom: 0, concentric: 1, top: 0 };
  }
  const [eccentric, bottom, concentric, top] = parts;
  return { eccentric, bottom, concentric, top };
}

export interface Step {
  from: string;
  to: string;
  sec: number;
  label: string;
}

/** Shortest time a movement is shown for, so "0 s" phases are still visible. */
export const MIN_MOVE_SEC = 0.5;

/**
 * One rep following the tempo: eccentric along `path` (start → … → end), pause, concentric
 * back along the path, pause at the top.
 */
export function buildTimeline(
  tempo: Tempo,
  path: readonly string[] = ['start', 'end'],
  labels: readonly [string, string] = ['Lower', 'Lift'],
): Step[] {
  const steps: Step[] = [];
  const segs = Math.max(1, path.length - 1);
  const ecc = Math.max(tempo.eccentric, MIN_MOVE_SEC) / segs;
  const con = Math.max(tempo.concentric, MIN_MOVE_SEC) / segs;
  for (let i = 0; i < path.length - 1; i++) {
    steps.push({ from: path[i], to: path[i + 1], sec: ecc, label: labels[0] });
  }
  const last = path[path.length - 1];
  if (tempo.bottom > 0) steps.push({ from: last, to: last, sec: tempo.bottom, label: 'Pause' });
  for (let i = path.length - 1; i > 0; i--) {
    steps.push({ from: path[i], to: path[i - 1], sec: con, label: labels[1] });
  }
  if (tempo.top > 0) steps.push({ from: path[0], to: path[0], sec: tempo.top, label: 'Hold' });
  return steps;
}

export function timelineLength(steps: readonly Step[]): number {
  return steps.reduce((t, s) => t + s.sec, 0);
}

export function easeInOut(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
}

/** Where the animation is at time `t` seconds (looping). */
export function sampleTimeline(steps: readonly Step[], t: number) {
  const total = timelineLength(steps);
  let local = total > 0 ? ((t % total) + total) % total : 0;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (local < s.sec || i === steps.length - 1) {
      const raw = s.sec > 0 ? Math.min(1, local / s.sec) : 1;
      return { step: s, index: i, alpha: easeInOut(raw), remaining: Math.max(0, s.sec - local) };
    }
    local -= s.sec;
  }
  throw new Error('empty timeline');
}
