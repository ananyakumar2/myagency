"use client";

import { useEffect, useRef } from "react";

import { loaderTuning } from "@/lib/interaction/config";
import { markLoaderDone, waitForReady } from "@/lib/interaction/readiness";
import { ease } from "@/lib/motion/ease";
import { gsap } from "@/lib/motion/gsap";

import { createBandGlitch } from "../burst/effects";

const FIELDS = ["var(--color-signature)", "var(--color-sea)", "var(--color-lacquer)", "var(--color-saffron)"];

/**
 * Decisions 16-18. A placeholder mark (an arch, echoing the route curtain,
 * until the studio name is picked) whose colour level rises with real
 * progress. It parks short of full until fonts, first-screen media and any
 * registered gates are in; on a slow network it loops a short beat (the
 * field changes colour and the wordmark glitches) instead of stalling; and
 * it hands off by growing the arch into a window onto the first screen.
 *
 * The overlay is server-rendered and shown by CSS from the first paint; the
 * inline script in <head> picks the full or short version.
 */
export function Loader() {
  const overlay = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const fields = useRef<HTMLDivElement>(null);
  const level = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const wordSource = useRef<HTMLSpanElement>(null);
  const wordBands = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const el = overlay.current;
    const mode = html.dataset.loader;
    if (!el || !mode || mode === "none") {
      el?.remove();
      markLoaderDone();
      return;
    }
    const p = loaderTuning.params;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const full = mode === "full";
    const start = performance.now();
    const state = { v: 0 };
    const lv = level.current!;
    let ready = false;
    let beat: gsap.core.Tween | null = null;
    let beatIndex = 0;
    const glitch = wordSource.current && wordBands.current ? createBandGlitch(wordSource.current, wordBands.current) : null;
    const render = () => gsap.set(lv, { scaleY: state.v });

    const park = p.parkMin + Math.random() * Math.max(0, p.parkMax - p.parkMin);
    const climb = gsap.to(state, { v: park, duration: full ? 1.8 : 0.7, ease: "power2.out", onUpdate: render, delay: full ? 0.5 : 0.1 });

    // Slow network: keep a beat going rather than freezing at the park point.
    const loopTimer = gsap.delayedCall(p.loopAfter, () => {
      if (ready || reduced) return;
      const step = () => {
        if (ready) return;
        beatIndex = (beatIndex + 1) % FIELDS.length;
        const layer = document.createElement("div");
        layer.className = "absolute inset-0 origin-bottom";
        layer.style.background = FIELDS[beatIndex];
        layer.style.transform = "scaleY(0)";
        fields.current?.insertBefore(layer, lv.nextSibling);
        gsap.to(layer, {
          scaleY: 1,
          duration: 0.9,
          ease: ease("in-out"),
          onComplete: () => {
            lv.style.background = FIELDS[beatIndex];
            layer.remove();
          },
        });
        glitch?.shatter();
        beat = gsap.delayedCall(p.beat, step) as unknown as gsap.core.Tween;
      };
      step();
    });

    let cancelled = false;
    void waitForReady({ perItem: p.perItem, cap: p.cap }).then(async () => {
      const elapsed = (performance.now() - start) / 1000;
      const minimum = full ? p.minFull : p.minShort;
      if (!reduced && elapsed < minimum) await new Promise((r) => setTimeout(r, (minimum - elapsed) * 1000));
      if (cancelled) return;
      ready = true;
      loopTimer.kill();
      beat?.kill();
      climb.kill();
      if (full) {
        try {
          localStorage.setItem("loader:full", String(Date.now()));
        } catch {
          /* storage blocked */
        }
      }
      if (reduced) {
        el.remove();
        markLoaderDone();
        return;
      }
      handoff();
    });

    const handoff = () => {
      const w = win.current!;
      const r = w.getBoundingClientRect();
      const target = document.querySelector<HTMLElement>("[data-loader-target]");
      const t = target?.getBoundingClientRect();
      if (t && t.width > 0 && t.bottom > 0 && t.top < window.innerHeight) {
        landOn(w, r, t);
        return;
      }
      // Scale that makes the arch cover the viewport, corners included.
      const cover = Math.max((window.innerWidth * 1.25) / r.width, (window.innerHeight * 1.4) / r.height);
      const tl = gsap.timeline({
        onComplete: () => {
          el.remove();
        },
      });
      tl.to(state, { v: 1, duration: 0.45, ease: ease("out"), onUpdate: render })
        .to(word.current, { yPercent: -60, opacity: 0, duration: 0.6, ease: ease("in-out") }, "<0.15")
        .to(fields.current, { yPercent: -101, duration: 0.8, ease: ease("in-out") }, ">-0.2")
        // The window turns into a hole onto the first screen as the fields lift.
        .set(w, { backgroundColor: "transparent" }, "<")
        .to(w, { scale: cover, duration: p.grow, ease: ease("in-out") }, "<0.1")
        .add(() => markLoaderDone(), `<${p.grow * 0.45}`);
    };

    // A page with a [data-loader-target] (the home hero's arch) receives the mark: the hole
    // travels onto that window, then the paper around it lifts away.
    const landOn = (w: HTMLElement, r: DOMRect, t: DOMRect) => {
      const tl = gsap.timeline({ onComplete: () => el.remove() });
      tl.to(state, { v: 1, duration: 0.45, ease: ease("out"), onUpdate: render })
        .to(word.current, { yPercent: -60, opacity: 0, duration: 0.6, ease: ease("in-out") }, "<0.15")
        .to(fields.current, { yPercent: -101, duration: 0.8, ease: ease("in-out") }, ">-0.2")
        .set(w, { backgroundColor: "transparent" }, "<")
        .to(
          w,
          {
            x: t.left + t.width / 2 - (r.left + r.width / 2),
            y: t.top + t.height / 2 - (r.top + r.height / 2),
            scale: t.width / r.width,
            duration: p.grow,
            ease: ease("in-out"),
          },
          "<0.1",
        )
        .add(() => markLoaderDone(), ">-0.15")
        .to(el, { opacity: 0, duration: 0.6, ease: ease("out") }, "<");
    };

    return () => {
      cancelled = true;
      climb.kill();
      loopTimer.kill();
      beat?.kill();
      glitch?.destroy();
    };
  }, []);

  return (
    <div ref={overlay} id="loader" aria-hidden className="loader fixed inset-0 z-(--z-loader) overflow-hidden">
      <div ref={win} className="loader-window absolute top-1/2 left-1/2 overflow-hidden">
        <div ref={fields} className="absolute inset-0 overflow-hidden rounded-[inherit] bg-paper-2">
          <div ref={level} className="absolute inset-0 origin-bottom bg-signature" style={{ transform: "scaleY(0)" }} />
        </div>
      </div>
      <div ref={word} className="loader-word absolute left-1/2 text-center">
        <span className="relative inline-block text-2xl font-medium tracking-tight text-ink">
          <span ref={wordSource} className="inline-block">
            Studio
          </span>
          <span ref={wordBands} className="pointer-events-none invisible absolute inset-0">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="absolute inset-0 block">
                Studio
              </span>
            ))}
          </span>
        </span>
        <span className="mt-2 block font-mono text-[0.6875rem] tracking-wide text-ink-2 uppercase">Placeholder mark</span>
      </div>
    </div>
  );
}
