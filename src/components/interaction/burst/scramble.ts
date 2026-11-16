"use client";

import { burstTuning } from "@/lib/interaction/config";
import { gsap } from "@/lib/motion/gsap";

/*
 * Auge's typeScramble, generalised. Auge ships advance-width tables for its
 * three fonts and only swaps each letter for one of the six glyphs closest to
 * it in width, so a scrambling line never changes length. Here the widths are
 * measured from whatever font the element renders in.
 *
 * Timing (Auge): the pool re-rolls every 50 ms of tween time; for the first
 * 30% every letter is scrambled, then letters lock in a shuffled order.
 */

type Pools = Map<string, string>;

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGIT = "0123456789";
const poolCache = new Map<string, Pools>();
let measureCtx: CanvasRenderingContext2D | null = null;

function buildPools(font: string): Pools {
  const cached = poolCache.get(font);
  if (cached) return cached;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const pools: Pools = new Map();
  if (!measureCtx) return pools;
  measureCtx.font = font;
  const em = measureCtx.measureText("M").width || 1;
  for (const set of [UPPER, LOWER, DIGIT]) {
    const widths = [...set].map((c) => measureCtx!.measureText(c).width);
    [...set].forEach((c, i) => {
      const near = [...set]
        .map((cand, j) => ({ cand, d: Math.abs(widths[j] - widths[i]) }))
        .filter((x) => x.cand !== c)
        .sort((a, b) => a.d - b.d || a.cand.charCodeAt(0) - b.cand.charCodeAt(0));
      // Isolated glyphs (nothing within 0.1 em, like I or W) stay put.
      if (!near.length || near[0].d > em * 0.1) return;
      pools.set(c, near.slice(0, 6).map((x) => x.cand).join(""));
    });
  }
  poolCache.set(font, pools);
  return pools;
}

function poolsFor(el: HTMLElement) {
  const s = getComputedStyle(el);
  const upper = s.textTransform === "uppercase";
  return { pools: buildPools(`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`), upper };
}

function sets(text: string, pools: Pools, upper: boolean) {
  return [...text].map((c) => pools.get(upper ? c.toUpperCase() : c) ?? null);
}

function roll(text: string, sets: (string | null)[]) {
  let out = "";
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const s = sets[i];
    out += s ? s[(Math.random() * s.length) | 0] : chars[i];
  }
  return out;
}

function textNodeOf(el: HTMLElement) {
  const first = el.firstChild;
  if (first && first.nodeType === Node.TEXT_NODE && !first.nextSibling) return first as Text;
  el.textContent = el.textContent ?? "";
  return el.firstChild as Text;
}

export type ScrambleOptions = {
  duration?: number;
  churn?: number;
  resolveStart?: number;
  delay?: number;
  /** Called on each re-roll; throttle sounds on the caller side. */
  onChurn?: () => void;
};

/** Scrambles `el` into `text` and resolves. Returns the GSAP tween. */
export function scrambleTo(el: HTMLElement, text: string, opts: ScrambleOptions = {}) {
  const p = burstTuning.params;
  const duration = opts.duration ?? p.scrambleDuration;
  const churn = opts.churn ?? p.churn;
  const resolveStart = opts.resolveStart ?? p.resolveStart;
  const { pools, upper } = poolsFor(el);
  const charSets = sets(text, pools, upper);
  const chars = [...text];
  const order = new Array<number>(chars.length).fill(-1);
  const scrambled = charSets.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  for (let i = scrambled.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
  }
  scrambled.forEach((idx, rank) => (order[idx] = rank));
  const pending = scrambled.length;
  let pool = roll(text, charSets);
  let churnedAt = -1;
  const node = textNodeOf(el);
  const state = { p: 0 };

  running.get(el)?.kill();
  const tween = gsap.to(state, {
    p: 1,
    duration,
    delay: opts.delay ?? 0,
    ease: "none",
    onUpdate() {
      const t = this.time();
      if (state.p < 1 && t - churnedAt > churn) {
        churnedAt = t;
        pool = [...roll(text, charSets)].join("");
        opts.onChurn?.();
      }
      const locked = (state.p > resolveStart ? (state.p - resolveStart) / (1 - resolveStart) : 0) * pending + 0.5;
      const poolChars = [...pool];
      let out = "";
      for (let i = 0; i < chars.length; i++) out += order[i] >= 0 && order[i] >= locked ? poolChars[i] : chars[i];
      node.nodeValue = out;
    },
    onComplete() {
      node.nodeValue = text;
    },
    onInterrupt() {
      node.nodeValue = text;
    },
  });
  running.set(el, tween);
  return tween;
}

const running = new WeakMap<HTMLElement, gsap.core.Tween>();

/** Width-matched placeholder for server render / before reveal. */
export function scramblePlaceholder(el: HTMLElement, text: string) {
  const { pools, upper } = poolsFor(el);
  return roll(text, sets(text, pools, upper));
}
