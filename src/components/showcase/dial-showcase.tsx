"use client";

/* eslint-disable @next/next/no-img-element -- lab prototype */

import { useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/use-media-query";
import { duration, ease } from "@/lib/motion/ease";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

import { BowImage } from "./bow-image";
import { CentreLink } from "./centre-link";
import { PROJECTS, pad, projectHref } from "./projects";
import { StaticShowcase } from "./static-showcase";
import { usePinnedSteps } from "./use-pinned-steps";
import { bendFrom, useScrollVelocity } from "./use-scroll-velocity";

/** Faces on the drum: the four names three times over, so the wheel always reads full. */
const FACES = 12;
const STEP = 360 / FACES;
const N = PROJECTS.length;

export function DialShowcase() {
  const reduced = useReducedMotion();
  return reduced ? <StaticShowcase /> : <Dial />;
}

function Dial() {
  const section = useRef<HTMLElement>(null);
  const drum = useRef<HTMLDivElement>(null);
  const faces = useRef<(HTMLElement | null)[]>([]);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const counter = useRef<HTMLSpanElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const pos = useRef(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const velocity = useScrollVelocity();
  const { goTo } = usePinnedSteps(trigger, N - 1);

  useGSAP(
    () => {
      const bg = gsap.utils.interpolate(PROJECTS.map((p) => p.field));
      const fg = gsap.utils.interpolate(PROJECTS.map((p) => p.deep));
      const el = section.current!;

      const render = (f: number) => {
        pos.current = f;
        drum.current!.style.transform = `translateZ(calc(var(--r) * -1)) rotateX(${f * STEP}deg)`;
        faces.current.forEach((face, i) => {
          if (!face) return;
          let rel = ((i - f) * STEP) % 360;
          if (rel > 180) rel -= 360;
          if (rel < -180) rel += 360;
          const c = Math.cos((rel * Math.PI) / 180);
          face.style.opacity = c > 0.2 ? String(0.12 + 0.88 * Math.pow(c, 14)) : "0";
        });
        layers.current.forEach((layer, k) => {
          if (!layer || k === 0) return;
          const t = gsap.utils.clamp(0, 1, f - (k - 1));
          layer.style.clipPath = `inset(${(1 - t) * 100}% 0 0 0)`;
          layer.style.visibility = t > 0 ? "visible" : "hidden";
        });
        el.style.setProperty("--dial-bg", bg(f / (N - 1)));
        el.style.setProperty("--dial-fg", fg(f / (N - 1)));
        const idx = Math.round(f);
        if (idx !== activeRef.current) {
          activeRef.current = idx;
          setActive(idx);
          if (counter.current) counter.current.textContent = pad(idx + 1);
        }
      };

      trigger.current = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${(N - 1) * window.innerHeight * 0.9}`,
        pin: true,
        onUpdate: (self) => render(self.progress * (N - 1)),
        onRefresh: (self) => render(self.progress * (N - 1)),
      });
      render(0);
    },
    { scope: section },
  );

  useGSAP(
    () => {
      gsap.fromTo(
        "[data-dial-swap]",
        { yPercent: 40, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: duration("base"), ease: ease("out"), stagger: 0.06 },
      );
    },
    { scope: section, dependencies: [active] },
  );

  const project = PROJECTS[active];
  const bend = () => bendFrom(velocity.current);

  return (
    <section
      ref={section}
      aria-label="Selected work"
      className="relative flex h-svh items-center overflow-hidden text-(--dial-fg) transition-none"
      style={{ backgroundColor: "var(--dial-bg)" }}
    >
      <div className="mx-auto grid w-full max-w-page grid-cols-1 items-center gap-10 px-gutter pt-16 md:grid-cols-12">
        {/* The dial: a drum of names, turned by the scroll wheel. */}
        <div className="relative md:col-span-5">
          <div className="mb-6 flex items-center gap-3 font-mono text-xs tracking-wide uppercase opacity-70">
            <span>Selected work</span>
            <span className="h-px w-10 bg-current" />
            <span>
              <span ref={counter}>01</span> / {pad(N)}
            </span>
          </div>
          <div
            className="relative h-[min(52svh,26rem)] [--face:clamp(1.9rem,0.5rem+3vw,4rem)] [--r:calc(var(--face)*1.05*1.866)]"
            style={{ perspective: "1400px", perspectiveOrigin: "40% 50%" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-current opacity-15" style={{ height: "calc(var(--face) * 1.05)" }} />
            <div ref={drum} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
              {Array.from({ length: FACES }, (_, i) => {
                const k = i % N;
                const p = PROJECTS[k];
                return (
                  <CentreLink
                    key={i}
                    ref={(node) => {
                      faces.current[i] = node;
                    }}
                    href={projectHref(p.slug)}
                    centred={active === k}
                    onCentre={() => goTo(k)}
                    tabIndex={i < N ? 0 : -1}
                    aria-hidden={i >= N ? true : undefined}
                    className="absolute inset-x-0 top-1/2 flex items-center gap-4 leading-none font-medium tracking-tight whitespace-nowrap"
                    style={{
                      height: "calc(var(--face) * 1.05)",
                      marginTop: "calc(var(--face) * -0.525)",
                      fontSize: "var(--face)",
                      transform: `rotateX(${-i * STEP}deg) translateZ(var(--r))`,
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <span className="font-mono text-[0.18em] opacity-60">{pad(k + 1)}</span>
                    {p.name}
                  </CentreLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* The stage: one big image per project, wiped in by the same scroll. */}
        <div className="md:col-span-7">
          <CentreLink
            href={projectHref(project.slug)}
            centred
            onCentre={() => {}}
            aria-label={`Open ${project.name}`}
            className="relative block aspect-[16/10] w-full"
          >
            {PROJECTS.map((p, k) => (
              <div
                key={p.slug}
                ref={(node) => {
                  layers.current[k] = node;
                }}
                className="absolute inset-0"
                style={{ zIndex: k }}
              >
                <BowImage
                  src={p.hero.src}
                  alt={p.hero.alt}
                  frames={p.frames}
                  frame={p.frames ? () => gsap.utils.clamp(0, 1, pos.current - (k - 1)) : undefined}
                  bend={bend}
                  axis="y"
                  radius={10}
                  priority={k === 0}
                  className="size-full"
                />
              </div>
            ))}
          </CentreLink>

          <div className="mt-6 grid grid-cols-12 gap-4 overflow-hidden">
            <div className="col-span-12 md:col-span-6">
              <p data-dial-swap className="max-w-[40ch] text-lg leading-snug">
                {project.line}
              </p>
              <p data-dial-swap className="mt-3 font-mono text-xs tracking-wide uppercase opacity-70">
                {project.sector} · {project.place}
              </p>
            </div>
            <ul className="col-span-12 grid grid-cols-3 gap-3 md:col-span-6">
              {project.details.slice(0, 3).map((d) => (
                <li key={d.src} data-dial-swap className="aspect-[4/3] overflow-hidden rounded-sm">
                  <img src={d.src} alt={d.alt} className="size-full object-cover" draggable={false} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
