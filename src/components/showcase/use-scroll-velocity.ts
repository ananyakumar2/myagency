"use client";

import { useLenis } from "lenis/react";
import { useRef } from "react";

/**
 * Lenis' smoothed scroll velocity (px per frame) in a ref, for per-frame
 * readers like <BowImage bend>. Stays 0 when Lenis is off (reduced motion).
 */
export function useScrollVelocity() {
  const velocity = useRef(0);
  useLenis((lenis) => {
    velocity.current = lenis.velocity;
  });
  return velocity;
}

/** Maps a velocity to a bend, softly capped so a hard flick can't fold the card. */
export function bendFrom(velocity: number, strength = 0.004, max = 0.16) {
  return max * Math.tanh((velocity * strength) / max);
}
