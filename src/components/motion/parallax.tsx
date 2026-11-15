"use client";

import { useRef, type ReactNode } from "react";

import { gsap, useGSAP } from "@/lib/motion/gsap";
import { MOTION_OK } from "@/lib/motion/queries";

function strength(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--parallax-strength");
  const base = parseFloat(raw) || 1;
  // Halve travel on small screens: less motion, less risk of revealing edges.
  return window.matchMedia("(max-width: 767px)").matches ? base * 0.5 : base;
}

type ParallaxProps = {
  children: ReactNode;
  /**
   * Travel relative to scroll. 0 = static, positive = moves slower than the
   * page (recedes), negative = moves faster (comes forward). Typical: -0.4..0.4.
   */
  speed?: number;
  className?: string;
  innerClassName?: string;
};

/**
 * A parallax layer. The outer element is the (untransformed) trigger so the
 * measurement isn't affected by the layer's own movement.
 */
export function Parallax({ children, speed = 0.2, className, innerClassName }: ParallaxProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const travel = () => window.innerHeight * speed * strength() * 0.5;
        gsap.fromTo(
          inner.current,
          { y: () => -travel() },
          {
            y: () => travel(),
            ease: "none",
            scrollTrigger: {
              trigger: outer.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    },
    { scope: outer, dependencies: [speed] },
  );

  return (
    <div ref={outer} className={className}>
      <div ref={inner} className={innerClassName} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}

type ParallaxMediaProps = {
  children: ReactNode;
  /** Aspect ratio reserves space up front so nothing shifts on load. */
  aspect?: string;
  /** How far (in %) the media drifts inside its frame. */
  amount?: number;
  className?: string;
};

/** Media that drifts inside a clipped frame, the classic "image parallax". */
export function ParallaxMedia({ children, aspect = "4 / 5", amount = 12, className }: ParallaxMediaProps) {
  const frame = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          media.current,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: "none",
            scrollTrigger: { trigger: frame.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    },
    { scope: frame, dependencies: [amount] },
  );

  return (
    <div ref={frame} className={`relative overflow-hidden ${className ?? ""}`} style={{ aspectRatio: aspect }}>
      <div
        ref={media}
        className="absolute inset-x-0"
        style={{ top: `-${amount}%`, bottom: `-${amount}%`, willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
