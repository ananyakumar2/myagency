"use client";

import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-media-query";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so Lenis and ScrollTrigger
 * share one rAF and never disagree about scroll position.
 * Touch devices keep native scrolling (syncTouch: false) and reduced-motion
 * users get no Lenis at all.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    if (reduced) return;
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, [reduced]);

  return (
    <>
      {!reduced && (
        <ReactLenis
          root
          ref={lenisRef}
          options={{ autoRaf: false, lerp: 0.075, anchors: true, syncTouch: false }}
        />
      )}
      <ScrollTriggerSync />
      {children}
    </>
  );
}

function ScrollTriggerSync() {
  const pathname = usePathname();
  const lenis = useLenis(() => ScrollTrigger.update());

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
    // Let the new route lay out before ScrollTrigger re-measures.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname, lenis]);

  useEffect(() => {
    // Web fonts change line lengths and section heights; re-measure once they land.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return null;
}
