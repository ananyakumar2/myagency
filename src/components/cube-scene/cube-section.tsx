"use client";

import type Lenis from "lenis";
import { useLenis } from "lenis/react";
import { useEffect, useRef } from "react";

import { LENIS_FEEL } from "./constants";
import type { CubeScene } from "./scene";

type VirtualScrollOptions = { wheelMultiplier: number };
type LenisInternals = { virtualScroll?: { options: VirtualScrollOptions } };

const lenisEasing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

function applyScrollFeel(lenis: Lenis) {
  const virtual = (lenis as unknown as LenisInternals).virtualScroll;
  const prev = {
    duration: lenis.options.duration,
    easing: lenis.options.easing,
    wheel: virtual?.options.wheelMultiplier,
  };
  lenis.options.duration = LENIS_FEEL.duration;
  lenis.options.easing = lenisEasing;
  if (virtual) virtual.options.wheelMultiplier = LENIS_FEEL.wheelMultiplier;
  return () => {
    lenis.options.duration = prev.duration;
    lenis.options.easing = prev.easing;
    if (virtual && prev.wheel !== undefined) virtual.options.wheelMultiplier = prev.wheel;
  };
}

/** The reference site's scroll feel: every input glides for 1.8 s and the wheel moves 65% as far. */
function useCubeScrollFeel() {
  const lenis = useLenis();
  useEffect(() => (lenis ? applyScrollFeel(lenis) : undefined), [lenis]);
}

export type CubeSectionProps = {
  /** Image shown in the window that opens out of a cube's top face during the dive. */
  windowImage?: string;
};

export function CubeSection({ windowImage = "/placeholder/maritime-wide.webp" }: CubeSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const windowWrapRef = useRef<HTMLDivElement>(null);
  const windowInnerRef = useRef<HTMLDivElement>(null);
  useCubeScrollFeel();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const root = document.documentElement;
    // While the section is under the header, the header goes clear so the scene runs edge to edge.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) root.dataset.header = "clear";
        else delete root.dataset.header;
      },
      { rootMargin: "0px 0px -100% 0px" },
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      delete root.dataset.header;
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const target = targetRef.current;
    if (!section || !target) return;
    let scene: CubeScene | null = null;
    let cancelled = false;
    import("./scene").then(({ CubeScene }) => {
      if (cancelled) return;
      scene = new CubeScene(
        { section, target, windowWrap: windowWrapRef.current, windowInner: windowInnerRef.current },
        {
          sentenceFontSize: () => window.innerWidth * 0.068,
          onReady: () => section.setAttribute("data-cubes-ready", ""),
        },
      );
    });
    return () => {
      cancelled = true;
      scene?.dispose();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Cube structure"
      className="relative bg-[#111111] text-[#f0f0f0]"
      style={{ height: "var(--cube-section-height, 1120lvh)" }}
    >
      <div className="sticky top-0 h-[100lvh] overflow-hidden">
        <div ref={targetRef} className="absolute inset-0" />
        <div ref={windowWrapRef} className="pointer-events-none absolute inset-0 opacity-0" aria-hidden="true">
          <div ref={windowInnerRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={windowImage} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
