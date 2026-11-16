/**
 * The cube lab's structure, words and universes. Geometry is ours: a 9 x 9
 * terraced crater whose columns rise one cube per ring, from 1 at the centre
 * to 5 at the rim (321 cubes, five faces each, one draw call).
 */

export const GRID = 9;
export const HALF = (GRID - 1) / 2;
export const CUBE = 0.96;

/** Face order inside a cube's five instances. */
export const FACE = { top: 0, px: 1, nx: 2, pz: 3, nz: 4 } as const;
export const FACES_PER_CUBE = 5;

export type Cube = { i: number; j: number; k: number; colH: number; ring: number; hash: number };

const hash = (i: number, j: number, k: number) => {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

export const ringOf = (i: number, j: number) => Math.max(Math.abs(i - HALF), Math.abs(j - HALF));

export function buildCubes(): Cube[] {
  const cubes: Cube[] = [];
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const ring = ringOf(i, j);
      const colH = ring + 1;
      for (let k = 0; k < colH; k++) cubes.push({ i, j, k, colH, ring, hash: hash(i, j, k) });
    }
  return cubes;
}

/**
 * Columns whose top face carries a front word (words mode) or a recording
 * (universes mode), listed in reading order for the final top-down view,
 * where screen up is -x and screen right is -z.
 */
export const FEATURED: [number, number][] = [
  [2, 6],
  [2, 3],
  [4, 5],
  [4, 2],
  [6, 6],
  [6, 3],
];

export type WallPhrase = { face: "pz" | "nx" | "px"; level: number; start: number };

/** Where the side phrases sit on the rim walls, one word per face. */
export const WALLS: WallPhrase[] = [
  { face: "pz", level: 3, start: 1 },
  { face: "nx", level: 1, start: 2 },
  { face: "px", level: 2, start: 5 },
];

export type WordSet = { key: string; label: string; tops: string[]; walls: string[] };

export const WORD_SETS: WordSet[] = [
  {
    key: "worlds",
    label: "Worlds",
    tops: ["Imagined", "Designed", "Built", "Launched", "Living", "Yours"],
    walls: ["your world", "in motion"],
  },
  {
    key: "execution",
    label: "Execution",
    tops: ["Brief", "Vision", "Craft", "Code", "Launch", "Scale"],
    walls: ["we do", "we build", "we ship"],
  },
  {
    key: "universes",
    label: "Universes",
    tops: ["Many", "Worlds", "One", "Studio", "Your", "Vision"],
    walls: ["many worlds", "one studio", "your vision"],
  },
];

export type Universe = { slug: string; frames: string[]; poster: string; offset: number; fps: number };

const seq = (slug: string, n: number, pad: number) =>
  Array.from({ length: n }, (_, i) => `/lab/cubes/${slug}/${String(i).padStart(pad, "0")}.webp`);

const GRIDMASTERS = seq("gridmasters", 60, 3);
const WELTH = seq("welth", 60, 3);
const MISSION = seq("mission", 40, 2);

/** One per featured column; repeated sources start at different points so no two faces match. */
export const UNIVERSES: Universe[] = [
  { slug: "gridmasters", frames: GRIDMASTERS, poster: GRIDMASTERS[0], offset: 0, fps: 12 },
  { slug: "welth", frames: WELTH, poster: WELTH[0], offset: 0.1, fps: 12 },
  { slug: "mission", frames: MISSION, poster: MISSION[0], offset: 0, fps: 10 },
  { slug: "welth", frames: WELTH, poster: WELTH[30], offset: 0.55, fps: 12 },
  { slug: "gridmasters", frames: GRIDMASTERS, poster: GRIDMASTERS[30], offset: 0.5, fps: 12 },
  { slug: "mission", frames: MISSION, poster: MISSION[20], offset: 0.5, fps: 10 },
];

/** Scroll steps, as fractions of the section; snap targets the resting states. */
export const STEPS = [
  { at: 0, label: "Layers apart" },
  { at: 0.3, label: "Layer slide" },
  { at: 0.68, label: "Swing and roll" },
  { at: 1, label: "Flat" },
];

export const PALETTE = {
  paper: "#f4f0e7",
  paper2: "#ece6da",
  ink: "#14110e",
  ink2: "#4f4942",
  fields: ["#f5d5ab", "#a8e9e8", "#ffcbc5"],
  deeps: ["#754b00", "#006566", "#843c38"],
};
