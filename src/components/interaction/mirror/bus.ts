"use client";

/** The running mirror, if any. Lets cards, strips and labs talk to it. */
export type MirrorHandle = {
  shock: (x: number, y: number) => void;
  setHorizontalVelocity: (pxPerSecond: number) => void;
  invalidate: (el?: Element) => void;
  readonly state: { bend: number; curve: number; lensPx: number; scrollVelocity: number; fps: number; items: number };
};

let active: MirrorHandle | null = null;
const listeners = new Set<() => void>();

export function setActiveMirror(handle: MirrorHandle | null) {
  active = handle;
  listeners.forEach((fn) => fn());
}

export const getActiveMirror = () => active;

export function subscribeMirror(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Returns true when the mirror drew the ripple (so callers can wait for it). */
export function shockAt(x: number, y: number) {
  if (!active) return false;
  active.shock(x, y);
  return true;
}

/**
 * Per-element inputs read by the mirror every frame, for media that bends or
 * changes on its own (the showcase's bowing cards, frame sequences).
 *
 *   bend    signed offset of the bowed edge's midpoint, as a fraction of the
 *           element's size (BowImage's scale: ~±0.15 is strong)
 *   axis    "x": vertical edges bow sideways; "y": horizontal edges bow up/down
 *   zoom    texture zoom about the centre, 1 = fit
 *   source  the image to draw instead of the element itself (current frame)
 */
export type MirrorBinding = {
  bend?: () => number;
  axis?: "x" | "y";
  zoom?: () => number;
  source?: () => TexImageSource | null | undefined;
};

const bindings = new WeakMap<Element, MirrorBinding>();

export function bindMirror(el: Element, binding: MirrorBinding) {
  bindings.set(el, binding);
  return () => {
    if (bindings.get(el) === binding) bindings.delete(el);
  };
}

export const getMirrorBinding = (el: Element) => bindings.get(el);
