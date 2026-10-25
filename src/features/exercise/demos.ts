/**
 * Stick-figure demo animations, keyed by exercise id. Side view, figure faces right.
 * Poses: `start` = top / lockout / contracted position, `end` = stretched / bottom position.
 * The eccentric phase of the tempo moves start → end, the concentric phase moves back.
 * Coordinates: 120 wide, floor at y = 92.
 */
import {
  buildTimeline,
  DEFAULT_BENDS,
  parseTempo,
  type Bends,
  type Pose,
  type Step,
  type Target,
  type Vec,
} from '../../domain/figure';
import { programSeed } from '../../data/seed';

export type Prop =
  /** Static equipment drawn as thick lines (benches, racks, bars, floor). */
  | { kind: 'line'; points: Vec[]; width?: number; tone?: 'equip' | 'floor' }
  /** A dumbbell held in a hand or resting on the hips. `angle` 0 = horizontal. */
  | { kind: 'dumbbell'; at: 'handN' | 'handF' | 'hip'; d?: Vec; angle?: number }
  /** The yellow resistance band from a fixed anchor to the hand(s). */
  | { kind: 'band'; from: Vec; to: 'handN' | 'hands' }
  /** The band held between both hands (pass-throughs, pull-aparts). */
  | { kind: 'bandBetween' };

export interface Demo {
  viewBox: string;
  /** 'front' draws both sides of the body at full strength (default 'side'). */
  view?: 'side' | 'front';
  props: Prop[];
  poses: Record<string, Pose>;
  /** Poses visited during the eccentric phase (reversed for the concentric). */
  path?: string[];
  /** Phase labels for [eccentric, concentric]. */
  labels: [string, string];
  bends?: Partial<Bends>;
  /** Fully custom rep (e.g. 1.5 reps); otherwise built from the tempo. */
  custom?: { to: string; sec: number; label: string }[];
}

export const VIEWBOX = '0 0 120 96';
const FLOOR: Prop = {
  kind: 'line',
  points: [
    [2, 92.5],
    [118, 92.5],
  ],
  width: 1.5,
  tone: 'floor',
};
const sh = (x: number, y: number): Target => ({ from: 'shoulder', d: [x, y] });
const hp = (x: number, y: number): Target => ({ from: 'hip', d: [x, y] });
const bench = (x1: number, x2: number, y: number): Prop[] => [
  {
    kind: 'line',
    points: [
      [x1, y],
      [x2, y],
    ],
    width: 5,
  },
  {
    kind: 'line',
    points: [
      [x1 + 4, y],
      [x1 + 4, 92],
    ],
    width: 2.5,
  },
  {
    kind: 'line',
    points: [
      [x2 - 4, y],
      [x2 - 4, 92],
    ],
    width: 2.5,
  },
];
const bothDumbbells: Prop[] = [
  { kind: 'dumbbell', at: 'handF' },
  { kind: 'dumbbell', at: 'handN' },
];

// ---- Pull-ups (rack bar) ----

const hang = (labels: [string, string], torsoTop = -95): Demo => {
  // Top: shoulders at bar height, elbows down in front, chin over the bar.
  const shoulderTop: Vec = [54, 7];
  const hipTop: Vec = [
    shoulderTop[0] - 25 * Math.cos((torsoTop * Math.PI) / 180),
    shoulderTop[1] - 25 * Math.sin((torsoTop * Math.PI) / 180),
  ];
  // Knees bent with feet crossed behind, so the dead hang clears the floor.
  const feet = { footN: hp(-12, 26), footF: hp(-14, 25), toeN: 100 };
  return {
    viewBox: '0 -12 120 108',
    props: [
      FLOOR,
      {
        kind: 'line',
        points: [
          [30, -2],
          [30, 92],
        ],
        width: 3,
      },
      {
        kind: 'line',
        points: [
          [90, -2],
          [90, 92],
        ],
        width: 3,
      },
      {
        kind: 'line',
        points: [
          [26, 4],
          [94, 4],
        ],
        width: 2.5,
      },
    ],
    poses: {
      start: { hip: hipTop, torso: torsoTop, handN: [60, 4], handF: [62, 4], ...feet },
      end: { hip: [59, 56], torso: -90, handN: [60, 4], handF: [62, 4], ...feet },
    },
    labels,
  };
};

// ---- Benches ----

const inclineBench: Prop[] = [
  FLOOR,
  {
    kind: 'line',
    points: [
      [48, 74],
      [78, 74],
    ],
    width: 5,
  },
  {
    kind: 'line',
    points: [
      [50, 74],
      [26, 60],
    ],
    width: 5,
  },
  {
    kind: 'line',
    points: [
      [52, 74],
      [52, 92],
    ],
    width: 2.5,
  },
  {
    kind: 'line',
    points: [
      [75, 74],
      [75, 92],
    ],
    width: 2.5,
  },
];

const uprightBench: Prop[] = [
  FLOOR,
  {
    kind: 'line',
    points: [
      [40, 74],
      [66, 74],
    ],
    width: 5,
  },
  {
    kind: 'line',
    points: [
      [44, 74],
      [38, 38],
    ],
    width: 5,
  },
  {
    kind: 'line',
    points: [
      [44, 74],
      [44, 92],
    ],
    width: 2.5,
  },
  {
    kind: 'line',
    points: [
      [63, 74],
      [63, 92],
    ],
    width: 2.5,
  },
];
const seatedBase = {
  hip: [48, 70] as Vec,
  torso: -98,
  footN: [72, 92] as Vec,
  footF: [69, 92] as Vec,
};

const curlBench: Prop[] = [
  FLOOR,
  {
    kind: 'line',
    points: [
      [46, 74],
      [76, 74],
    ],
    width: 5,
  },
  {
    kind: 'line',
    points: [
      [50, 74],
      [32, 48],
    ],
    width: 5,
  },
  {
    kind: 'line',
    points: [
      [50, 74],
      [50, 92],
    ],
    width: 2.5,
  },
  {
    kind: 'line',
    points: [
      [73, 74],
      [73, 92],
    ],
    width: 2.5,
  },
];
const curlBase = {
  hip: [54, 70] as Vec,
  torso: -125,
  footN: [80, 92] as Vec,
  footF: [77, 92] as Vec,
};

const BASE_DEMOS: Record<string, Demo> = {
  pull_up: hang(['Lower', 'Pull']),
  chin_up: hang(['Lower', 'Pull'], -99),
  eccentric_pull_up: hang(['Lower slowly', 'Jump / pull up']),

  bulgarian_split_squat: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(20, 46, 72), { kind: 'dumbbell', at: 'handN', angle: 90 }],
    poses: {
      start: {
        hip: [63, 56],
        torso: -84,
        handN: sh(6, 10),
        handF: sh(4, 10),
        footN: [76, 92],
        footF: [38, 69],
        toeF: 170,
      },
      end: {
        hip: [58, 73],
        torso: -78,
        handN: sh(6, 10),
        handF: sh(4, 10),
        footN: [76, 92],
        footF: [38, 69],
        toeF: 170,
      },
    },
    labels: ['Lower', 'Drive up'],
  },

  incline_db_press: {
    viewBox: VIEWBOX,
    props: [...inclineBench, ...bothDumbbells],
    poses: {
      start: {
        hip: [54, 71],
        torso: -150,
        handN: sh(7, -25),
        handF: sh(5, -25),
        footN: [80, 92],
        footF: [77, 92],
      },
      end: {
        hip: [54, 71],
        torso: -150,
        handN: sh(9, -6),
        handF: sh(7, -6),
        footN: [80, 92],
        footF: [77, 92],
      },
    },
    labels: ['Lower', 'Press'],
  },

  sl_db_rdl: {
    viewBox: VIEWBOX,
    props: [FLOOR, { kind: 'dumbbell', at: 'handN' }],
    poses: {
      start: {
        hip: [58, 55],
        torso: -90,
        handN: sh(1, 26),
        handF: sh(-1, 25),
        footN: [60, 92],
        footF: [55, 90],
      },
      end: {
        hip: [54, 57],
        torso: -12,
        handN: sh(0, 26),
        handF: sh(-2, 25),
        footN: [60, 92],
        footF: [18, 66],
        toeF: 100,
      },
    },
    labels: ['Hinge down', 'Stand'],
  },

  sa_db_row: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(22, 74, 76), { kind: 'dumbbell', at: 'handN' }],
    poses: {
      start: {
        hip: [42, 57],
        torso: -6,
        handN: sh(-13, 9),
        handF: [70, 74],
        footN: [56, 92],
        footF: [24, 74],
        toeF: 180,
      },
      end: {
        hip: [42, 57],
        torso: -6,
        handN: sh(2, 26),
        handF: [70, 74],
        footN: [56, 92],
        footF: [24, 74],
        toeF: 180,
      },
    },
    bends: { elbowF: -1 },
    labels: ['Lower', 'Row'],
  },

  band_pallof_press: {
    viewBox: VIEWBOX,
    props: [
      FLOOR,
      {
        kind: 'line',
        points: [
          [16, 0],
          [16, 92],
        ],
        width: 3,
      },
      { kind: 'band', from: [16, 38], to: 'hands' },
    ],
    poses: {
      start: {
        hip: [60, 57],
        torso: -90,
        handN: sh(9, 7),
        handF: sh(8, 7),
        footN: [63, 92],
        footF: [56, 92],
      },
      end: {
        hip: [60, 57],
        torso: -90,
        handN: sh(25, 6),
        handF: sh(24, 6),
        footN: [63, 92],
        footF: [56, 92],
      },
    },
    labels: ['Press out', 'Return'],
  },

  heels_elevated_goblet_squat: {
    viewBox: VIEWBOX,
    props: [
      FLOOR,
      {
        kind: 'line',
        points: [
          [56, 90],
          [67, 90],
        ],
        width: 3,
      },
      { kind: 'dumbbell', at: 'handN', angle: 90 },
    ],
    poses: {
      start: {
        hip: [60, 54],
        torso: -88,
        handN: sh(6, 9),
        handF: sh(4, 9),
        footN: [64, 89],
        footF: [61, 89],
        toeN: 8,
      },
      half: {
        hip: [58, 67],
        torso: -80,
        handN: sh(6, 9),
        handF: sh(4, 9),
        footN: [64, 89],
        footF: [61, 89],
        toeN: 8,
      },
      end: {
        hip: [55, 79],
        torso: -72,
        handN: sh(6, 9),
        handF: sh(4, 9),
        footN: [64, 89],
        footF: [61, 89],
        toeN: 8,
      },
    },
    labels: ['Lower', 'Stand'],
    // 1.5 reps: down, pause, halfway up, back down, stand.
    custom: [
      { to: 'end', sec: 3, label: 'Lower' },
      { to: 'end', sec: 1, label: 'Pause' },
      { to: 'half', sec: 0.8, label: 'Half up' },
      { to: 'end', sec: 0.8, label: 'Back down' },
      { to: 'start', sec: 1.2, label: 'Stand' },
    ],
  },

  flat_db_press: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(26, 80, 76), ...bothDumbbells],
    poses: {
      start: {
        hip: [66, 72],
        torso: 180,
        handN: sh(1, -26),
        handF: sh(-1, -26),
        footN: [88, 92],
        footF: [85, 92],
      },
      end: {
        hip: [66, 72],
        torso: 180,
        handN: sh(3, -5),
        handF: sh(1, -5),
        footN: [88, 92],
        footF: [85, 92],
      },
    },
    labels: ['Lower', 'Press'],
  },

  sl_db_hip_thrust: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(14, 42, 62), { kind: 'dumbbell', at: 'hip', d: [0, -4] }],
    poses: {
      start: {
        hip: [66, 60],
        torso: 180,
        handN: hp(-1, -5),
        handF: hp(-3, -5),
        footN: [78, 92],
        footF: hp(37, -6),
        toeF: -10,
      },
      end: {
        hip: [60, 80],
        torso: -135,
        handN: hp(-1, -5),
        handF: hp(-3, -5),
        footN: [78, 92],
        footF: hp(37, -6),
        toeF: -10,
      },
    },
    labels: ['Lower', 'Drive up'],
  },

  seated_db_shoulder_press: {
    viewBox: VIEWBOX,
    props: [...uprightBench, ...bothDumbbells],
    poses: {
      start: { ...seatedBase, handN: sh(2, -26), handF: sh(0, -26) },
      end: { ...seatedBase, handN: sh(5, -3), handF: sh(3, -3) },
    },
    labels: ['Lower', 'Press'],
  },

  band_face_pull: {
    viewBox: VIEWBOX,
    props: [
      FLOOR,
      {
        kind: 'line',
        points: [
          [102, 0],
          [102, 92],
        ],
        width: 3,
      },
      { kind: 'band', from: [102, 22], to: 'hands' },
    ],
    poses: {
      start: {
        hip: [54, 56],
        torso: -92,
        handN: sh(3, -9),
        handF: sh(1, -9),
        footN: [57, 92],
        footF: [50, 92],
      },
      end: {
        hip: [54, 56],
        torso: -92,
        handN: sh(26, -4),
        handF: sh(25, -3),
        footN: [57, 92],
        footF: [50, 92],
      },
    },
    bends: { elbowN: -1, elbowF: -1 },
    labels: ['Return', 'Pull apart'],
  },

  sl_box_squat: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(22, 48, 72), { kind: 'dumbbell', at: 'handN' }],
    poses: {
      start: {
        hip: [58, 55],
        torso: -88,
        handN: sh(24, 4),
        handF: sh(23, 5),
        footN: [60, 92],
        footF: [82, 84],
      },
      end: {
        hip: [47, 68],
        torso: -55,
        handN: sh(24, 4),
        handF: sh(23, 5),
        footN: [60, 92],
        footF: [84, 72],
      },
    },
    labels: ['Sit back', 'Stand'],
  },

  decline_push_up: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(4, 30, 74)],
    poses: {
      start: {
        hip: [51.8, 68.4],
        torso: -5.5,
        handN: [73, 92],
        handF: [75, 92],
        footN: [14, 72],
        footF: [16, 72],
        toeN: 95,
      },
      end: {
        hip: [51.2, 79.9],
        torso: 11.8,
        handN: [73, 92],
        handF: [75, 92],
        footN: [14, 72],
        footF: [16, 72],
        toeN: 95,
      },
    },
    labels: ['Lower', 'Push'],
  },

  sl_hamstring_bridge: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(72, 100, 74), { kind: 'dumbbell', at: 'hip', d: [0, -4] }],
    poses: {
      start: {
        hip: [52.9, 75.9],
        torso: 156,
        head: 175,
        handN: hp(-1, -5),
        handF: hp(-3, -5),
        footN: [78, 71],
        toeN: -70,
        footF: hp(10, -36),
        toeF: -30,
      },
      end: {
        hip: [55, 86],
        torso: 180,
        head: 180,
        handN: hp(-1, -5),
        handF: hp(-3, -5),
        footN: [78, 71],
        toeN: -70,
        footF: hp(10, -36),
        toeF: -30,
      },
    },
    labels: ['Lower', 'Lift hips'],
  },

  incline_prone_db_row: {
    viewBox: VIEWBOX,
    props: [
      FLOOR,
      {
        kind: 'line',
        points: [
          [36, 84],
          [72, 59.5],
        ],
        width: 5,
      },
      {
        kind: 'line',
        points: [
          [42, 80],
          [42, 92],
        ],
        width: 2.5,
      },
      {
        kind: 'line',
        points: [
          [68, 62],
          [68, 92],
        ],
        width: 2.5,
      },
      ...bothDumbbells,
    ],
    poses: {
      start: {
        hip: [46, 73],
        torso: -34,
        handN: sh(-12, 10),
        handF: sh(-13, 9),
        footN: [18, 92],
        footF: [21, 92],
      },
      end: {
        hip: [46, 73],
        torso: -34,
        handN: sh(1, 26),
        handF: sh(-1, 26),
        footN: [18, 92],
        footF: [21, 92],
      },
    },
    labels: ['Lower', 'Row'],
  },

  incline_db_curl: {
    viewBox: VIEWBOX,
    props: [...curlBench, ...bothDumbbells],
    poses: {
      start: { ...curlBase, handN: sh(3.4, 1.4), handF: sh(1.4, 1.4) },
      mid: { ...curlBase, handN: sh(13, 14), handF: sh(11, 14) },
      end: { ...curlBase, handN: sh(0, 26), handF: sh(-2, 26) },
    },
    path: ['start', 'mid', 'end'],
    labels: ['Lower', 'Curl'],
  },

  overhead_db_triceps_ext: {
    viewBox: VIEWBOX,
    props: [...uprightBench, { kind: 'dumbbell', at: 'handN', angle: 90 }],
    poses: {
      start: { ...seatedBase, handN: sh(2, -26), handF: sh(1, -26) },
      mid: { ...seatedBase, handN: sh(-10.4, -16), handF: sh(-11.4, -16) },
      end: { ...seatedBase, handN: sh(-2, -1.6), handF: sh(-3, -1.6) },
    },
    path: ['start', 'mid', 'end'],
    labels: ['Lower behind head', 'Extend'],
  },
};

export function bendsFor(demo: Demo): Bends {
  return { ...DEFAULT_BENDS, ...demo.bends };
}

export function timelineFor(demo: Demo, tempo: string): Step[] {
  if (demo.custom) {
    let from = 'start';
    return demo.custom.map((c) => {
      const step = { from, to: c.to, sec: c.sec, label: c.label };
      from = c.to;
      return step;
    });
  }
  return buildTimeline(parseTempo(tempo), demo.path, demo.labels);
}

/** The tempo the program prescribes for an exercise (first day it appears in). */
export function programTempo(exerciseId: string): string {
  return (
    programSeed.days.flatMap((d) => d.items).find((i) => i.exerciseId === exerciseId)?.tempo ??
    '2-0-1-0'
  );
}

/** YouTube search for a form demo; opens outside the app (needs internet). */
export function demoSearchUrl(exerciseName: string, suffix = 'exercise proper form'): string {
  const q = `${exerciseName.replace(/\(.*?\)/g, '').trim()} ${suffix}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

// ---- Warm-up ----

export interface WarmupDemo {
  /** Caption when an item has more than one movement (squat + bridge). */
  title?: string;
  demo: Demo;
}

const standingBase = {
  hip: [60, 55] as Vec,
  torso: -90,
  footN: [63, 92] as Vec,
  footF: [57, 92] as Vec,
};

/** Straight-arm poses every ~45° around the shoulder, for smooth arm circles. */
function armArc(angles: number[], scale = 26.5): Record<string, Pose> {
  const poses: Record<string, Pose> = {};
  angles.forEach((deg, i) => {
    const r = (deg * Math.PI) / 180;
    const d: Vec = [Math.cos(r) * scale, Math.sin(r) * scale];
    poses[i === 0 ? 'start' : `p${i}`] = {
      ...standingBase,
      handN: sh(d[0], d[1]),
      handF: sh(d[0] - 1.5, d[1]),
    };
  });
  return poses;
}

// Front of the thighs → up and over the head → behind the hips (decreasing angle = over the top).
const PASS_ANGLES = [80, 40, 0, -40, -80, -120, -160, 160, 115];
const passThrough = armArc(PASS_ANGLES);
const passKeys = Object.keys(passThrough);

const hangFrame = hang(['', '']);

export const WARMUP_DEMOS: Record<string, WarmupDemo[]> = {
  wu_pass_through: [
    {
      demo: {
        viewBox: VIEWBOX,
        props: [FLOOR, { kind: 'bandBetween' }],
        poses: passThrough,
        labels: ['Over the head', 'Back to the front'],
        custom: [
          ...passKeys
            .slice(1)
            .map((k) => ({ to: k, sec: 0.3, label: 'Over the head, arms straight' })),
          { to: passKeys[passKeys.length - 1], sec: 0.4, label: 'Behind the hips' },
          ...passKeys
            .slice(0, -1)
            .reverse()
            .map((k) => ({ to: k, sec: 0.3, label: 'Back to the front' })),
          { to: 'start', sec: 0.4, label: 'Start' },
        ],
      },
    },
  ],

  wu_pull_apart: [
    {
      demo: {
        viewBox: VIEWBOX,
        view: 'front',
        props: [FLOOR, { kind: 'bandBetween' }],
        poses: {
          // Arms straight out in front (pointing at you), then pulled out wide.
          start: {
            ...standingBase,
            footN: [66, 92],
            footF: [54, 92],
            handN: sh(5.2, 1),
            handF: sh(-5.2, 1),
            armScale: 0.2,
          },
          end: {
            ...standingBase,
            footN: [66, 92],
            footF: [54, 92],
            handN: sh(26.5, 0),
            handF: sh(-26.5, 0),
          },
        },
        bends: { kneeF: 1 },
        labels: ['Pull apart, squeeze shoulder blades', 'Return slowly'],
        custom: [
          { to: 'end', sec: 1, label: 'Pull apart, arms straight' },
          { to: 'end', sec: 0.8, label: 'Squeeze shoulder blades' },
          { to: 'start', sec: 1.2, label: 'Return slowly' },
        ],
      },
    },
  ],

  wu_scap_pullup: [
    {
      demo: {
        ...hangFrame,
        poses: {
          // Shoulder blades pulled down: body rises a little, arms stay straight.
          start: {
            hip: [60, 52],
            torso: -90,
            handN: [60, 4],
            handF: [62, 4],
            armScale: 0.86,
            footN: hp(-12, 26),
            footF: hp(-14, 25),
            toeN: 100,
          },
          end: {
            hip: [60, 56],
            torso: -90,
            handN: [60, 4],
            handF: [62, 4],
            footN: hp(-12, 26),
            footF: hp(-14, 25),
            toeN: 100,
          },
        },
        labels: ['Relax', 'Shoulder blades down'],
        custom: [
          { to: 'end', sec: 1, label: 'Relax into a dead hang' },
          { to: 'end', sec: 0.5, label: 'Arms stay straight' },
          { to: 'start', sec: 1, label: 'Pull shoulder blades down' },
          { to: 'start', sec: 0.8, label: 'Hold' },
        ],
      },
    },
  ],

  wu_wgs: [
    {
      demo: {
        viewBox: VIEWBOX,
        props: [FLOOR],
        poses: {
          start: {
            hip: [52, 72],
            torso: -8,
            handN: [84, 91],
            handF: [80, 91],
            footN: [80, 92],
            footF: [18, 90],
            toeF: 90,
          },
          elbow: {
            hip: [52, 74],
            torso: 4,
            handN: [86, 91],
            handF: [82, 91],
            footN: [80, 92],
            footF: [18, 90],
            toeF: 90,
          },
          open: {
            hip: [52, 72],
            torso: -15,
            head: -75,
            handN: sh(1, -27),
            handF: [80, 91],
            footN: [80, 92],
            footF: [18, 90],
            toeF: 90,
          },
        },
        bends: { elbowN: -1, elbowF: -1 },
        labels: ['Stretch', 'Return'],
        custom: [
          { to: 'elbow', sec: 1.4, label: 'Elbow to instep' },
          { to: 'elbow', sec: 1, label: 'Hold the stretch' },
          { to: 'start', sec: 1, label: 'Hands down' },
          { to: 'open', sec: 1.4, label: 'Rotate open, reach up' },
          { to: 'open', sec: 1.2, label: 'Look at your hand' },
          { to: 'start', sec: 1, label: 'Back to the lunge' },
        ],
      },
    },
  ],

  wu_squat_bridge: [
    {
      title: 'Bodyweight squat',
      demo: {
        viewBox: VIEWBOX,
        props: [FLOOR],
        poses: {
          start: { ...standingBase, handN: sh(4, 25), handF: sh(2, 25) },
          end: {
            hip: [52, 75],
            torso: -58,
            handN: sh(25, 1),
            handF: sh(24, 2),
            footN: [63, 92],
            footF: [60, 92],
          },
        },
        labels: ['Sit down', 'Stand up'],
        custom: [
          { to: 'end', sec: 1.5, label: 'Sit down, full range' },
          { to: 'end', sec: 0.5, label: 'Bottom' },
          { to: 'start', sec: 1.2, label: 'Stand up' },
        ],
      },
    },
    {
      title: 'Glute bridge',
      demo: {
        viewBox: VIEWBOX,
        props: [FLOOR],
        poses: {
          start: {
            hip: [55, 86],
            torso: 180,
            head: 180,
            handN: [46, 91],
            handF: [44, 91],
            footN: [72, 92],
            footF: [70, 92],
          },
          end: {
            hip: [54, 74],
            torso: 153.4,
            head: 175,
            handN: [46, 91],
            handF: [44, 91],
            footN: [72, 92],
            footF: [70, 92],
          },
        },
        labels: ['Lift hips', 'Lower'],
        custom: [
          { to: 'end', sec: 1.2, label: 'Squeeze glutes, lift hips' },
          { to: 'end', sec: 0.8, label: 'Hold' },
          { to: 'start', sec: 1.2, label: 'Lower with control' },
        ],
      },
    },
  ],
};

// ---- Lady version: her exercises (light loads, bodyweight-first) ----

const noDumbbells = (d: Demo): Demo => ({
  ...d,
  props: d.props.filter((p) => p.kind !== 'dumbbell'),
});

const withPoses = (d: Demo, patch: Partial<Pose>): Demo => ({
  ...d,
  poses: Object.fromEntries(Object.entries(d.poses).map(([k, p]) => [k, { ...p, ...patch }])),
});

const LADY_DEMOS: Record<string, Demo> = {
  goblet_box_squat: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(22, 48, 72), { kind: 'dumbbell', at: 'handN', angle: 90 }],
    poses: {
      start: {
        hip: [58, 55],
        torso: -88,
        handN: sh(6, 10),
        handF: sh(4, 10),
        footN: [62, 92],
        footF: [59, 92],
      },
      end: {
        hip: [48, 68],
        torso: -62,
        handN: sh(6, 10),
        handF: sh(4, 10),
        footN: [62, 92],
        footF: [59, 92],
      },
    },
    labels: ['Sit back to the bench', 'Stand up'],
  },

  band_lat_pulldown: {
    viewBox: hangFrame.viewBox,
    props: [...hangFrame.props, { kind: 'band', from: [60, 4], to: 'hands' }],
    poses: {
      // Kneeling under the bar; start = elbows pulled down to the sides.
      start: {
        hip: [60, 71],
        torso: -95,
        handN: sh(5, -3),
        handF: sh(3, -3),
        footN: [42, 91],
        footF: [40, 91],
        toeN: 180,
      },
      end: {
        hip: [60, 71],
        torso: -95,
        handN: sh(2, -26),
        handF: sh(0, -26),
        footN: [42, 91],
        footF: [40, 91],
        toeN: 180,
      },
    },
    labels: ['Arms up slowly', 'Pull elbows down'],
  },

  db_rdl: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bothDumbbells],
    poses: {
      start: {
        hip: [58, 55],
        torso: -90,
        handN: sh(1, 26),
        handF: sh(-1, 26),
        footN: [60, 92],
        footF: [57, 92],
      },
      end: {
        hip: [50, 58],
        torso: -15,
        handN: sh(0, 26),
        handF: sh(-2, 26),
        footN: [60, 92],
        footF: [57, 92],
      },
    },
    labels: ['Hinge down', 'Squeeze glutes, stand'],
  },

  incline_push_up: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(60, 92, 72)],
    poses: {
      // Body rotates about the feet; arms roughly perpendicular to the body at the top.
      start: {
        hip: [39.8, 65.05],
        torso: -43,
        handN: [70, 70],
        handF: [72, 70],
        footN: [12, 91],
        footF: [14, 91],
        toeN: 15,
      },
      end: {
        hip: [45, 72],
        torso: -30,
        handN: [70, 70],
        handF: [72, 70],
        footN: [12, 91],
        footF: [14, 91],
        toeN: 15,
      },
    },
    labels: ['Lower chest to the bench', 'Push away'],
  },

  db_hip_thrust: {
    viewBox: VIEWBOX,
    props: [FLOOR, ...bench(14, 42, 62), { kind: 'dumbbell', at: 'hip', d: [0, -4] }],
    poses: {
      start: {
        hip: [66, 60],
        torso: 180,
        handN: hp(-1, -5),
        handF: hp(-3, -5),
        footN: [78, 92],
        footF: [75, 92],
      },
      end: {
        hip: [60, 80],
        torso: -135,
        handN: hp(-1, -5),
        handF: hp(-3, -5),
        footN: [78, 92],
        footF: [75, 92],
      },
    },
    labels: ['Lower', 'Drive hips up'],
  },

  dead_bug: {
    viewBox: VIEWBOX,
    props: [FLOOR],
    poses: {
      // On the back: arms to the ceiling, knees bent 90° over the hips.
      start: {
        hip: [60, 87],
        torso: 180,
        head: 180,
        handN: sh(0, -26),
        handF: sh(-1.5, -26),
        footN: [79, 68],
        footF: [77, 68],
        toeN: -80,
      },
      end: {
        hip: [60, 87],
        torso: 180,
        head: 180,
        handN: sh(0, -26),
        handF: sh(-26, -3),
        footN: [97, 82],
        footF: [77, 68],
        toeN: -10,
        toeF: -80,
      },
    },
    labels: ['Reach arm and opposite leg out', 'Return'],
  },

  db_reverse_lunge: {
    viewBox: VIEWBOX,
    props: [FLOOR],
    poses: {
      start: {
        hip: [60, 55],
        torso: -90,
        handN: hp(4, -1),
        handF: hp(2, -1),
        footN: [62, 92],
        footF: [59, 92],
      },
      end: {
        hip: [55, 72],
        torso: -86,
        handN: hp(4, -1),
        handF: hp(2, -1),
        footN: [64, 92],
        footF: [26, 90],
        toeF: 90,
      },
    },
    labels: ['Step back and lower', 'Drive up'],
  },

  bench_step_up: {
    viewBox: '0 -10 120 106',
    props: [FLOOR, ...bench(66, 96, 72)],
    poses: {
      start: {
        hip: [74, 36],
        torso: -88,
        handN: sh(1, 25),
        handF: sh(-1, 25),
        footN: [76, 70],
        footF: [72, 70],
      },
      end: {
        hip: [56, 57],
        torso: -80,
        handN: sh(1, 25),
        handF: sh(-1, 25),
        footN: [76, 70],
        footF: [52, 92],
      },
    },
    labels: ['Step down slowly', 'Step up'],
  },

  lateral_raise: {
    viewBox: VIEWBOX,
    view: 'front',
    props: [
      FLOOR,
      { kind: 'dumbbell', at: 'handF', angle: 90 },
      { kind: 'dumbbell', at: 'handN', angle: 90 },
    ],
    poses: {
      start: {
        hip: [60, 55],
        torso: -90,
        handN: sh(25.5, 4),
        handF: sh(-25.5, 4),
        footN: [66, 92],
        footF: [54, 92],
      },
      end: {
        hip: [60, 55],
        torso: -90,
        handN: sh(7, 25),
        handF: sh(-7, 25),
        footN: [66, 92],
        footF: [54, 92],
      },
    },
    bends: { kneeF: 1, elbowF: -1 },
    labels: ['Lower slowly', 'Raise to shoulder height'],
  },

  // ---- Program v2: home versions of her gym plan's machine / cable moves ----

  side_lying_hip_abduction: {
    viewBox: VIEWBOX,
    // Seen from in front while she lies on her side: the top leg lifts towards the ceiling.
    view: 'front',
    props: [FLOOR],
    poses: {
      start: {
        hip: [64, 87],
        torso: 180,
        head: 180,
        handN: hp(-3, -3),
        handF: [14, 89],
        footN: [97.4, 69.3],
        footF: [101.8, 89],
        toeN: -28,
      },
      end: {
        hip: [64, 87],
        torso: 180,
        head: 180,
        handN: hp(-3, -3),
        handF: [14, 89],
        footN: [101.8, 87],
        footF: [101.8, 89],
      },
    },
    bends: { elbowN: -1, elbowF: -1 },
    labels: ['Lower slowly', 'Lift top leg, heel first'],
  },

  glute_kickback: {
    viewBox: VIEWBOX,
    props: [FLOOR],
    poses: {
      // On all fours: hands under shoulders, knees under hips.
      start: {
        hip: [40, 70],
        torso: -9,
        handN: [66, 91],
        handF: [64, 91],
        footN: [6, 58],
        footF: [24, 90],
        toeN: 180,
        toeF: 180,
      },
      end: {
        hip: [40, 70],
        torso: -9,
        handN: [66, 91],
        handF: [64, 91],
        footN: [26, 90],
        footF: [24, 90],
        toeN: 180,
        toeF: 180,
      },
    },
    labels: ['Knee back under hip', 'Kick back and squeeze'],
  },

  reverse_crunch: {
    viewBox: VIEWBOX,
    props: [FLOOR],
    poses: {
      // Knees curled to the chest, hips slightly off the floor.
      start: {
        hip: [60, 82],
        torso: 168,
        head: 180,
        handN: [60, 91],
        handF: [58, 91],
        footN: [64, 62],
        footF: [62, 62],
        toeN: -60,
      },
      end: {
        hip: [60, 87],
        torso: 180,
        head: 180,
        handN: [60, 91],
        handF: [58, 91],
        footN: [80, 74],
        footF: [78, 74],
        toeN: -10,
      },
    },
    bends: { elbowN: -1, elbowF: -1 },
    labels: ['Lower slowly', 'Curl knees to chest'],
  },

  band_triceps_pushdown: {
    viewBox: hangFrame.viewBox,
    props: [...hangFrame.props, { kind: 'band', from: [66, 4], to: 'hands' }],
    poses: {
      // Elbows pinned at the sides; only the forearms move.
      start: {
        hip: [58, 55],
        torso: -86,
        handN: sh(3, 26),
        handF: sh(1, 26),
        footN: [60, 92],
        footF: [56, 92],
      },
      mid: {
        hip: [58, 55],
        torso: -86,
        handN: sh(13, 14),
        handF: sh(11, 14),
        footN: [60, 92],
        footF: [56, 92],
      },
      end: {
        hip: [58, 55],
        torso: -86,
        handN: sh(6.5, 2.7),
        handF: sh(4.5, 2.7),
        footN: [60, 92],
        footF: [56, 92],
      },
    },
    path: ['start', 'mid', 'end'],
    labels: ['Let hands rise to chest', 'Push down, elbows still'],
  },

  // Bodyweight versions of shared exercises.
  bulgarian_split_squat: noDumbbells(BASE_DEMOS.bulgarian_split_squat),
  sl_hamstring_bridge: {
    ...withPoses(noDumbbells(BASE_DEMOS.sl_hamstring_bridge), {
      handN: [40, 91],
      handF: [38, 91],
    }),
    // Hands rest on the floor, so elbows bend upwards rather than through the floor.
    bends: { elbowN: -1, elbowF: -1 },
  },
};

export const DEMOS: Record<string, Demo> = { ...BASE_DEMOS, ...LADY_DEMOS };
