"use client";

/**
 * Device rules from decision 23: bend, lens and shockwave need a fine
 * pointer, motion allowed and WebGL2. A session that already fell back twice
 * (frame watchdog) stays on the DOM for the rest of the session.
 */
const RETREAT_KEY = "mirror:retreats";

export const isFinePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export const prefersReducedMotion = () =>
  typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let webgl2: boolean | null = null;
export function hasWebGL2() {
  if (webgl2 !== null) return webgl2;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    webgl2 = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

export function retreatCount() {
  try {
    return Number(sessionStorage.getItem(RETREAT_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function recordRetreat() {
  try {
    sessionStorage.setItem(RETREAT_KEY, String(retreatCount() + 1));
  } catch {
    /* storage blocked */
  }
}

export function canRunMirror({ ignoreRetreats = false } = {}) {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion() || !isFinePointer() || !hasWebGL2()) return false;
  return ignoreRetreats || retreatCount() < 2;
}
