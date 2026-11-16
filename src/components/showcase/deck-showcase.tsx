"use client";

/* eslint-disable @next/next/no-img-element -- lab prototype */

import { useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/use-media-query";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

import { BowImage } from "./bow-image";
import { CentreLink } from "./centre-link";
import { PROJECTS, pad, projectHref } from "./projects";
import { StaticShowcase } from "./static-showcase";
import { usePinnedSteps } from "./use-pinned-steps";
import { bendFrom, useScrollVelocity } from "./use-scroll-velocity";

const N = PROJECTS.length;
/** Each incoming sheet arrives tilted, alternating sides, like paper dropped on a pile. */
const TILT = [0, -7, 5.5, -4.5];
/** Sheets don't land perfectly square; a little resting skew keeps the pile physical. */
const REST = [0, 0.8, -0.6, 0.5];

export function DeckShowcase() {
  const reduced = useReducedMotion();
  return reduced ? <StaticShowcase /> : <Deck />;
}

function Deck() {
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const velocity = useScrollVelocity();
  const { goTo } = usePinnedSteps(trigger, N - 1);

  useGSAP(
    () => {
      const sheets = gsap.utils.toArray<HTMLElement>("[data-sheet]");
      const shades = gsap.utils.toArray<HTMLElement>("[data-sheet-shade]");
      const tl = gsap.timeline({ defaults: { ease: "none" } });

      sheets.forEach((sheet, k) => {
        if (k === 0) return;
        const at = k - 1;
        tl.fromTo(
          sheet,
          { yPercent: 135, rotate: TILT[k], xPercent: TILT[k] * 1.2 },
          { yPercent: 0, rotate: REST[k], xPercent: 0, duration: 1, ease: "power2.out" },
          at,
        );
        // Every sheet already on the pile sinks one step deeper.
        sheets.slice(0, k).forEach((under, j) => {
          const depth = k - j;
          tl.to(under, { scale: 1 - depth * 0.045, yPercent: -depth * 2.6, duration: 1 }, at);
          tl.to(shades[j], { opacity: Math.min(0.12 + depth * 0.14, 0.5), duration: 1 }, at);
        });
      });

      trigger.current = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: () => `+=${(N - 1) * window.innerHeight}`,
        pin: true,
        animation: tl,
        scrub: true,
        onUpdate: (self) => {
          const f = self.progress * (N - 1);
          progress.current = f;
          const idx = Math.round(f);
          if (idx !== activeRef.current) {
            activeRef.current = idx;
            setActive(idx);
          }
        },
      });
    },
    { scope: section },
  );

  const bend = () => bendFrom(velocity.current, 0.005);

  return (
    <section ref={section} aria-label="Selected work" className="relative h-svh overflow-hidden bg-bg">
      <div className="absolute inset-x-gutter top-[11svh] bottom-[13svh] z-0">
        {PROJECTS.map((p, k) => (
          <CentreLink
            key={p.slug}
            href={projectHref(p.slug)}
            centred={active === k}
            onCentre={() => goTo(k)}
            data-sheet
            className="absolute inset-0 block origin-[50%_30%] overflow-hidden rounded-[14px] shadow-[0_30px_80px_-40px_rgba(20,17,14,0.55)]"
            style={{ backgroundColor: p.field, color: p.deep, zIndex: k }}
          >
            <article className="grid size-full grid-cols-12 grid-rows-[auto_1fr_auto] gap-x-6 p-[clamp(1rem,2.2vw,2rem)]">
              <header className="col-span-12 flex items-center justify-between font-mono text-xs tracking-wide uppercase">
                <span>
                  {pad(k + 1)} / {pad(N)}
                </span>
                <span className="hidden md:block">{p.sector}</span>
                <span>{p.place}</span>
              </header>

              <div className="col-span-12 flex flex-col justify-end md:col-span-5">
                <h3 className="text-display leading-[0.9] font-medium tracking-tight">{p.name}</h3>
                <p className="mt-5 max-w-[34ch] text-lg leading-snug opacity-80">{p.line}</p>
              </div>

              <div className="relative col-span-12 row-span-2 mt-4 hidden md:col-span-7 md:block">
                <BowImage
                  src={p.hero.src}
                  alt={p.hero.alt}
                  frames={p.frames}
                  frame={p.frames ? () => gsap.utils.clamp(0, 1, progress.current - (N - 2)) : undefined}
                  bend={bend}
                  axis="y"
                  radius={8}
                  priority={k === 0}
                  className="size-full"
                />
              </div>

              <ul className="col-span-12 mt-6 grid grid-cols-3 gap-3 md:col-span-5">
                {p.details.slice(0, 3).map((d) => (
                  <li key={d.src} className="aspect-[4/3] overflow-hidden rounded-[4px]">
                    <img src={d.src} alt={d.alt} className="size-full object-cover" draggable={false} />
                  </li>
                ))}
              </ul>
            </article>
            <div data-sheet-shade className="pointer-events-none absolute inset-0 bg-[#14110e] opacity-0" />
          </CentreLink>
        ))}
      </div>

      {/* Index tabs: the whole deck is always visible, even with only four sheets. */}
      <nav aria-label="Projects" className="absolute inset-x-gutter bottom-[3svh] z-10">
        <ol className="grid grid-cols-4 gap-2">
          {PROJECTS.map((p, k) => (
            <li key={p.slug}>
              <CentreLink
                href={projectHref(p.slug)}
                centred={active === k}
                onCentre={() => goTo(k)}
                className="flex items-center justify-between gap-2 rounded-t-[10px] border-t-2 px-3 pt-2 pb-3 text-sm transition-[background-color,color] duration-(--duration-fast)"
                style={{
                  borderColor: p.deep,
                  backgroundColor: active === k ? p.field : "transparent",
                  color: active === k ? p.deep : "var(--color-fg)",
                }}
              >
                <span className="truncate font-medium">{p.name}</span>
                <span className="font-mono text-xs opacity-60">{pad(k + 1)}</span>
              </CentreLink>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
