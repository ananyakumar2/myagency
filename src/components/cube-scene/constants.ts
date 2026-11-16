/**
 * Every number here is taken from Santa Larch's production cube scene
 * (docs/cube-deep-dive.md in the Project store). Change them only on purpose:
 * the camera, lattice and timings are tuned against each other.
 */

/** Placeholder copy. Front words chain into a loop read along depth: "Craft creates desire, desire defines luxury, luxury demands craft". */
export const WORDS = {
  front: ["Craft", "Creates", "Desire", "Defines", "Luxury", "Demands"],
  side: ["See", "Feel", "Touch"],
} as const;

export const FONT_URL = "/fonts/cube/Arimo-Regular.ttf";

/** Cube edge length is 1; type is sized against it. */
export const FONT_SIZE = 0.175;
export const LINE_HEIGHT = 0.88;
export const LETTER_SPACING = FONT_SIZE * -0.05;
/** Vertical nudge of the opening three-line sentence, in cube units at word scale 1. */
export const SENTENCE_Y_NUDGE = 0.02;
/** Horizontal offsets of the opening sentence's second and third lines (desktop, mobile). */
export const SENTENCE_X = { desktop: [0.29, -0.088], mobile: [-0.258, -0.119] } as const;
export const SENTENCE_MOBILE_FIRST_X = -0.107;

export const COLORS = {
  background: 0x111111,
  text: 0xf0f0f0,
  plane: 0x111111,
  line: 0xf2f0f0,
} as const;

/** Front, left, right, top face opacity. Faces share the background colour, so they only dim what is behind them. */
export const FACE_OPACITY = [0.7, 0.4, 0.2, 0.6] as const;
export const LINE_OPACITY = 0.2;

/** Layers run from MIN_LAYER (bottom) to MAX_LAYER (top), one cube tall each. */
export const MAX_LAYER = 6;
/** Opacity of layers below the floor, by depth: -1, -2, -3. Anything deeper is 0. */
export const SUNK_LAYER_OPACITY = [0.2, 0.12, 0.1] as const;
export const SMALL_ROWS = 3;
export const MIN_LAYER = -MAX_LAYER + (MAX_LAYER - SUNK_LAYER_OPACITY.length - 1);
export const FILLER_HALF_WIDTH = MAX_LAYER - 1;
export const FILLER_DEPTH = 3;

/** The layer holding the opening word (column 0, front cube) and the two words behind it. */
export const FIRST_WORD_LAYER = 2;
/** Layers whose top faces are skipped. */
export const NO_TOP_LAYER = 0;

/** Front word index = layerCounter * WORD_LAYER_STEP + column * WORD_COLUMN_STEP + depth. */
export const WORD_LAYER_START = 4;
export const WORD_LAYER_STEP = 5;
export const WORD_COLUMN_STEP = 2;

export const CONVEYOR_STEPS = 3;
/** Length of each conveyor step in screens (GSAP's default tween duration). */
export const STEP = 0.5;
export const FLATTEN_DURATION = 3;

/** Length of the lattice, in cubes, that the camera's half-turn ends above the middle of. */
export const PYRAMID_LENGTH = 9;

export const CAMERA = {
  radius: 8,
  elevation: 25,
  unzoomTo: 0.6,
  arcDirection: -1,
  /** Half the frame height at the target, in cubes, at zoom 1. */
  halfHeight: 1,
  startDelay: 0.25,
  near: 0.1,
  far: 1000,
} as const;

export const DIVE = {
  duration: 3,
  targetY: -0.5,
  fov: 30,
  windowFadeAt: 1,
  windowFadeDuration: 2,
  /** The window keeps growing with the camera for this long after it starts fading in. */
  windowGrowDuration: 4,
  cubesFadeAt: 4.5,
  /** The layer whose middle cube sizes the window, as on the reference. */
  referenceLayer: 4,
} as const;

/** Screens of scroll left pinned after the timeline ends. */
export const SECTION_TAIL = 0.95;
/** Fraction of the viewport from the top where the timeline starts. */
export const START_OFFSET = "top 5%";

export const POINTER_TILT = {
  yawDeg: 6,
  pitchDeg: 3,
  response: 4,
  weightFade: 0.7,
  minWidth: 1024,
} as const;

export const LENIS_FEEL = { duration: 1.8, wheelMultiplier: 0.65 } as const;

export const MAX_PIXEL_RATIO = 2;

export const EASE_IN = "cube.in";
export const EASE_OUT = "cube.out";
export const EASE_IN_CURVE = "0.5,0,0.75,0";
export const EASE_OUT_CURVE = "0.25,1,0.5,1";
