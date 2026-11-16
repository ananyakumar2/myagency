"use client";

import { defineTuning } from "./tuning";

/*
 * Default values for every effect, with their sources in
 * docs/reference-analysis.md. Lab pages under /lab expose each set.
 */

/** Decision 1: Auge-strength scroll bend (60 px curve, Auge's attack/release). */
export const bendTuning = defineTuning(
  "bend",
  "Scroll bend",
  {
    curve: 60,
    velocityForFull: 2200,
    rise: 0.3,
    relax: 0.08,
    edgeFeather: 90,
    horizontalDeadZone: 260,
    horizontalForFull: 900,
    dprCap: 2,
  },
  {
    curve: { min: 0, max: 140, step: 1, unit: "px", label: "Max curve" },
    velocityForFull: { min: 400, max: 6000, step: 50, unit: "px/s", label: "Speed for full bend" },
    rise: { min: 0.02, max: 1, step: 0.01, label: "Attack (per frame)" },
    relax: { min: 0.01, max: 0.5, step: 0.005, label: "Release (per frame)" },
    edgeFeather: { min: 0, max: 300, step: 5, unit: "px", label: "Pinned edge feather" },
    horizontalDeadZone: { min: 0, max: 1200, step: 10, unit: "px/s", label: "Sideways dead zone" },
    horizontalForFull: { min: 100, max: 4000, step: 50, unit: "px/s", label: "Sideways speed for full" },
    dprCap: { min: 1, max: 3, step: 0.25, label: "Pixel ratio cap" },
  },
);

/** Decision 8: faint but clearly visible lens at rest, growing on fast moves. */
export const lensTuning = defineTuning(
  "lens",
  "Cursor lens",
  {
    radius: 280,
    rest: 4.5,
    fast: 16,
    speedForFull: 2000,
    curvePower: 2,
    smoothing: 0.1,
    prism: 0.4,
    follow: 0.22,
  },
  {
    radius: { min: 60, max: 800, step: 5, unit: "px", label: "Radius" },
    rest: { min: 0, max: 20, step: 0.25, unit: "px", label: "Bulge at rest" },
    fast: { min: 0, max: 60, step: 0.5, unit: "px", label: "Bulge on fast moves" },
    speedForFull: { min: 200, max: 6000, step: 50, unit: "px/s", label: "Speed for full bulge" },
    curvePower: { min: 1, max: 4, step: 0.1, label: "Speed response curve" },
    smoothing: { min: 0.01, max: 1, step: 0.01, label: "Strength smoothing" },
    prism: { min: 0, max: 1.5, step: 0.05, label: "Prism (colour split)" },
    follow: { min: 0.02, max: 1, step: 0.01, label: "Position follow" },
  },
);

/** Decision 13: click shockwave on project cards and primary CTAs. */
export const shockTuning = defineTuning(
  "shockwave",
  "Click shockwave",
  {
    duration: 0.9,
    startRadius: 80,
    travel: 400,
    amplitude: 26,
    width: 70,
    navDelay: 0.45,
  },
  {
    duration: { min: 0.2, max: 2.5, step: 0.05, unit: "s", label: "Duration" },
    startRadius: { min: 0, max: 400, step: 5, unit: "px", label: "Start radius" },
    travel: { min: 50, max: 1400, step: 10, unit: "px", label: "Travel" },
    amplitude: { min: 0, max: 80, step: 1, unit: "px", label: "Amplitude" },
    width: { min: 10, max: 300, step: 5, unit: "px", label: "Ring width" },
    navDelay: { min: 0, max: 1.2, step: 0.05, unit: "s", label: "Navigation waits" },
  },
);

/** Decisions 7, 11 and 12: diamond follower, trail marks and label pill. */
export const followerTuning = defineTuning(
  "follower",
  "Cursor follower",
  {
    size: 11,
    lag: 0.35,
    tiltMax: 6,
    tiltPerSpeed: 0.004,
    tiltDecay: 0.6,
    pillOffsetX: 20,
    pillOffsetY: 28,
    pillDelay: 0.12,
    hideDelay: 0.09,
    snapDistance: 80,
    scramble: 0.6,
  },
  {
    size: { min: 4, max: 32, step: 1, unit: "px", label: "Diamond size" },
    lag: { min: 0.05, max: 1.2, step: 0.01, unit: "s", label: "Follow lag" },
    tiltMax: { min: 0, max: 30, step: 0.5, unit: "°", label: "Max tilt" },
    tiltPerSpeed: { min: 0, max: 0.02, step: 0.0005, label: "Tilt per px/s" },
    tiltDecay: { min: 0.1, max: 2, step: 0.05, unit: "s", label: "Tilt settle" },
    pillOffsetX: { min: 0, max: 60, step: 1, unit: "px", label: "Pill offset x" },
    pillOffsetY: { min: 0, max: 60, step: 1, unit: "px", label: "Pill offset y" },
    pillDelay: { min: 0, max: 0.5, step: 0.01, unit: "s", label: "Pill resize delay" },
    hideDelay: { min: 0, max: 0.4, step: 0.01, unit: "s", label: "Pill hide delay" },
    snapDistance: { min: 0, max: 400, step: 5, unit: "px", label: "Snap when farther than" },
    scramble: { min: 0, max: 1.5, step: 0.05, unit: "s", label: "Label scramble" },
  },
);

export const trailTuning = defineTuning(
  "trail",
  "Cursor trail marks",
  {
    intervalMin: 0.5,
    intervalMax: 0.8,
    life: 0.9,
    drop: 14,
    size: 6,
    opacity: 0.4,
    minSpeed: 120,
  },
  {
    intervalMin: { min: 0.05, max: 2, step: 0.05, unit: "s", label: "Interval from" },
    intervalMax: { min: 0.05, max: 3, step: 0.05, unit: "s", label: "Interval to" },
    life: { min: 0.2, max: 3, step: 0.05, unit: "s", label: "Fade within" },
    drop: { min: 0, max: 80, step: 1, unit: "px", label: "Drop distance" },
    size: { min: 2, max: 24, step: 1, unit: "px", label: "Mark size" },
    opacity: { min: 0.05, max: 1, step: 0.05, label: "Opacity" },
    minSpeed: { min: 0, max: 1200, step: 10, unit: "px/s", label: "Only above speed" },
  },
);

/** Decision 9: letters lean away from the cursor (wordmark and hero line). */
export const letterTuning = defineTuning(
  "letters",
  "Letter push",
  { max: 4, radius: 2.4, smoothing: 0.14, lift: 0.35 },
  {
    max: { min: 0, max: 24, step: 0.5, unit: "px", label: "Max push" },
    radius: { min: 0.5, max: 8, step: 0.1, label: "Radius (× letter width)" },
    smoothing: { min: 0.02, max: 1, step: 0.01, label: "Smoothing (per frame)" },
    lift: { min: 0, max: 1, step: 0.05, label: "Vertical share" },
  },
);

/** Decision 5 (changed): idle motion as bursts, after Auge and Grail. */
export const burstTuning = defineTuning(
  "bursts",
  "Idle bursts",
  {
    everyMin: 2.4,
    everyMax: 4.2,
    firstDelay: 0.45,
    minGap: 1.2,
    churn: 0.05,
    resolveStart: 0.3,
    scrambleDuration: 1.1,
    shatters: 7,
    shatterInterval: 0.09,
    shatterJitter: 0.55,
    offsetMin: 0.08,
    offsetMax: 0.26,
    stillChance: 0.28,
    decay: 0.78,
    flipDuration: 1.25,
    flipLead: 0.2,
    whipDistance: 140,
    whipSkew: 16,
    whipDuration: 1.3,
    spinTurns: 2,
    spinDuration: 1.9,
  },
  {
    everyMin: { min: 0.5, max: 20, step: 0.1, unit: "s", label: "Repeat every (from)" },
    everyMax: { min: 0.5, max: 30, step: 0.1, unit: "s", label: "Repeat every (to)" },
    firstDelay: { min: 0, max: 5, step: 0.05, unit: "s", label: "First burst after" },
    minGap: { min: 0, max: 5, step: 0.1, unit: "s", label: "Gap between bursts on screen" },
    churn: { min: 0.016, max: 0.3, step: 0.004, unit: "s", label: "Scramble churn" },
    resolveStart: { min: 0, max: 0.9, step: 0.05, label: "Scramble resolves after" },
    scrambleDuration: { min: 0.2, max: 3, step: 0.05, unit: "s", label: "Scramble length" },
    shatters: { min: 1, max: 20, step: 1, label: "Glitch shatters" },
    shatterInterval: { min: 0.02, max: 0.4, step: 0.01, unit: "s", label: "Shatter interval" },
    shatterJitter: { min: 0, max: 1, step: 0.05, label: "Shatter jitter" },
    offsetMin: { min: 0, max: 0.6, step: 0.01, label: "Band offset from (× width)" },
    offsetMax: { min: 0, max: 0.8, step: 0.01, label: "Band offset to (× width)" },
    stillChance: { min: 0, max: 1, step: 0.02, label: "Band stays put chance" },
    decay: { min: 0.5, max: 0.98, step: 0.01, label: "Settle decay (per frame)" },
    flipDuration: { min: 0.3, max: 3, step: 0.05, unit: "s", label: "Flip length" },
    flipLead: { min: 0, max: 0.8, step: 0.02, label: "Flip ripple lead" },
    whipDistance: { min: 0, max: 600, step: 5, unit: "px", label: "Whip distance" },
    whipSkew: { min: 0, max: 45, step: 0.5, unit: "°", label: "Whip shear at speed" },
    whipDuration: { min: 0.3, max: 3, step: 0.05, unit: "s", label: "Whip settle" },
    spinTurns: { min: 0.25, max: 6, step: 0.25, label: "Spin turns" },
    spinDuration: { min: 0.3, max: 4, step: 0.05, unit: "s", label: "Spin length" },
  },
);

/** Decision 14: Grail press states. */
export const pressTuning = defineTuning(
  "press",
  "Press states",
  { lift: 2, hoverScale: 1.03, pressScale: 0.99, duration: 0.15 },
  {
    lift: { min: 0, max: 10, step: 0.5, unit: "px", label: "Hover lift" },
    hoverScale: { min: 1, max: 1.12, step: 0.005, label: "Hover scale" },
    pressScale: { min: 0.85, max: 1, step: 0.005, label: "Press scale" },
    duration: { min: 0.05, max: 0.6, step: 0.01, unit: "s", label: "Duration" },
  },
);

/** Decisions 16-18: loader. */
export const loaderTuning = defineTuning(
  "loader",
  "Loader",
  {
    minFull: 2.6,
    minShort: 1,
    cap: 10,
    perItem: 7,
    parkMin: 0.86,
    parkMax: 0.93,
    loopAfter: 1.6,
    beat: 2.4,
    grow: 1.15,
  },
  {
    minFull: { min: 0.5, max: 8, step: 0.1, unit: "s", label: "Full version at least" },
    minShort: { min: 0, max: 3, step: 0.1, unit: "s", label: "Short version at least" },
    cap: { min: 2, max: 20, step: 0.5, unit: "s", label: "Hard cap" },
    perItem: { min: 1, max: 15, step: 0.5, unit: "s", label: "Per-item timeout" },
    parkMin: { min: 0.5, max: 0.99, step: 0.01, label: "Parks between (from)" },
    parkMax: { min: 0.5, max: 0.99, step: 0.01, label: "Parks between (to)" },
    loopAfter: { min: 0.5, max: 6, step: 0.1, unit: "s", label: "Slow-network loop after" },
    beat: { min: 0.6, max: 6, step: 0.1, unit: "s", label: "Loop beat" },
    grow: { min: 0.4, max: 2.5, step: 0.05, unit: "s", label: "Handoff window grows over" },
  },
);

/** Decisions 19-20: sound. */
export const soundTuning = defineTuning(
  "sound",
  "Sound",
  { gain: 0.6, hoverThrottle: 0.07, sleepAfter: 30 },
  {
    gain: { min: 0, max: 1, step: 0.05, label: "Master gain" },
    hoverThrottle: { min: 0, max: 0.5, step: 0.01, unit: "s", label: "Min gap between hovers" },
    sleepAfter: { min: 5, max: 120, step: 5, unit: "s", label: "Audio sleeps after idle" },
  },
);

/** Decision 2: route curtain, tilted sheets and the ink reveal. */
export const transitionTuning = defineTuning(
  "transitions",
  "Transitions",
  {
    cover: 0.9,
    hold: 0.2,
    exit: 0.9,
    arch: 0.16,
    titleScramble: 0.8,
    sheetTilt: 3.5,
    sheetOffset: 14,
    inkScale: 2.4,
    inkEdge: 0.16,
    inkAmp: 0.55,
  },
  {
    cover: { min: 0.2, max: 2, step: 0.05, unit: "s", label: "Curtain rise" },
    hold: { min: 0, max: 1.5, step: 0.05, unit: "s", label: "Curtain hold" },
    exit: { min: 0.2, max: 2, step: 0.05, unit: "s", label: "Curtain exit" },
    arch: { min: 0, max: 0.5, step: 0.01, label: "Arch height (× screen)" },
    titleScramble: { min: 0, max: 2, step: 0.05, unit: "s", label: "Title scramble" },
    sheetTilt: { min: 0, max: 12, step: 0.25, unit: "°", label: "Sheet tilt" },
    sheetOffset: { min: 0, max: 40, step: 1, unit: "vh", label: "Sheet entry offset" },
    inkScale: { min: 0.5, max: 8, step: 0.1, label: "Ink noise scale" },
    inkEdge: { min: 0.02, max: 0.5, step: 0.01, label: "Ink edge softness" },
    inkAmp: { min: 0, max: 1.5, step: 0.01, label: "Ink edge distortion" },
  },
);

/** Colour system: the signature accent until a brand route is picked. */
export const colourTuning = defineTuning(
  "colour",
  "Colour",
  { signature: "saffron" },
  { signature: { type: "select", options: ["saffron", "sea", "lacquer"], label: "Signature accent" } },
);

/** Decision 22: Agrumea-style springs. */
export const springTuning = defineTuning(
  "springs",
  "Springs",
  { stiffness: 70, spread: 0.15, damping: 9, field: 1.6, turn: 10, lean: 3, lift: 0.03, pull: 0.05 },
  {
    stiffness: { min: 5, max: 400, step: 1, label: "Stiffness" },
    spread: { min: 0, max: 0.6, step: 0.01, label: "Per-object stiffness spread" },
    damping: { min: 1, max: 40, step: 0.5, label: "Damping" },
    field: { min: 0.3, max: 5, step: 0.1, label: "Field (× object width)" },
    turn: { min: 0, max: 40, step: 0.5, unit: "°", label: "Turn" },
    lean: { min: 0, max: 20, step: 0.25, unit: "°", label: "Lean" },
    lift: { min: 0, max: 0.2, step: 0.005, label: "Lift (scale)" },
    pull: { min: 0, max: 0.3, step: 0.005, label: "Pull (× distance)" },
  },
);

/** Decision 10: torch on deep sections. */
export const torchTuning = defineTuning(
  "torch",
  "Section torch",
  { radius: 0.42, falloff: 2.4, follow: 3, intensity: 0.5 },
  {
    radius: { min: 0.1, max: 1.5, step: 0.01, label: "Radius (× section width)" },
    falloff: { min: 0.5, max: 8, step: 0.1, label: "Falloff exp(−k·r²)" },
    follow: { min: 0.3, max: 20, step: 0.1, unit: "/s", label: "Follow rate" },
    intensity: { min: 0, max: 1, step: 0.02, label: "Intensity" },
  },
);

/** Decision 24: frame sequence with heat haze (Mission Motorsport method). */
export const sequenceTuning = defineTuning(
  "sequence",
  "Frame sequence and haze",
  { haze: 1, hazeRev: 2.4, plume: 0.22, speed: 1, revRise: 0.35, revFall: 1.1, smoothing: 0.18, grain: 0.035 },
  {
    haze: { min: 0, max: 4, step: 0.05, label: "Haze at idle" },
    hazeRev: { min: 0, max: 8, step: 0.05, label: "Haze at full rev" },
    plume: { min: 0.05, max: 0.6, step: 0.01, label: "Plume length (× frame height)" },
    speed: { min: 0, max: 4, step: 0.05, label: "Shimmer speed" },
    revRise: { min: 0.05, max: 2, step: 0.05, unit: "s", label: "Rev rise" },
    revFall: { min: 0.05, max: 4, step: 0.05, unit: "s", label: "Rev fall" },
    smoothing: { min: 0.02, max: 1, step: 0.01, label: "Scrub smoothing" },
    grain: { min: 0, max: 0.2, step: 0.005, label: "Film grain" },
  },
);

/** Decisions 21-22, 24: GLB helmet (Jack Johns method). */
export const helmetTuning = defineTuning(
  "helmet",
  "Helmet",
  { turn: 22, lean: 8, lift: 0.03, idleSway: 3, exposure: 1, dprMin: 1, dprMax: 2, budgetMP: 8.3 },
  {
    turn: { min: 0, max: 60, step: 0.5, unit: "°", label: "Turn toward cursor" },
    lean: { min: 0, max: 30, step: 0.5, unit: "°", label: "Lean toward cursor" },
    lift: { min: 0, max: 0.15, step: 0.005, label: "Hover lift (scale)" },
    idleSway: { min: 0, max: 12, step: 0.25, unit: "°", label: "Idle sway (touch)" },
    exposure: { min: 0.3, max: 2.5, step: 0.05, label: "Exposure" },
    dprMin: { min: 0.5, max: 2, step: 0.25, label: "Pixel ratio floor" },
    dprMax: { min: 1, max: 3, step: 0.25, label: "Pixel ratio ceiling" },
    budgetMP: { min: 1, max: 20, step: 0.1, label: "Pixel budget (MP)" },
  },
);

/** Decision 33: colour-cycling hero. */
export const heroTuning = defineTuning(
  "hero",
  "Colour-cycling hero",
  { hold: 2.5, wipe: 0.9, word: 0.667, stagger: 0.033 },
  {
    hold: { min: 0.5, max: 8, step: 0.1, unit: "s", label: "Hold each colour" },
    wipe: { min: 0.2, max: 2.5, step: 0.05, unit: "s", label: "Wipe" },
    word: { min: 0.2, max: 1.5, step: 0.01, unit: "s", label: "Word rise" },
    stagger: { min: 0, max: 0.15, step: 0.002, unit: "s", label: "Word stagger" },
  },
);

/** Watchdog that hands the page back to the DOM when the GPU can't keep up. */
export const watchdogTuning = defineTuning(
  "watchdog",
  "Frame watchdog",
  { slowMs: 100, slowFrames: 8, jankMs: 32, jankRatio: 0.22, window: 120, fade: 0.35 },
  {
    slowMs: { min: 40, max: 400, step: 5, unit: "ms", label: "A slow frame is over" },
    slowFrames: { min: 1, max: 40, step: 1, label: "Retreat after slow frames in the window" },
    jankMs: { min: 17, max: 80, step: 1, unit: "ms", label: "A janky frame is over" },
    jankRatio: { min: 0.05, max: 0.8, step: 0.01, label: "Retreat when janky share is over" },
    window: { min: 30, max: 600, step: 10, label: "Frames sampled" },
    fade: { min: 0, max: 1.5, step: 0.05, unit: "s", label: "Fade back to DOM" },
  },
);
