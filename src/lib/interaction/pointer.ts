"use client";

import { gsap } from "@/lib/motion/gsap";

/**
 * One shared pointer for every effect: position in CSS px, velocity in px/s
 * (smoothed 0.6/0.4, as Auge does for scroll) and the time of the last move.
 * Mouse only; touch and pen leave it idle so pointer effects stay off.
 */
export const pointer = {
  x: -9999,
  y: -9999,
  vx: 0,
  vy: 0,
  speed: 0,
  active: false,
  down: false,
  lastMove: 0,
};

let started = 0;
let rawX = -9999;
let rawY = -9999;
let lastX = -9999;
let lastY = -9999;

const onMove = (e: PointerEvent) => {
  if (e.pointerType !== "mouse") return;
  rawX = e.clientX;
  rawY = e.clientY;
  if (!pointer.active) {
    pointer.active = true;
    lastX = rawX;
    lastY = rawY;
    pointer.x = rawX;
    pointer.y = rawY;
  }
  pointer.lastMove = performance.now();
};
const onLeave = () => {
  pointer.active = false;
};
const onDown = (e: PointerEvent) => {
  if (e.pointerType === "mouse") pointer.down = true;
};
const onUp = () => {
  pointer.down = false;
};

const tick = (_time: number, deltaMs: number) => {
  const dt = Math.max(deltaMs, 1) / 1000;
  const ivx = (rawX - lastX) / dt;
  const ivy = (rawY - lastY) / dt;
  lastX = rawX;
  lastY = rawY;
  if (!pointer.active) {
    pointer.vx *= 0.8;
    pointer.vy *= 0.8;
  } else {
    pointer.vx = pointer.vx * 0.6 + ivx * 0.4;
    pointer.vy = pointer.vy * 0.6 + ivy * 0.4;
  }
  pointer.x = rawX;
  pointer.y = rawY;
  pointer.speed = Math.hypot(pointer.vx, pointer.vy);
};

/** Ref-counted: effects call start on mount and the returned stop on unmount. */
export function startPointer() {
  if (typeof window === "undefined") return () => {};
  if (started++ === 0) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);
  }
  return () => {
    if (--started === 0) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(tick);
    }
  };
}
