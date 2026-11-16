"use client";

import { burstTuning } from "@/lib/interaction/config";
import { gsap } from "@/lib/motion/gsap";

/*
 * Decision 5: idle motion comes in bursts (Auge's loader glitch every
 * ~2.4 s ±25%, Grail's word swaps and card flips), not a constant drift.
 * One burst plays on screen at a time: the most visible source whose turn has
 * come fires, then everyone waits for the gap. Bursts hold off while the page
 * is scrolling so they never fight the bend.
 */

export type BurstSource = {
  el: HTMLElement;
  /** Plays the burst; returns its length in seconds. */
  fire: () => number;
  ratio: number;
  nextAt: number;
  enabled: boolean;
};

const sources = new Set<BurstSource>();
let io: IntersectionObserver | null = null;
let busyUntil = 0;
let lastScrollAt = -1;
let lastScrollY = 0;
let running = false;

const now = () => gsap.ticker.time;
const jitter = () => {
  const p = burstTuning.params;
  return p.everyMin + Math.random() * Math.max(0, p.everyMax - p.everyMin);
};

function tick() {
  const t = now();
  if (window.scrollY !== lastScrollY) {
    lastScrollY = window.scrollY;
    lastScrollAt = t;
  }
  if (document.hidden || t < busyUntil || t - lastScrollAt < 0.4) return;
  let best: BurstSource | null = null;
  for (const s of sources) {
    if (!s.enabled || s.ratio < 0.35 || t < s.nextAt) continue;
    if (!best || s.ratio > best.ratio) best = s;
  }
  if (!best) return;
  const length = best.fire();
  busyUntil = t + length + burstTuning.params.minGap;
  best.nextAt = t + length + jitter();
}

function ensureObserver() {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        for (const s of sources) {
          if (s.el !== e.target) continue;
          const was = s.ratio;
          s.ratio = e.isIntersecting ? e.intersectionRatio : 0;
          if (was < 0.35 && s.ratio >= 0.35) s.nextAt = Math.max(s.nextAt, now() + burstTuning.params.firstDelay);
        }
      }
    },
    { threshold: [0, 0.2, 0.35, 0.5, 0.75, 1] },
  );
  return io;
}

export function registerBurst(source: Omit<BurstSource, "ratio" | "nextAt">) {
  const s: BurstSource = { ...source, ratio: 0, nextAt: 0 };
  sources.add(s);
  ensureObserver().observe(s.el);
  if (!running) {
    running = true;
    gsap.ticker.add(tick);
  }
  return {
    source: s,
    /** Plays now regardless of the schedule (hover, lab buttons). */
    trigger() {
      const length = s.fire();
      busyUntil = Math.max(busyUntil, now() + length * 0.5);
      s.nextAt = now() + length + jitter();
    },
    dispose() {
      io?.unobserve(s.el);
      sources.delete(s);
      if (!sources.size && running) {
        running = false;
        gsap.ticker.remove(tick);
      }
    },
  };
}
