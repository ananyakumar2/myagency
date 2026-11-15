/** gsap.matchMedia() conditions shared by all motion primitives. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_OK_DESKTOP = "(prefers-reduced-motion: no-preference) and (min-width: 768px)";
export const MOTION_OK_FINE_POINTER =
  "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)";
