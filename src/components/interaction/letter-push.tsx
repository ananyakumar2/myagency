"use client";

import { useEffect, useRef, type ElementType } from "react";

import { isFinePointer, prefersReducedMotion } from "@/lib/interaction/capability";
import { letterTuning } from "@/lib/interaction/config";
import { pointer, startPointer } from "@/lib/interaction/pointer";
import { damp } from "@/lib/motion/ease";
import { gsap } from "@/lib/motion/gsap";

type LetterPushProps = {
  text: string;
  as?: ElementType;
  className?: string;
  /** Classes for each letter span, e.g. to hide letters before a reveal. */
  letterClassName?: string;
};

/**
 * Decision 9: letters lean away from the cursor (Auge's carousel titles):
 * up to 4 px, within 2.4 letter widths, cosine falloff, smoothed per frame.
 * Words stay unbroken so wrapping is unchanged.
 */
export function LetterPush({ text, as: Tag = "span", className, letterClassName }: LetterPushProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !isFinePointer()) return;
    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-letter]"));
    const stopPointer = startPointer();
    let centres: { x: number; y: number; w: number }[] = [];
    const offsets = letters.map(() => ({ x: 0, y: 0 }));
    let base = el.getBoundingClientRect();

    const measure = () => {
      letters.forEach((l) => (l.style.translate = ""));
      base = el.getBoundingClientRect();
      centres = letters.map((l) => {
        const r = l.getBoundingClientRect();
        return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2, w: r.width };
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 100) / 1000;
      const p = letterTuning.params;
      const r = el.getBoundingClientRect();
      const px = pointer.x - r.left;
      const py = pointer.y - r.top;
      const k = damp(p.smoothing, dt);
      for (let i = 0; i < letters.length; i++) {
        const c = centres[i];
        if (!c) continue;
        let tx = 0;
        let ty = 0;
        if (pointer.active) {
          const dx = c.x - px;
          const dy = c.y - py;
          const dist = Math.hypot(dx, dy);
          const radius = p.radius * Math.max(c.w, 8);
          if (dist < radius && dist > 0.001) {
            const fall = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
            tx = (dx / dist) * p.max * fall;
            ty = (dy / dist) * p.max * fall * p.lift;
          }
        }
        const o = offsets[i];
        o.x += (tx - o.x) * k;
        o.y += (ty - o.y) * k;
        if (Math.abs(o.x) < 0.01 && Math.abs(o.y) < 0.01 && tx === 0 && ty === 0) {
          if (o.x !== 0 || o.y !== 0) letters[i].style.translate = "";
          o.x = o.y = 0;
          continue;
        }
        letters[i].style.translate = `${o.x.toFixed(2)}px ${o.y.toFixed(2)}px`;
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      stopPointer();
    };
  }, [text]);

  const words = text.split(/(\s+)/);
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, wi) =>
        /^\s+$/.test(word) ? (
          <span key={wi} aria-hidden>
            {" "}
          </span>
        ) : (
          <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
            {[...word].map((ch, ci) => (
              <span key={ci} data-letter="" className={`inline-block ${letterClassName ?? ""}`}>
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </Tag>
  );
}
