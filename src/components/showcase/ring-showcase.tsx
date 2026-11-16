"use client";

import { useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/use-media-query";
import { duration, ease } from "@/lib/motion/ease";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

import { BowImage } from "./bow-image";
import { CentreLink } from "./centre-link";
import { PROJECTS, pad, projectHref, type ShowcaseImage, type ShowcaseProject } from "./projects";
import { StaticShowcase } from "./static-showcase";
import { bendFrom } from "./use-scroll-velocity";

type Panel = { project: ShowcaseProject; k: number; image: ShowcaseImage; frames?: string[] };

/** Three panels per project — the hero, a second view, a close crop — so twelve panels close the ring. */
const PANELS: Panel[] = PROJECTS.flatMap((project, k) => [
  { project, k, image: project.hero, frames: project.frames },
  { project, k, image: project.details[0] },
  { project, k, image: project.tall },
]);
const COUNT = PANELS.length;
const STEP = 360 / COUNT;
/** Degrees the ring turns across the pinned scroll. */
const SCROLL_TURN = 360 - STEP;
const IDLE_AFTER = 2.6;

export function RingShowcase() {
  const reduced = useReducedMotion();
  return reduced ? <StaticShowcase /> : <Ring />;
}

const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

function Ring() {
  const section = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const shades = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef({ scroll: 0, offset: 0, angle: 0, speed: 0 });
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  const centre = useRef<(i: number) => void>(() => {});

  useGSAP(
    () => {
      const m = motion.current;
      const el = section.current!;
      let lastInput = 0;
      let inView = false;
      let drift: gsap.core.Tween | null = null;

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${window.innerHeight * 2.2}`,
        pin: true,
        onUpdate: (self) => {
          m.scroll = -self.progress * SCROLL_TURN;
          lastInput = gsap.ticker.time;
        },
        onToggle: (self) => (inView = self.isActive),
      });

      const settleTo = (target: number, dur = duration("slow")) => {
        drift?.kill();
        drift = gsap.to(m, { offset: target, duration: dur, ease: "expo.out" });
      };

      centre.current = (i: number) => {
        lastInput = gsap.ticker.time;
        const delta = wrap(-i * STEP - (m.scroll + m.offset));
        settleTo(m.offset + delta);
      };

      // Idle motion in bursts (answer 5): a quick one-panel turn that eases out long, then a rest.
      // Paused under the pointer so a panel never slides away from a click.
      let hovering = false;
      const idle = () => {
        if (inView && !hovering && gsap.ticker.time - lastInput > IDLE_AFTER) {
          drift?.kill();
          const snapped = Math.round((m.scroll + m.offset) / STEP) * STEP - m.scroll;
          drift = gsap.to(m, { offset: snapped - STEP, duration: 1.8, ease: "expo.out" });
        }
      };
      const idleTimer = window.setInterval(idle, 3400);

      // Drag to spin, with a thrown glide that lands on a panel.
      const stage = el.querySelector<HTMLElement>("[data-ring-stage]")!;
      let dragging = false;
      let moved = 0;
      let lastX = 0;
      let vx = 0;
      const down = (e: PointerEvent) => {
        if (e.button !== 0) return;
        dragging = true;
        moved = 0;
        lastX = e.clientX;
        vx = 0;
        drift?.kill();
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        vx = dx;
        m.offset += dx * 0.09;
        lastInput = gsap.ticker.time;
        if (moved > 6) stage.setPointerCapture(e.pointerId);
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        if (moved <= 6) return;
        const thrown = m.scroll + m.offset + vx * 1.6;
        settleTo(Math.round(thrown / STEP) * STEP - m.scroll, 1.6);
      };
      const blockClickAfterDrag = (e: MouseEvent) => {
        if (moved > 6) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const enter = () => (hovering = true);
      const leave = () => (hovering = false);
      stage.addEventListener("pointerenter", enter);
      stage.addEventListener("pointerleave", leave);
      stage.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      stage.addEventListener("click", blockClickAfterDrag, true);

      const fields = PROJECTS.map((p) => p.field);
      const deeps = PROJECTS.map((p) => p.deep);
      const tick = () => {
        const angle = m.scroll + m.offset;
        m.speed = angle - m.angle;
        m.angle = angle;
        ring.current!.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${angle}deg)`;
        panels.current.forEach((panel, i) => {
          const rel = wrap(i * STEP + angle);
          const c = Math.cos((rel * Math.PI) / 180);
          const shade = shades.current[i];
          if (shade) shade.style.opacity = String(gsap.utils.clamp(0, 0.82, (1 - c) * 0.55));
          if (panel) panel.style.zIndex = String(Math.round(c * 100) + 100);
        });
        const idx = ((Math.round(-angle / STEP) % COUNT) + COUNT) % COUNT;
        if (idx !== frontRef.current) {
          frontRef.current = idx;
          setFront(idx);
          const k = PANELS[idx].k;
          gsap.to(el, {
            "--ring-bg": fields[k],
            "--ring-fg": deeps[k],
            duration: 0.6,
            ease: ease("out"),
            overwrite: "auto",
          });
        }
      };
      gsap.set(el, { "--ring-bg": fields[0], "--ring-fg": deeps[0] });
      gsap.ticker.add(tick);

      return () => {
        st.kill();
        drift?.kill();
        window.clearInterval(idleTimer);
        gsap.ticker.remove(tick);
        stage.removeEventListener("pointerenter", enter);
        stage.removeEventListener("pointerleave", leave);
        stage.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        stage.removeEventListener("click", blockClickAfterDrag, true);
      };
    },
    { scope: section },
  );

  useGSAP(
    () => {
      gsap.fromTo(
        "[data-ring-swap]",
        { yPercent: 100 },
        { yPercent: 0, duration: duration("base"), ease: ease("out"), stagger: 0.05 },
      );
    },
    { scope: section, dependencies: [PANELS[front].k] },
  );

  const current = PANELS[front].project;
  const bend = () => bendFrom(motion.current.speed * 9, 0.004, 0.14);

  return (
    <section
      ref={section}
      aria-label="Selected work"
      className="relative h-svh overflow-hidden bg-(--ring-bg) text-(--ring-fg)"
    >
      <div
        data-ring-stage
        data-cursor-label="Drag"
        className="absolute inset-x-0 top-[7svh] h-[72svh] cursor-grab touch-pan-y select-none active:cursor-grabbing [--h:min(58svh,calc(var(--w)*1.3))] [--r:calc(var(--w)*1.866)] [--w:clamp(12rem,24vw,28rem)]"
        style={{ perspective: "2000px", perspectiveOrigin: "50% 38%" }}
      >
        <div className="absolute top-1/2 left-1/2" style={{ transformStyle: "preserve-3d", transform: "rotateX(-4deg)" }}>
          <div ref={ring} style={{ transformStyle: "preserve-3d" }}>
            {PANELS.map((panel, i) => (
              <CentreLink
                key={`${panel.project.slug}-${i}`}
                ref={(node) => {
                  panels.current[i] = node;
                }}
                href={projectHref(panel.project.slug)}
                centred={front === i}
                onCentre={() => centre.current(i)}
                draggable={false}
                aria-label={`${panel.project.name}${i % 3 ? " — detail" : ""}`}
                className="absolute block"
                style={{
                  width: "var(--w)",
                  height: "var(--h)",
                  left: "calc(var(--w) / -2)",
                  top: "calc(var(--h) / -2)",
                  transform: `rotateY(${i * STEP}deg) translateZ(var(--r))`,
                }}
              >
                <BowImage
                  src={panel.image.src}
                  alt={panel.image.alt}
                  frames={panel.frames}
                  frame={panel.frames ? () => 0.5 + 0.5 * Math.sin(motion.current.angle / 40) : undefined}
                  bend={bend}
                  axis="x"
                  radius={6}
                  className="size-full"
                />
                <div
                  ref={(node) => {
                    shades.current[i] = node;
                  }}
                  className="pointer-events-none absolute inset-0 rounded-[6px] bg-(--ring-fg)"
                />
              </CentreLink>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-page items-end justify-between gap-8 px-gutter pb-[6svh]">
        <div className="overflow-hidden">
          <h3 data-ring-swap className="text-4xl leading-tight font-medium tracking-tight">
            {current.name}
          </h3>
        </div>
        <div className="hidden max-w-[36ch] overflow-hidden text-right md:block">
          <p data-ring-swap className="leading-snug">
            {current.line}
          </p>
        </div>
        <ol className="flex shrink-0 gap-3 font-mono text-xs" aria-label="Projects">
          {PROJECTS.map((p, k) => (
            <li key={p.slug} className={k === PANELS[front].k ? "opacity-100" : "opacity-40"}>
              {pad(k + 1)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
