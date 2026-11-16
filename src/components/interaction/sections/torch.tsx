"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { torchTuning } from "@/lib/interaction/config";
import { pointer, startPointer } from "@/lib/interaction/pointer";
import { gsap } from "@/lib/motion/gsap";

/**
 * Decision 10: the deep sections' one response, a warm light that follows
 * the pointer with a little lag, falling off as exp(−k·r²). Phones and
 * reduced motion get the light parked high in the section.
 */
export function Torch({ children, className = "" }: { children: ReactNode; className?: string }) {
  const section = useRef<HTMLElement>(null);
  const light = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = section.current!;
    const lt = light.current!;
    const live = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pos = { x: 0.5, y: 0.25 };
    let inside = false;

    const paint = () => {
      const p = torchTuning.params;
      const r = el.getBoundingClientRect();
      const radius = p.radius * r.width;
      const stops = Array.from({ length: 7 }, (_, i) => {
        const t = i / 6;
        const a = p.intensity * Math.exp(-p.falloff * t * t * 2.2) * (1 - t);
        return `rgb(245 213 171 / ${a.toFixed(3)}) ${(t * radius).toFixed(0)}px`;
      });
      lt.style.background = `radial-gradient(circle at ${(pos.x * 100).toFixed(2)}% ${(pos.y * 100).toFixed(2)}%, ${stops.join(", ")}, transparent ${radius.toFixed(0)}px)`;
    };
    paint();
    if (!live) {
      const unsub = torchTuning.subscribe(paint);
      return unsub;
    }
    const stop = startPointer();
    const io = new IntersectionObserver(([e]) => (inside = e.isIntersecting));
    io.observe(el);
    const tick = (_t: number, dt: number) => {
      if (!inside) return;
      const r = el.getBoundingClientRect();
      const tx = pointer.active ? (pointer.x - r.left) / r.width : 0.5;
      const ty = pointer.active ? (pointer.y - r.top) / r.height : 0.25;
      const k = 1 - Math.exp((-torchTuning.params.follow * dt) / 1000);
      pos.x += (tx - pos.x) * k;
      pos.y += (ty - pos.y) * k;
      paint();
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      stop();
    };
  }, []);

  return (
    <section ref={section} data-theme="deep" data-cursor-section="trail" className={`relative overflow-hidden bg-bg text-fg ${className}`}>
      <div ref={light} aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen" />
      <div className="relative">{children}</div>
    </section>
  );
}
