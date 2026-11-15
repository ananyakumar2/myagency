"use client";

import { useRef, type ElementType, type ReactNode } from "react";

import { duration, ease } from "@/lib/motion/ease";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { MOTION_OK } from "@/lib/motion/queries";

const VARIANTS = {
  fade: { opacity: 0 },
  up: { opacity: 0, y: 32 },
  scale: { opacity: 0, scale: 0.97, y: 16 },
  clip: { clipPath: "inset(100% 0% 0% 0%)", y: 16 },
} satisfies Record<string, gsap.TweenVars>;

export type RevealVariant = keyof typeof VARIANTS;

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  variant?: RevealVariant;
  /** Animate direct children one after another instead of the wrapper. */
  stagger?: number;
  delay?: number;
  /** ScrollTrigger start, e.g. "top 85%". */
  start?: string;
  /** Play on mount instead of on scroll, for above-the-fold content. */
  immediate?: boolean;
  className?: string;
};

/** Fades/translates content in once when it scrolls into view. */
export function Reveal({
  children,
  as: Tag = "div",
  variant = "up",
  stagger,
  delay = 0,
  start = "top 85%",
  immediate = false,
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.set(el, { opacity: 1 });
        gsap.from(stagger ? el.children : el, {
          ...VARIANTS[variant],
          duration: duration("reveal"),
          ease: ease("out"),
          delay,
          stagger,
          clearProps: "transform,clipPath",
          scrollTrigger: immediate ? undefined : { trigger: el, start, once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} data-reveal="" className={className}>
      {children}
    </Tag>
  );
}
