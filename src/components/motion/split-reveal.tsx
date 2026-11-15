"use client";

import { useRef, type ElementType, type ReactNode } from "react";

import { duration, ease } from "@/lib/motion/ease";
import { gsap, SplitText, useGSAP } from "@/lib/motion/gsap";
import { MOTION_OK, MOTION_OK_DESKTOP } from "@/lib/motion/queries";

type SplitRevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /**
   * "lines" – masked line-by-line slide up when entering the viewport.
   * "words-scrub" – words brighten in step with scroll position.
   */
  mode?: "lines" | "words-scrub";
  delay?: number;
  start?: string;
  /** Play on mount instead of on scroll, for above-the-fold content. */
  immediate?: boolean;
  /**
   * For the page's LCP element (e.g. hero headline). Below 768px it skips the
   * JS split and uses a CSS fade that starts at first paint, so LCP doesn't
   * wait for hydration on slower phones.
   */
  lcp?: boolean;
};

/**
 * Text split reveal built on GSAP SplitText. `autoSplit` re-splits on resize
 * and font load so lines stay correct when the brand typeface swaps in.
 * SplitText adds an aria-label with the full text, so screen readers get
 * the sentence rather than fragments.
 */
export function SplitReveal({
  children,
  as: Tag = "p",
  className,
  mode = "lines",
  delay = 0,
  start = "top 85%",
  immediate = false,
  lcp = false,
}: SplitRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(lcp ? MOTION_OK_DESKTOP : MOTION_OK, () => {
        const split = SplitText.create(el, {
          type: mode === "lines" ? "lines" : "words",
          mask: mode === "lines" ? "lines" : undefined,
          linesClass: "split-line",
          wordsClass: "split-word",
          autoSplit: true,
          // aria-label is only valid on headings and similar roles; on a <p> the
          // split words stay in the accessibility tree in reading order instead.
          aria: /^h[1-6]$/.test(String(Tag)) ? "auto" : "none",
          onSplit(self) {
            gsap.set(el, { opacity: 1 });
            if (mode === "lines") {
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: duration("reveal"),
                ease: ease("out"),
                stagger: 0.12,
                delay,
                scrollTrigger: immediate ? undefined : { trigger: el, start, once: true },
              });
            }
            return gsap.from(self.words, {
              opacity: 0.15,
              ease: "none",
              stagger: 0.1,
              scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
            });
          },
        });
        return () => split.revert();
      });
    },
    { scope: ref, dependencies: [lcp] },
  );

  return (
    <Tag ref={ref} data-split={lcp ? "lcp" : ""} className={className}>
      {children}
    </Tag>
  );
}
