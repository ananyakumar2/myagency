"use client";

import { useLenis } from "lenis/react";
import { useCallback, useEffect, useRef, type RefObject } from "react";

import type { ScrollTrigger } from "@/lib/motion/gsap";

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Scroll helpers for a pinned section split into `steps` equal stops:
 * `goTo(k)` scrolls so stop k is centred (used by first-click-centres), and
 * a settle snap nudges to the nearest stop once wheel input has stopped.
 * Uses Lenis when present so the glide matches normal scrolling.
 */
export function usePinnedSteps(trigger: RefObject<ScrollTrigger | null>, steps: number, snap = true) {
  const lenis = useLenis();
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const scrollTo = useCallback(
    (y: number, duration = 1.1) => {
      if (lenis) {
        busy.current = true;
        lenis.scrollTo(y, {
          duration,
          easing: easeOutQuart,
          onComplete: () => (busy.current = false),
        });
      } else {
        window.scrollTo({ top: y });
      }
    },
    [lenis],
  );

  const goTo = useCallback(
    (k: number, duration?: number) => {
      const st = trigger.current;
      if (!st) return;
      scrollTo(st.start + (k / steps) * (st.end - st.start), duration);
    },
    [scrollTo, steps, trigger],
  );

  useLenis(
    (l) => {
      if (!snap) return;
      window.clearTimeout(timer.current);
      if (busy.current) return;
      timer.current = window.setTimeout(() => {
        const st = trigger.current;
        if (!st || busy.current) return;
        const y = l.scroll;
        if (y <= st.start + 1 || y >= st.end - 1) return;
        const k = Math.round(((y - st.start) / (st.end - st.start)) * steps);
        const target = st.start + (k / steps) * (st.end - st.start);
        if (Math.abs(target - y) > 2) scrollTo(target, 0.8);
      }, 120);
    },
    [snap, steps, scrollTo],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { goTo };
}
