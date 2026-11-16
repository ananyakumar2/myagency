"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { Burst } from "@/components/interaction/burst/burst";
import { LetterPush } from "@/components/interaction/letter-push";
import { CurtainLink } from "@/components/interaction/transitions/curtain";
import { Magnetic } from "@/components/motion/magnetic";
import { Parallax } from "@/components/motion/parallax";
import { HeroCanvas } from "@/components/three/hero-canvas";
import { heroTuning } from "@/lib/interaction/config";
import { onLoaderDone } from "@/lib/interaction/readiness";
import { ease } from "@/lib/motion/ease";
import { gsap } from "@/lib/motion/gsap";

const FIELDS = ["var(--color-paper)", "var(--color-saffron)", "var(--color-sea)", "var(--color-lacquer)"];
const label = "font-mono text-xs tracking-wide text-fg-muted uppercase";

/**
 * Decision 33: the hero holds each field colour for 2.5 s, then the next one
 * wipes up from the bottom (0.9 s); it pauses off-screen and waits for the
 * loader to hand off. Decision 9: the headline's letters lean away from the
 * cursor. Decision 5: the eyebrow scrambles between phrases in bursts.
 */
export function HomeHero() {
  const section = useRef<HTMLElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  // Before paint: words wait below their line for the handoff.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = title.current?.querySelectorAll("[data-word]");
    if (!words?.length) return;
    gsap.set(words, { yPercent: 70, opacity: 0 });
    return onLoaderDone(() => {
      const p = heroTuning.params;
      gsap.to(words, { yPercent: 0, opacity: 1, duration: p.word, stagger: p.stagger, ease: ease("out"), delay: 0.1 });
    });
  }, []);

  useEffect(() => {
    const el = section.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let index = 0;
    let visible = true;
    let started = false;
    let timer: gsap.core.Tween | null = null;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && started && !timer?.isActive()) schedule();
    });
    io.observe(el);

    const step = () => {
      if (!visible || document.hidden) return;
      const p = heroTuning.params;
      const next = (index + 1) % FIELDS.length;
      const w = wipe.current!;
      w.style.background = FIELDS[next];
      gsap.fromTo(
        w,
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: p.wipe,
          ease: ease("in-out"),
          onComplete: () => {
            base.current!.style.background = FIELDS[next];
            gsap.set(w, { clipPath: "inset(100% 0% 0% 0%)" });
            index = next;
            schedule();
          },
        },
      );
    };
    const schedule = () => {
      timer?.kill();
      timer = gsap.delayedCall(heroTuning.params.hold, step) as unknown as gsap.core.Tween;
    };
    const stopWaiting = onLoaderDone(() => {
      started = true;
      schedule();
    });
    return () => {
      stopWaiting();
      timer?.kill();
      io.disconnect();
    };
  }, []);

  return (
    <section ref={section} className="relative grid min-h-svh items-end overflow-hidden px-gutter pt-32 pb-16 md:pb-24">
      <div ref={base} aria-hidden className="absolute inset-0 -z-20" style={{ background: FIELDS[0] }} />
      <div ref={wipe} aria-hidden className="absolute inset-0 -z-20" style={{ clipPath: "inset(100% 0% 0% 0%)" }} />
      <Parallax
        speed={0.5}
        className="absolute inset-x-0 top-16 -z-10 h-[55svh] md:inset-y-0 md:left-[38%] md:h-auto"
        innerClassName="h-full"
      >
        <HeroCanvas className="h-full w-full" />
      </Parallax>
      <div className="mx-auto w-full max-w-page">
        <Burst
          kind="scramble"
          phrases={["Placeholder studio", "Dubai · Abu Dhabi", "Interaction-led design"]}
          className={`${label} mb-6 block`}
        />
        <h1 ref={title} className="max-w-[14ch] text-display leading-tight font-medium tracking-tight">
          <LetterPush text="Quiet motion for considered brands." />
        </h1>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Magnetic>
            <CurtainLink
              href="/work"
              curtainTitle="Work"
              data-press=""
              className="inline-flex h-14 items-center rounded-full bg-accent px-8 text-sm font-medium text-accent-fg"
            >
              See the work
            </CurtainLink>
          </Magnetic>
          <span className="text-sm text-fg-muted">Scroll to explore ↓</span>
        </div>
      </div>
    </section>
  );
}
