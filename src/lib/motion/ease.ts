import { CustomEase } from "gsap/CustomEase";

/** Token names in tokens.css (`--ease-<name>`), registered as GSAP eases `brand.<name>`. */
export const EASE_TOKENS = ["out", "in-out", "in", "soft", "card"] as const;
export type EaseToken = (typeof EASE_TOKENS)[number];

const FALLBACKS: Record<EaseToken, string> = {
  out: "0.19,1,0.22,1",
  "in-out": "0.83,0,0.17,1",
  in: "0.55,0,0.75,0.2",
  soft: "0.33,0.85,0.4,1",
  card: "0.22,1,0.36,1",
};

export const ease = (name: EaseToken) => `brand.${name}`;

function readBezier(name: EaseToken): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--ease-${name}`);
  const match = raw.match(/cubic-bezier\(([^)]+)\)/);
  return match ? match[1].replace(/\s+/g, "") : FALLBACKS[name];
}

export function registerTokenEases() {
  for (const name of EASE_TOKENS) {
    CustomEase.create(ease(name), readBezier(name));
  }
}

export type DurationToken = "fast" | "hover" | "base" | "slow" | "reveal";

/** Reads a `--duration-*` token and returns seconds for GSAP. */
export function duration(name: DurationToken): number {
  if (typeof document === "undefined") return 0.6;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--duration-${name}`).trim();
  const ms = raw.endsWith("ms") ? parseFloat(raw) : parseFloat(raw) * 1000;
  return Number.isFinite(ms) ? ms / 1000 : 0.6;
}

/** Pure-JS versions of the token curves for per-frame maths outside GSAP. */
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Frame-rate independent exponential smoothing factor, tuned at 60 fps. */
export const damp = (perFrameAt60: number, dt: number) => 1 - Math.pow(1 - perFrameAt60, dt * 60);
