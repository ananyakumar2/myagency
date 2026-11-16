"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { springTuning } from "@/lib/interaction/config";
import { pointer, startPointer } from "@/lib/interaction/pointer";
import { gsap } from "@/lib/motion/gsap";

type Body = {
  el: HTMLElement;
  k: number;
  turn: number;
  vTurn: number;
  lean: number;
  vLean: number;
  lift: number;
  vLift: number;
  px: number;
  vpx: number;
  py: number;
  vpy: number;
};

/**
 * Decision 22, after Agrumea: every `[data-spring]` object inside turns
 * toward the pointer (10°), leans (3°), lifts (3%) and is pulled a little,
 * each on its own spring so neighbours settle out of step. Objects only
 * respond inside a field a little wider than themselves.
 */
export function SpringField({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stop = startPointer();
    const bodies: Body[] = Array.from(el.querySelectorAll<HTMLElement>("[data-spring]")).map((b, i) => ({
      el: b,
      k: 1 + (((i * 0.618) % 1) * 2 - 1) * springTuning.params.spread,
      turn: 0,
      vTurn: 0,
      lean: 0,
      vLean: 0,
      lift: 0,
      vLift: 0,
      px: 0,
      vpx: 0,
      py: 0,
      vpy: 0,
    }));
    let inside = false;
    const io = new IntersectionObserver(([e]) => (inside = e.isIntersecting));
    io.observe(el);

    const tick = (_t: number, dtMs: number) => {
      if (!inside) return;
      const p = springTuning.params;
      const dt = Math.min(dtMs / 1000, 1 / 30);
      for (const b of bodies) {
        const r = b.el.getBoundingClientRect();
        const cx = r.left + r.width / 2 - b.px;
        const cy = r.top + r.height / 2 - b.py;
        const R = r.width * p.field;
        const dx = pointer.x - cx;
        const dy = pointer.y - cy;
        const dist = Math.hypot(dx, dy);
        const w = pointer.active && dist < R ? 0.5 + 0.5 * Math.cos((Math.PI * dist) / R) : 0;
        const nx = Math.max(-1, Math.min(1, dx / (r.width * 0.5)));
        const targets = [nx * p.turn * w, -nx * p.lean * w, p.lift * w, dx * p.pull * w, dy * p.pull * w];
        const stiff = p.stiffness * b.k;
        const step = (x: number, v: number, target: number) => {
          const a = stiff * (target - x) - p.damping * v;
          const nv = v + a * dt;
          return [x + nv * dt, nv] as const;
        };
        [b.turn, b.vTurn] = step(b.turn, b.vTurn, targets[0]);
        [b.lean, b.vLean] = step(b.lean, b.vLean, targets[1]);
        [b.lift, b.vLift] = step(b.lift, b.vLift, targets[2]);
        [b.px, b.vpx] = step(b.px, b.vpx, targets[3]);
        [b.py, b.vpy] = step(b.py, b.vpy, targets[4]);
        b.el.style.transform = `translate3d(${b.px.toFixed(2)}px, ${b.py.toFixed(2)}px, 0) perspective(900px) rotateY(${b.turn.toFixed(3)}deg) rotate(${b.lean.toFixed(3)}deg) scale(${(1 + b.lift).toFixed(4)})`;
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      stop();
      bodies.forEach((b) => (b.el.style.transform = ""));
    };
  }, []);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
