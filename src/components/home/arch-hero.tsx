"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { Burst } from "@/components/interaction/burst/burst";
import { scrambleTo } from "@/components/interaction/burst/scramble";
import { LetterPush } from "@/components/interaction/letter-push";
import { Magnetic } from "@/components/motion/magnetic";
import { PROJECTS, pad } from "@/components/showcase/projects";
import { onLoaderDone } from "@/lib/interaction/readiness";
import { ease } from "@/lib/motion/ease";
import { gsap, useGSAP } from "@/lib/motion/gsap";

const label = "font-mono text-xs tracking-wide uppercase";
/** Same shape as the loader mark, so the mark can land in it. */
const ARCH = { aspectRatio: "1 / 1.42", borderRadius: "50% 50% 0 0 / 35% 35% 0 0" } as const;
const HOLD = 2.4;

/**
 * The home hero. The loader's arch lands in this window (data-loader-target),
 * which keeps cutting between the four projects: each cut arrives fast and
 * settles slowly, like the idle bursts. Scrolling away opens the arch wide,
 * so the hero hands straight on to the Deck.
 */
export function ArchHero() {
  const section = useRef<HTMLElement>(null);
  const arch = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const copy = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = title.current?.querySelectorAll("[data-word]");
    const rest = copy.current?.children;
    if (!words?.length) return;
    gsap.set(words, { yPercent: 70, opacity: 0 });
    if (rest) gsap.set(rest, { y: 24, opacity: 0 });
    return onLoaderDone(() => {
      gsap.to(words, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.06, ease: ease("out"), delay: 0.05 });
      if (rest) gsap.to(rest, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: ease("out"), delay: 0.35 });
    });
  }, []);

  // The reel: the next project wipes up through the arch fast, then eases in.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frames = Array.from(arch.current!.querySelectorAll<HTMLElement>("[data-reel]"));
    let index = 0;
    let visible = true;
    let timer: gsap.core.Tween | null = null;
    let cut: gsap.core.Timeline | null = null;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(arch.current!);

    const step = () => {
      if (visible && !document.hidden) {
        const prev = frames[index]!;
        index = (index + 1) % frames.length;
        const next = frames[index]!;
        const img = next.querySelector("img");
        gsap.set(next, { zIndex: 2 });
        gsap.set(prev, { zIndex: 1 });
        cut = gsap
          .timeline()
          .fromTo(next, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "expo.out" })
          .fromTo(img, { scale: 1.35, yPercent: 8 }, { scale: 1.06, yPercent: 0, duration: 1.6, ease: "expo.out" }, 0)
          .to(prev.querySelector("img"), { yPercent: -10, duration: 0.75, ease: "expo.out" }, 0)
          .set(prev, { zIndex: 0 })
          .set(prev.querySelector("img"), { yPercent: 0 });
        const p = PROJECTS[index]!;
        if (caption.current) scrambleTo(caption.current, p.name, { duration: 0.5 });
        if (count.current) count.current.textContent = `${pad(index + 1)} / ${pad(PROJECTS.length)}`;
      }
      timer = gsap.delayedCall(HOLD, step) as unknown as gsap.core.Tween;
    };
    const stop = onLoaderDone(() => {
      timer = gsap.delayedCall(HOLD * 0.6, step) as unknown as gsap.core.Tween;
    });
    return () => {
      stop();
      timer?.kill();
      cut?.kill();
      io.disconnect();
    };
  }, []);

  // Scrolling out: the arch opens towards the full screen and the copy drifts off.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: section.current, start: "top top", end: "bottom top", scrub: true },
      });
      tl.to(arch.current, { scale: 1.9, yPercent: 18, duration: 1 }, 0)
        .to(arch.current, { borderRadius: "12% 12% 0 0 / 8% 8% 0 0", duration: 1 }, 0)
        .to([title.current, copy.current], { yPercent: -30, opacity: 0, duration: 0.7 }, 0);
    },
    { scope: section },
  );

  return (
    <section ref={section} id="top" aria-label="Introduction" className="relative h-svh min-h-[40rem] overflow-hidden px-gutter">
      <div className="mx-auto grid h-full max-w-page grid-cols-12 items-end gap-x-6 pt-28 pb-14">
        <div className="col-span-12 self-center lg:col-span-7">
          <Burst
            kind="scramble"
            phrases={["Placeholder studio · Dubai", "Websites as worlds", "Interaction-led design"]}
            className={`${label} mb-8 block text-fg-muted`}
          />
          <h1 ref={title} className="max-w-[13ch] text-display leading-[0.95] font-medium tracking-tight text-balance">
            <LetterPush text="We build worlds brands can step into." />
          </h1>
          <div ref={copy} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <p data-mirror="text" className="relative max-w-[34ch] text-lg leading-snug text-fg-muted">
              A small studio in the UAE making websites you can feel: built around motion, 3D and the people who use them.
            </p>
            <Magnetic>
              <a
                href="#work"
                data-press=""
                data-cursor-label="Scroll"
                className="inline-flex h-14 items-center gap-3 rounded-full bg-accent px-8 text-sm font-medium text-accent-fg"
              >
                See the work <span aria-hidden>↓</span>
              </a>
            </Magnetic>
          </div>
        </div>

        <div className="relative col-span-12 hidden justify-self-center self-center lg:col-span-5 lg:block">
          <div
            ref={arch}
            data-loader-target=""
            data-cursor-label="Four projects"
            className="relative w-[clamp(15rem,24vw,26rem)] origin-[50%_40%] overflow-hidden bg-paper-2"
            style={ARCH}
          >
            {PROJECTS.map((p, k) => (
              <div
                key={p.slug}
                data-reel=""
                className="absolute inset-0 overflow-hidden"
                style={{ zIndex: k === 0 ? 2 : 0, clipPath: k === 0 ? undefined : "inset(100% 0% 0% 0%)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.hero.src}
                  alt={k === 0 ? p.hero.alt : ""}
                  className="size-full scale-[1.06] object-cover"
                  loading={k === 0 ? "eager" : "lazy"}
                  fetchPriority={k === 0 ? "high" : "auto"}
                />
              </div>
            ))}
          </div>
          <p className={`${label} mt-4 flex justify-between text-fg-muted`}>
            <span ref={caption}>{PROJECTS[0]!.name}</span>
            <span ref={count}>
              01 / {pad(PROJECTS.length)}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
