"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { transitionTuning } from "@/lib/interaction/config";
import { useReducedMotion } from "@/hooks/use-media-query";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * Decision 2 (within pages), after Grail: a section arrives like a sheet laid
 * over the one before it, tilted a few degrees from alternating sides and
 * straightening as it scrolls into place.
 */
export function Sheet({
  children,
  side = "left",
  className = "",
  theme,
}: {
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
  theme?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const p = transitionTuning.params;
    const sign = side === "left" ? -1 : 1;
    const tween = gsap.fromTo(
      el,
      { rotate: sign * p.sheetTilt, y: () => (window.innerHeight * p.sheetOffset) / 100, transformOrigin: side === "left" ? "100% 0%" : "0% 0%" },
      {
        rotate: 0,
        y: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "top 25%", scrub: true, invalidateOnRefresh: true },
      },
    );
    const unsub = transitionTuning.subscribe(() => {
      tween.invalidate();
      ScrollTrigger.refresh();
    });
    return () => {
      unsub();
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(el, { clearProps: "transform,rotate,translate" });
    };
  }, [side, reduced]);

  return (
    <section
      ref={ref}
      data-theme={theme}
      className={`relative rounded-t-[1.25rem] bg-bg text-fg shadow-[0_-24px_60px_-30px_rgb(20_17_14/0.35)] will-change-transform ${className}`}
    >
      {children}
    </section>
  );
}
