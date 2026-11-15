import { CustomEase } from "gsap/CustomEase";

/** Token names in tokens.css (`--ease-<name>`), registered as GSAP eases `brand.<name>`. */
export const EASE_TOKENS = ["out", "in-out", "in", "soft"] as const;
export type EaseToken = (typeof EASE_TOKENS)[number];

const FALLBACKS: Record<EaseToken, string> = {
  out: "0.22,1,0.36,1",
  "in-out": "0.76,0,0.24,1",
  in: "0.55,0,0.75,0.2",
  soft: "0.33,0.85,0.4,1",
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

/** Reads a `--duration-*` token and returns seconds for GSAP. */
export function duration(name: "fast" | "base" | "slow" | "reveal"): number {
  if (typeof document === "undefined") return 0.6;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--duration-${name}`).trim();
  const ms = raw.endsWith("ms") ? parseFloat(raw) : parseFloat(raw) * 1000;
  return Number.isFinite(ms) ? ms / 1000 : 0.6;
}
