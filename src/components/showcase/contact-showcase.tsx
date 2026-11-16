"use client";

/* eslint-disable @next/next/no-img-element -- lab prototype */

import { useLenis } from "lenis/react";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-media-query";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

import { BowImage } from "./bow-image";
import { CentreLink } from "./centre-link";
import { PROJECTS, pad, projectHref, type ShowcaseImage } from "./projects";
import { StaticShowcase } from "./static-showcase";
import { bendFrom, useScrollVelocity } from "./use-scroll-velocity";

/** Width of one project's spread, in vw. */
const SPREAD = 128;

type Slot = { left: number; top: number; width: number; aspect: string; depth: number };

/**
 * One composition, re-used per project with the images swapped: a colour
 * field, the hero, and four satellite fragments on different parallax depths.
 * Positions are in vw (left/width) and svh (top) inside the spread.
 */
const FIELD = { left: 6, top: 12, width: 62, height: 70 };
const HERO: Slot = { left: 13, top: 20, width: 50, aspect: "16 / 10", depth: 0.08 };
const SATELLITES: Slot[] = [
  { left: 72, top: 9, width: 17, aspect: "4 / 5", depth: -0.22 },
  { left: 70, top: 56, width: 25, aspect: "16 / 10", depth: 0.3 },
  { left: 93, top: 30, width: 13, aspect: "1 / 1", depth: 0.55 },
  { left: 104, top: 64, width: 16, aspect: "4 / 3", depth: -0.12 },
];

export function ContactShowcase() {
  const reduced = useReducedMotion();
  return reduced ? <StaticShowcase /> : <ContactSheet />;
}

function ContactSheet() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const travel = useRef(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const velocity = useScrollVelocity();
  const lenis = useLenis();

  useGSAP(
    () => {
      const el = track.current!;
      const spreads = gsap.utils.toArray<HTMLElement>("[data-spread]");
      const layers = gsap.utils.toArray<HTMLElement>("[data-depth]");
      const skewers = gsap.utils.toArray<HTMLElement>("[data-skew]");
      const measure = () => (travel.current = el.scrollWidth - window.innerWidth);

      const render = (progress: number) => {
        const x = -progress * travel.current;
        el.style.transform = `translate3d(${x}px,0,0)`;
        const vw = window.innerWidth;
        let best = 0;
        let bestD = Infinity;
        spreads.forEach((spread, k) => {
          const centre = spread.offsetLeft + spread.offsetWidth / 2 + x - vw / 2;
          if (Math.abs(centre) < bestD) {
            bestD = Math.abs(centre);
            best = k;
          }
          spread.style.setProperty("--lag", `${-centre}px`);
        });
        if (best !== activeRef.current) {
          activeRef.current = best;
          setActive(best);
        }
        layers.forEach((layer) => {
          const depth = Number(layer.dataset.depth);
          layer.style.translate = `calc(var(--lag) * ${depth * 0.35}) 0`;
        });
      };

      trigger.current = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: () => `+=${measure()}`,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => {
          measure();
          render(self.progress);
        },
      });

      const skew = () => {
        const s = gsap.utils.clamp(-5, 5, -velocity.current * 0.09);
        skewers.forEach((node) => (node.style.transform = `skewX(${s}deg)`));
      };
      gsap.ticker.add(skew);
      return () => gsap.ticker.remove(skew);
    },
    { scope: section },
  );

  const centreSpread = (k: number) => {
    const st = trigger.current;
    const spread = track.current?.querySelectorAll<HTMLElement>("[data-spread]")[k];
    if (!st || !spread || travel.current <= 0) return;
    const x = spread.offsetLeft + spread.offsetWidth / 2 - window.innerWidth / 2;
    const y = st.start + gsap.utils.clamp(0, 1, x / travel.current) * (st.end - st.start);
    if (lenis) lenis.scrollTo(y, { duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: y });
  };

  const bend = () => bendFrom(velocity.current, 0.005);
  const pos = (s: Slot): CSSProperties => ({
    left: `${s.left}vw`,
    top: `${s.top}svh`,
    width: `${s.width}vw`,
    aspectRatio: s.aspect,
  });

  return (
    <section ref={section} aria-label="Selected work" className="relative h-svh overflow-hidden bg-bg text-fg">
      <div ref={track} className="flex h-full w-max will-change-transform">
        <div className="flex h-full w-[34vw] shrink-0 flex-col justify-end px-gutter pb-[10svh]">
          <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Selected work · {pad(PROJECTS.length)}</p>
          <p className="mt-4 max-w-[18ch] text-3xl leading-tight font-medium tracking-tight">
            Four projects, laid out like a contact sheet.
          </p>
        </div>

        {PROJECTS.map((p, k) => {
          const satellites: ShowcaseImage[] = [p.tall, ...p.details]
            .filter((d, i, all) => d.src !== p.hero.src && all.findIndex((o) => o.src === d.src) === i)
            .slice(0, 4);
          const link = (children: ReactNode, style: CSSProperties, depth: number, extra = "") => (
            <CentreLink
              href={projectHref(p.slug)}
              centred={active === k}
              onCentre={() => centreSpread(k)}
              data-depth={depth}
              className={`absolute block ${extra}`}
              style={style}
              tabIndex={-1}
            >
              {children}
            </CentreLink>
          );
          return (
            <div key={p.slug} data-spread className="relative h-full shrink-0" style={{ width: `${SPREAD}vw` }}>
              <div
                data-depth={0}
                aria-hidden
                className="absolute rounded-[3px]"
                style={{
                  left: `${FIELD.left}vw`,
                  top: `${FIELD.top}svh`,
                  width: `${FIELD.width}vw`,
                  height: `${FIELD.height}svh`,
                  backgroundColor: p.field,
                }}
              />
              <span
                data-depth={0}
                className="absolute font-mono text-xs tracking-wide uppercase"
                style={{ left: `${FIELD.left + 1.2}vw`, top: `${FIELD.top + 2}svh`, color: p.deep }}
              >
                {pad(k + 1)} — {p.sector}
              </span>

              {link(
                <BowImage
                  src={p.hero.src}
                  alt={p.hero.alt}
                  frames={p.frames}
                  frame={
                    p.frames
                      ? () => {
                          const st = trigger.current;
                          return st ? gsap.utils.clamp(0, 1, (st.progress - 0.55) / 0.4) : 0;
                        }
                      : undefined
                  }
                  bend={bend}
                  axis="x"
                  radius={4}
                  priority={k === 0}
                  className="size-full"
                />,
                pos(HERO),
                HERO.depth,
              )}

              {satellites.map((img, i) => {
                const s = SATELLITES[i];
                return (
                  <div key={img.src} data-depth={s.depth} className="absolute" style={pos(s)}>
                    <CentreLink
                      href={projectHref(p.slug)}
                      centred={active === k}
                      onCentre={() => centreSpread(k)}
                      tabIndex={-1}
                      data-skew
                      className="block size-full overflow-hidden rounded-[3px] shadow-[0_18px_40px_-24px_rgba(20,17,14,0.6)]"
                    >
                      <img src={img.src} alt={img.alt} className="size-full object-cover" draggable={false} loading="lazy" />
                    </CentreLink>
                  </div>
                );
              })}

              <div
                data-depth={0.42}
                className="pointer-events-none absolute"
                style={{ left: `${FIELD.left - 2}vw`, top: `${FIELD.top + FIELD.height - 9}svh` }}
              >
                <h3 className="text-display leading-[0.85] font-medium tracking-tight whitespace-nowrap mix-blend-multiply" style={{ color: p.deep }}>
                  {p.name}
                </h3>
              </div>

              <div
                data-depth={0.2}
                className="absolute max-w-[30ch] text-sm leading-snug"
                style={{ left: `${SATELLITES[1].left}vw`, top: "87svh" }}
              >
                <CentreLink
                  href={projectHref(p.slug)}
                  centred={active === k}
                  onCentre={() => centreSpread(k)}
                  className="block"
                >
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-fg-muted">{p.line}</span>
                </CentreLink>
              </div>
            </div>
          );
        })}
        <div className="w-[20vw] shrink-0" />
      </div>
    </section>
  );
}
