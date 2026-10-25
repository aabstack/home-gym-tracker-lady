import {
  BONES,
  buildSkeleton,
  buildTimeline,
  dist,
  easeInOut,
  lerpAngle,
  lerpPose,
  parseTempo,
  resolveTarget,
  sampleTimeline,
  solveLimb,
  timelineLength,
  type Pose,
} from './figure';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

const standing: Pose = {
  hip: [60, 55],
  torso: -90,
  handN: { from: 'shoulder', d: [0, 26] },
  footN: [60, 92],
};
const squat: Pose = {
  hip: [55, 75],
  torso: -70,
  handN: { from: 'shoulder', d: [6, 9] },
  footN: [62, 92],
};

describe('figure engine', () => {
  it('IK keeps bone lengths and reaches reachable targets', () => {
    const { joint, end } = solveLimb([0, 0], [10, 20], 19, 19, -1);
    close(dist([0, 0], joint), 19);
    close(dist(joint, end), 19);
    close(end[0], 10);
    close(end[1], 20);
  });

  it('IK bend direction picks the side of the joint', () => {
    // Leg straight down: bend -1 puts the knee in front (right), +1 behind.
    expect(solveLimb([0, 0], [0, 30], 19, 19, -1).joint[0]).toBeGreaterThan(0);
    expect(solveLimb([0, 0], [0, 30], 19, 19, 1).joint[0]).toBeLessThan(0);
  });

  it('IK clamps unreachable targets to a straight limb', () => {
    const { joint, end } = solveLimb([0, 0], [100, 0], 14, 13, 1);
    close(end[0], 27, 1e-4);
    close(joint[0], 14, 1e-3);
    // Target on the root itself doesn't produce NaN.
    const z = solveLimb([5, 5], [5, 5], 14, 13, 1);
    expect(Number.isFinite(z.joint[0]) && Number.isFinite(z.end[1])).toBe(true);
  });

  it('skeleton bones stay the same length through a blend', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const sk = buildSkeleton(lerpPose(standing, squat, t));
      close(dist(sk.hip, sk.shoulder), BONES.torso);
      close(dist(sk.shoulder, sk.elbowN), BONES.upperArm);
      close(dist(sk.elbowN, sk.handN), BONES.forearm);
      close(dist(sk.hip, sk.kneeN), BONES.thigh);
      close(dist(sk.kneeN, sk.ankleN), BONES.shin);
      close(dist(sk.hip, sk.kneeF), BONES.thigh);
      close(dist(sk.ankleN, sk.toeN), BONES.foot);
    }
  });

  it('feet stay planted while the body moves', () => {
    const sk = buildSkeleton(lerpPose(standing, squat, 0.5));
    close(sk.ankleN[1], 92, 1e-6);
  });

  it('shoulder-relative targets follow the torso', () => {
    expect(resolveTarget({ from: 'shoulder', d: [1, 2] }, [0, 0], [10, 10])).toEqual([11, 12]);
    expect(resolveTarget({ from: 'hip', d: [1, 2] }, [0, 0], [10, 10])).toEqual([1, 2]);
    expect(resolveTarget([3, 4], [0, 0], [10, 10])).toEqual([3, 4]);
    // Mixed absolute/relative targets still blend.
    const mixed = lerpPose(standing, { ...squat, handN: [70, 60] }, 0.5);
    expect(Array.isArray(mixed.handN)).toBe(true);
  });

  it('angles blend the short way round', () => {
    expect(lerpAngle(180, -135, 0.5)).toBeCloseTo(202.5);
    expect(lerpAngle(-170, 170, 0.5)).toBeCloseTo(-180);
    expect(lerpAngle(10, 30, 0.5)).toBeCloseTo(20);
  });

  it('armScale shortens arms proportionally and blends', () => {
    const sk = buildSkeleton({ ...standing, armScale: 0.5 });
    close(dist(sk.shoulder, sk.elbowN), BONES.upperArm * 0.5);
    close(dist(sk.elbowN, sk.handN), BONES.forearm * 0.5);
    expect(lerpPose({ ...standing, armScale: 0.2 }, standing, 0.5).armScale).toBeCloseTo(0.6);
  });

  it('lerpPose returns the endpoints exactly', () => {
    expect(lerpPose(standing, squat, 0)).toBe(standing);
    expect(lerpPose(standing, squat, 1)).toBe(squat);
  });
});

describe('tempo timeline', () => {
  it('parses tempo strings', () => {
    expect(parseTempo('3-1-1-0')).toEqual({ eccentric: 3, bottom: 1, concentric: 1, top: 0 });
    expect(parseTempo('bad')).toEqual({ eccentric: 2, bottom: 0, concentric: 1, top: 0 });
    expect(parseTempo('3-x-1-0').eccentric).toBe(2);
  });

  it('builds eccentric → pause → concentric → hold', () => {
    const steps = buildTimeline(parseTempo('3-1-1-2'));
    expect(steps.map((s) => [s.from, s.to, s.sec, s.label])).toEqual([
      ['start', 'end', 3, 'Lower'],
      ['end', 'end', 1, 'Pause'],
      ['end', 'start', 1, 'Lift'],
      ['start', 'start', 2, 'Hold'],
    ]);
    expect(timelineLength(steps)).toBe(7);
  });

  it('splits phases across a multi-pose path and skips zero pauses', () => {
    const steps = buildTimeline(parseTempo('3-0-0-0'), ['start', 'mid', 'end'], ['Down', 'Up']);
    expect(steps.map((s) => `${s.from}>${s.to}:${s.sec}`)).toEqual([
      'start>mid:1.5',
      'mid>end:1.5',
      'end>mid:0.25',
      'mid>start:0.25',
    ]);
  });

  it('samples and loops', () => {
    const steps = buildTimeline(parseTempo('2-0-2-0'));
    expect(sampleTimeline(steps, 0)).toMatchObject({ index: 0, alpha: 0 });
    expect(sampleTimeline(steps, 1).alpha).toBeCloseTo(0.5);
    expect(sampleTimeline(steps, 3)).toMatchObject({ index: 1 });
    expect(sampleTimeline(steps, 5).index).toBe(0); // loops after 4 s
    expect(sampleTimeline(steps, 3.5).remaining).toBeCloseTo(0.5);
    expect(() => sampleTimeline([], 1)).toThrow();
  });

  it('eases in and out', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBeCloseTo(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(2)).toBeCloseTo(1);
  });
});
