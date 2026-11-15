"use client";

import { Children, useRef, type ReactNode } from "react";

import { ease } from "@/lib/motion/ease";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { MOTION_OK_DESKTOP } from "@/lib/motion/queries";

type HorizontalScrollProps = {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  /** Optional heading/intro that stays visible while the track moves. */
  header?: ReactNode;
};

/**
 * Pins the section and converts vertical scroll into horizontal track travel.
 * On mobile / reduced motion the track is a native horizontal scroller with
 * snap points, so content stays reachable without scroll-jacking.
 */
export function HorizontalScroll({ children, className, trackClassName, header }: HorizontalScrollProps) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK_DESKTOP, () => {
        const el = track.current!;
        // Measured from the last item: scrollWidth drops the track's end padding.
        const distance = () => {
          const last = el.lastElementChild as HTMLElement;
          const padEnd = parseFloat(getComputedStyle(el).paddingRight);
          return last.offsetLeft + last.offsetWidth + padEnd - el.clientWidth;
        };
        gsap.set(el, { overflow: "visible" });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            // Fixed-position pinning of this full-bleed track registers as a
            // ~1.0 layout shift in Chrome on pin/unpin; transform pinning doesn't.
            pinType: "transform",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        tl.to(el, { x: () => -distance(), ease: "none" }, 0);
        tl.fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} className={`relative flex flex-col justify-center overflow-hidden py-section md:min-h-svh md:py-0 ${className ?? ""}`}>
      {header}
      <div
        ref={track}
        className={`flex snap-x snap-mandatory scroll-px-gutter overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:snap-none ${trackClassName ?? ""}`}
      >
        {Children.map(children, (child) => (
          <div className="shrink-0 snap-start">{child}</div>
        ))}
      </div>
      <div className="mx-gutter mt-8 hidden h-px bg-border md:block" aria-hidden>
        <div ref={bar} className="h-full origin-left scale-x-0 bg-fg" />
      </div>
    </section>
  );
}

type PinnedStepsProps = {
  /** Each child is one step; they crossfade while the section is pinned. */
  children: ReactNode;
  /** Persistent content shown beside the steps (e.g. a visual or title). */
  aside?: ReactNode;
  className?: string;
};

/**
 * Pinned "storytelling" section: the panel holds still while each step
 * crossfades in. Without motion, steps simply stack vertically.
 */
export function PinnedSteps({ children, aside, className }: PinnedStepsProps) {
  const section = useRef<HTMLElement>(null);
  const steps = Children.toArray(children);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK_DESKTOP, () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-step]");
        const dots = gsap.utils.toArray<HTMLElement>("[data-step-dot]");
        const stage = section.current!.querySelector<HTMLElement>("[data-stage]")!;
        const tallest = Math.max(...items.map((item) => item.offsetHeight));
        gsap.set(stage, { height: tallest });
        gsap.set(items, { position: "absolute", inset: 0 });
        gsap.set(items.slice(1), { autoAlpha: 0, y: 24 });
        gsap.set(dots.slice(1), { opacity: 0.25 });

        const tl = gsap.timeline({
          defaults: { ease: ease("in-out"), duration: 1 },
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${window.innerHeight * (items.length - 0.5)}`,
            pin: true,
            scrub: 0.6,
          },
        });
        // Outgoing step clears before the next arrives, so text never overlaps.
        items.slice(1).forEach((item, i) => {
          tl.to(items[i], { autoAlpha: 0, y: -24, duration: 0.45 }, i + 0.5)
            .to(dots[i], { opacity: 0.25, duration: 0.45 }, "<")
            .to(item, { autoAlpha: 1, y: 0, duration: 0.55 }, i + 0.95)
            .to(dots[i + 1], { opacity: 1, duration: 0.55 }, "<");
        });
        tl.to({}, { duration: 0.5 });
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} className={`relative flex min-h-svh items-center px-gutter py-section md:py-0 ${className ?? ""}`}>
      <div className="mx-auto grid w-full max-w-page gap-12 md:grid-cols-2 md:items-center">
        <div>{aside}</div>
        <div className="flex gap-6">
          <ol className="hidden flex-col gap-3 pt-2 md:flex" aria-hidden>
            {steps.map((_, i) => (
              <li key={i} data-step-dot className="size-2 rounded-full bg-fg" />
            ))}
          </ol>
          <div data-stage className="relative flex-1 space-y-6 md:space-y-0 md:rounded-md md:bg-surface">
            {steps.map((step, i) => (
              <div key={i} data-step className="rounded-md bg-surface p-8 md:bg-transparent md:p-12">
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
