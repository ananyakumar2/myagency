"use client";

import { useLenis } from "lenis/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type RefObject } from "react";

import { MirrorImage } from "@/components/interaction/mirror/mirror-image";
import { MirrorRoot } from "@/components/interaction/mirror/mirror-root";
import { prefersReducedMotion } from "@/lib/interaction/capability";
import { ease } from "@/lib/motion/ease";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

import { STEPS, UNIVERSES, WORD_SETS, type Universe } from "./config";
import { createState } from "./motion";

const CubeScene = dynamic(() => import("./cube-scene"), { ssr: false });

const FACE_PX = 400;

export type CubeLabOptions = { mode: "words" | "universes"; snap: "off" | "steps"; words: string };

export function CubeLab({ mode, snap, words }: CubeLabOptions) {
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const faces = useRef<(HTMLDivElement | null)[]>([]);
  const [state] = useState(createState);
  const [step, setStep] = useState(0);
  const wordSet = WORD_SETS.find((w) => w.key === words) ?? WORD_SETS[0]!;
  const universes = mode === "universes";

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      if (reduced) {
        gsap.set(state, { intro: 1, universe: universes ? 1 : 0 });
      } else {
        gsap.to(state, { intro: 1, duration: 2.2, ease: "none", delay: 0.2 });
        if (universes) gsap.to(state, { universe: 1, duration: 1, ease: ease("soft"), delay: 1.6 });
      }

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => {
            const p = self.progress;
            let i = 0;
            STEPS.forEach((s, n) => {
              if (p >= s.at - 0.04) i = n;
            });
            setStep(i);
          },
        },
      });
      tl.to(state, { slide: 1, duration: 2.3 }, 0.3)
        .to(state, { swing: 1, duration: 3 }, 3.4)
        .to(state, { roll: 1, duration: 1.5, ease: "sine.inOut" }, 3.4)
        .to(state, { roll: 0, duration: 1.5, ease: "sine.inOut" }, 4.9)
        .to(state, { flatten: 1, duration: 2.4 }, 7.2)
        .to({}, { duration: 0.4 }, 9.6);
      trigger.current = tl.scrollTrigger ?? null;
    },
    { scope: section, dependencies: [universes] },
  );

  useSnap(snap === "steps", trigger);

  return (
    <MirrorRoot ignoreRetreats>
      <section ref={section} aria-label="Cube structure" className="relative h-[600vh]">
        <div className="sticky top-0 h-svh overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {universes &&
              UNIVERSES.map((u, n) => (
                <div
                  key={n}
                  ref={(el) => {
                    faces.current[n] = el;
                  }}
                  className="absolute top-0 left-0 origin-top-left"
                  style={{ width: FACE_PX, height: FACE_PX, opacity: 0 }}
                >
                  <UniverseFace universe={u} />
                </div>
              ))}
          </div>
          <div className="absolute inset-0">
            <CubeScene state={state} words={wordSet} universes={universes} faces={faces} faceSize={FACE_PX} />
          </div>
        </div>
      </section>
      <footer className="px-gutter py-24 text-sm text-fg-muted">End of the cube lab.</footer>
      <Panel mode={mode} snap={snap} words={wordSet.key} step={step} />
    </MirrorRoot>
  );
}

function UniverseFace({ universe }: { universe: Universe }) {
  const frame = () => {
    const x = (gsap.ticker.time * universe.fps) / universe.frames.length + universe.offset * 2;
    const m = x % 2;
    return m < 1 ? m : 2 - m;
  };
  return <MirrorImage src={universe.poster} alt="" frames={universe.frames} frame={frame} projected priority className="absolute inset-0" />;
}

/**
 * Once the hand is off the wheel and Lenis has slowed to a drift, glide to
 * the next resting state in the direction of travel.
 */
function useSnap(on: boolean, trigger: RefObject<ScrollTrigger | null>) {
  const lenis = useLenis();
  useEffect(() => {
    if (!on || !lenis) return;
    let pending: gsap.core.Tween | null = null;
    let snapping = false;
    let dir = 1;
    let lastInput = 0;
    const settle = () => {
      const st = trigger.current;
      if (!st || snapping) return;
      const y = lenis.animatedScroll;
      if (y < st.start - 1 || y > st.end + 1) return;
      const p = (y - st.start) / (st.end - st.start);
      if (STEPS.some((s) => Math.abs(s.at - p) < 0.008)) return;
      const ahead = dir > 0 ? STEPS.find((s) => s.at > p) : [...STEPS].reverse().find((s) => s.at < p);
      if (!ahead) return;
      snapping = true;
      pending?.kill();
      lenis.scrollTo(st.start + ahead.at * (st.end - st.start), {
        duration: 1.2,
        easing: gsap.parseEase(ease("in-out")),
        lock: true,
        onComplete: () => {
          snapping = false;
        },
      });
    };
    const onInput = () => {
      lastInput = gsap.ticker.time;
    };
    const onScroll = () => {
      if (snapping) return;
      if (lenis.direction) dir = lenis.direction;
      pending?.kill();
      if (gsap.ticker.time - lastInput > 0.15 && Math.abs(lenis.velocity) < 2) settle();
      else pending = gsap.delayedCall(0.2, settle);
    };
    lenis.on("virtual-scroll", onInput);
    lenis.on("scroll", onScroll);
    return () => {
      lenis.off("virtual-scroll", onInput);
      lenis.off("scroll", onScroll);
      pending?.kill();
    };
  }, [on, lenis, trigger]);
}

function Panel({ mode, snap, words, step }: { mode: string; snap: string; words: string; step: number }) {
  const href = (patch: Record<string, string>) => `?${new URLSearchParams({ mode, snap, words, ...patch })}`;
  const opt = (key: string, value: string, label: string, current: string) => (
    <a
      key={value}
      href={href({ [key]: value })}
      aria-current={current === value ? "true" : undefined}
      className={`rounded-full px-2.5 py-1 ${current === value ? "bg-fg text-bg" : "text-fg-muted hover:text-fg"}`}
    >
      {label}
    </a>
  );
  return (
    <aside className="fixed right-4 bottom-4 z-(--z-panel) flex flex-col gap-1.5 rounded-xl bg-bg/90 p-3 font-mono text-[11px] text-fg shadow-sm ring-1 ring-border backdrop-blur">
      <p className="px-1 tracking-wide uppercase">
        Cubes · {step + 1}/{STEPS.length} {STEPS[step]?.label}
      </p>
      <div className="flex gap-1">
        {opt("mode", "words", "Words", mode)}
        {opt("mode", "universes", "Universes", mode)}
      </div>
      <div className="flex gap-1">
        {opt("snap", "off", "Snap off", snap)}
        {opt("snap", "steps", "Snap to steps", snap)}
      </div>
      <div className="flex gap-1">{WORD_SETS.map((w) => opt("words", w.key, w.label, words))}</div>
    </aside>
  );
}
