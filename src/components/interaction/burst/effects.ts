"use client";

import { burstTuning } from "@/lib/interaction/config";
import { expoOut } from "@/lib/motion/ease";
import { gsap } from "@/lib/motion/gsap";

/* Deterministic per-shatter noise, as Auge's hashUnit / signedUnit. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const signed = (n: number) => hash(n) * 2 - 1;

/**
 * Auge's logo band glitch. Four stacked copies are clipped into horizontal
 * bands (edges at quarters ±9%); each shatter re-cuts the bands and throws
 * each one sideways by 8–26% of the width (28% stay put). Seven shatters land
 * ~90 ms apart, then the offsets decay ×0.78 per frame: fast, then slow.
 */
export function createBandGlitch(source: HTMLElement, overlay: HTMLElement) {
  const bands = Array.from(overlay.children) as HTMLElement[];
  let seed = Math.floor(Math.random() * 1000);
  let remaining = 0;
  let amp = 0;
  let next = 0;
  let throwing = false;
  let width = 0;
  const offsets = bands.map(() => 0);

  const cut = (n: number) => {
    const p = burstTuning.params;
    let top = 0;
    for (let i = 0; i < bands.length; i++) {
      const last = i === bands.length - 1;
      const edge = last ? 1 : (i + 1) / bands.length + 0.09 * signed(97 * n + 13 * i + 1);
      const bottom = last ? 0 : Math.max(0, (1 - edge) * 100 - 0.6);
      bands[i].style.clipPath = `inset(${(top * 100).toFixed(2)}% 0% ${bottom.toFixed(2)}% 0%)`;
      const size = p.offsetMin + (p.offsetMax - p.offsetMin) * hash(97 * n + 13 * i + 4);
      offsets[i] = hash(97 * n + 13 * i + 2) < p.stillChance ? 0 : (hash(97 * n + 13 * i + 3) < 0.5 ? -1 : 1) * size;
      top = edge;
    }
  };
  const apply = (k: number) => {
    for (let i = 0; i < bands.length; i++) bands[i].style.translate = `${(offsets[i] * width * k).toFixed(2)}px 0`;
  };
  const settle = () => {
    gsap.ticker.remove(loop);
    apply(0);
    overlay.style.visibility = "hidden";
    source.style.opacity = "";
  };
  const loop = () => {
    const p = burstTuning.params;
    const t = gsap.ticker.time;
    if (throwing && t >= next) {
      if (remaining > 0) {
        remaining--;
        cut(++seed);
        next = t + p.shatterInterval * (1 + p.shatterJitter * signed(31 * seed));
      } else {
        throwing = false;
      }
    }
    if (!throwing) {
      amp -= amp * (1 - Math.pow(p.decay, gsap.ticker.deltaRatio(60)));
      if (amp < 0.01) return settle();
    }
    apply(amp);
  };

  return {
    shatter() {
      const p = burstTuning.params;
      width = source.getBoundingClientRect().width;
      remaining = p.shatters;
      amp = 1;
      throwing = true;
      cut(++seed);
      next = gsap.ticker.time + p.shatterInterval;
      apply(1);
      source.style.opacity = "0";
      overlay.style.visibility = "visible";
      gsap.ticker.remove(loop);
      gsap.ticker.add(loop);
      // Shatters, then the decay to < 1% at 60 fps.
      return p.shatters * p.shatterInterval + Math.log(0.01) / Math.log(p.decay) / 60;
    },
    destroy: settle,
  };
}

/**
 * Grail's accept flip, on letters: each letter turns a full 360° about its
 * horizontal axis on an expo-out curve (fast, then a long settle), the first
 * letters leading the last by `flipLead` of the run so the turn ripples
 * across the word. A small lift at mid-turn sells the weight.
 */
export function flipLetters(letters: HTMLElement[]) {
  const p = burstTuning.params;
  const n = Math.max(letters.length - 1, 1);
  const state = { t: 0 };
  gsap.killTweensOf(state);
  gsap.to(state, {
    t: 1,
    duration: p.flipDuration,
    ease: "none",
    onUpdate() {
      for (let i = 0; i < letters.length; i++) {
        const lead = (i / n) * p.flipLead;
        const local = Math.min(1, Math.max(0, (state.t - lead) / (1 - p.flipLead)));
        const e = expoOut(local);
        const a = e * 360;
        const lift = Math.sin(e * Math.PI) * -0.12;
        letters[i].style.transform = local > 0 && local < 1 ? `translateY(${lift}em) rotateX(${a}deg)` : "";
      }
    },
    onComplete() {
      letters.forEach((l) => (l.style.transform = ""));
    },
  });
  return p.flipDuration;
}

/**
 * The Auge wordmark entry, as an idle burst: the line is jerked sideways in a
 * tenth of a second, then glides home on expo-out while shearing in
 * proportion to its speed, so it reads as fast, slanted, then upright.
 * Letters trail each other slightly, like cloth.
 */
export function whipLetters(container: HTMLElement, letters: HTMLElement[], direction = 1) {
  const p = burstTuning.params;
  const out = 0.1;
  const total = out + p.whipDuration;
  const state = { t: 0 };
  const n = Math.max(letters.length - 1, 1);
  let prev = 0;
  gsap.to(state, {
    t: total,
    duration: total,
    ease: "none",
    onUpdate() {
      const dist = p.whipDistance * direction;
      let x0 = 0;
      for (let i = 0; i < letters.length; i++) {
        const t = Math.max(0, state.t - (i / n) * 0.06);
        const x = t < out ? dist * Math.sin(((t / out) * Math.PI) / 2) : dist * (1 - expoOut((t - out) / p.whipDuration));
        if (i === 0) x0 = x;
        letters[i].style.translate = `${x.toFixed(2)}px 0`;
      }
      const v = (x0 - prev) / Math.max(gsap.ticker.deltaRatio(60) / 60, 1 / 240);
      prev = x0;
      // Tops trail the motion (positive skewX moves the top left when travelling right).
      const shear = Math.max(-1, Math.min(1, v / 2400)) * p.whipSkew;
      container.style.transform = `skewX(${shear.toFixed(2)}deg)`;
    },
    onComplete() {
      letters.forEach((l) => (l.style.translate = ""));
      container.style.transform = "";
    },
  });
  return total;
}

/** Fine Acts' wheel and huyml's cube: whole turns, fast then a long slow-down. */
export function spinMark(el: HTMLElement) {
  const p = burstTuning.params;
  gsap.fromTo(
    el,
    { rotation: 0 },
    { rotation: 360 * p.spinTurns, duration: p.spinDuration, ease: "power4.out", clearProps: "rotation" },
  );
  return p.spinDuration;
}
