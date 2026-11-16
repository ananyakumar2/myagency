"use client";

import { useEffect, useRef } from "react";

import { useFinePointer, useReducedMotion } from "@/hooks/use-media-query";
import { followerTuning, trailTuning } from "@/lib/interaction/config";
import { pointer, startPointer } from "@/lib/interaction/pointer";
import { ease } from "@/lib/motion/ease";
import { gsap } from "@/lib/motion/gsap";

import { scrambleTo } from "../burst/scramble";

/**
 * Decisions 7, 11 and 12. The native cursor stays; a small difference-blend
 * diamond follows it (Auge), leaning into its direction of travel.
 *
 *   links and buttons          the diamond shrinks away so the native pointer reads
 *   data-cursor-label="View"   it straightens and grows into a pill with a scrambled label
 *   data-cursor-color="#…"     the pill takes that colour (a project's deep tone)
 *   data-cursor-section="trail"  faint marks drop behind fast moves in that section
 *
 * Label and colour changes under a still pointer (a card switching from
 * "Centre" to "Open" after a click) are picked up straight away.
 */
export function Follower() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  if (!fine || reduced) return null;
  return <FollowerInner />;
}

const INTERACTIVE = "a, button, [role='button'], input, textarea, select, label, [data-cursor='hover']";

function FollowerInner() {
  const wrap = useRef<HTMLDivElement>(null);
  const shape = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const trail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current!;
    const s = shape.current!;
    const l = label.current!;
    const layer = trail.current!;
    const stopPointer = startPointer();
    const f = followerTuning.params;

    let mode: "diamond" | "hidden" | "pill" = "diamond";
    let shown = false;
    let currentLabel = "";
    let hideTimer: gsap.core.Tween | null = null;
    let section: HTMLElement | null = null;
    let tilt = 0;
    let nextDrop = 0;
    let fx = -100;
    let fy = -100;
    let tx = -100;
    let ty = -100;
    const morph = { straight: 0 };

    const setDiamond = () => {
      mode = "diamond";
      w.style.mixBlendMode = "difference";
      gsap.to(l, { opacity: 0, duration: 0.12, overwrite: true });
      gsap.to(s, {
        width: f.size,
        height: f.size,
        borderRadius: 1,
        backgroundColor: "#ffffff",
        left: -f.size / 2,
        top: -f.size / 2,
        scale: 1,
        duration: 0.35,
        ease: ease("out"),
        overwrite: true,
      });
      gsap.to(morph, { straight: 0, duration: 0.3, ease: ease("out"), overwrite: true });
    };

    const setHidden = () => {
      mode = "hidden";
      gsap.to(s, { scale: 0, duration: 0.2, ease: ease("out"), overwrite: "auto" });
      gsap.to(l, { opacity: 0, duration: 0.12, overwrite: true });
    };

    const setPill = (text: string, color: string | undefined) => {
      const wasPill = mode === "pill";
      mode = "pill";
      // Snap if the pill would appear far from the pointer (Agrumea).
      if (!wasPill && Math.hypot(fx - pointer.x, fy - pointer.y) > f.snapDistance) {
        fx = pointer.x;
        fy = pointer.y;
      }
      w.style.mixBlendMode = "normal";
      l.textContent = text;
      const textW = l.offsetWidth;
      const pillW = textW + 28;
      const pillH = 28;
      gsap.to(morph, { straight: 1, duration: 0.22, ease: ease("out"), overwrite: true });
      gsap.to(s, { scale: 1, duration: 0.22, ease: ease("out"), overwrite: "auto" });
      gsap.to(s, {
        width: pillW,
        height: pillH,
        borderRadius: pillH / 2,
        left: f.pillOffsetX - 4,
        top: f.pillOffsetY - pillH / 2 - 4,
        backgroundColor: color ?? "var(--color-ink)",
        duration: 0.43,
        delay: wasPill ? 0 : f.pillDelay,
        ease: ease("out"),
      });
      gsap.set(l, { x: f.pillOffsetX - 4 + 14, y: f.pillOffsetY - 4 - l.offsetHeight / 2 });
      gsap.to(l, { opacity: 1, duration: 0.2, delay: wasPill ? 0 : f.pillDelay + 0.08, overwrite: true });
      if (text !== currentLabel || !wasPill) scrambleTo(l, text, { duration: f.scramble });
      currentLabel = text;
    };

    const resolve = (target: Element | null) => {
      const labelled = target?.closest<HTMLElement>("[data-cursor-label]");
      section = target?.closest<HTMLElement>("[data-cursor-section]") ?? null;
      if (labelled) {
        hideTimer?.kill();
        hideTimer = null;
        setPill(labelled.dataset.cursorLabel ?? "", labelled.dataset.cursorColor);
        return;
      }
      const next = target?.closest(INTERACTIVE) ? "hidden" : "diamond";
      if (mode === "pill") {
        // A short grace period so moving between neighbouring cards doesn't flicker.
        if (hideTimer) return;
        hideTimer = gsap.delayedCall(f.hideDelay, () => {
          hideTimer = null;
          currentLabel = "";
          if (next === "hidden") setHidden();
          else setDiamond();
        });
        return;
      }
      if (next !== mode) {
        if (next === "hidden") setHidden();
        else setDiamond();
      }
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      resolve(e.target as Element);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        fx = tx;
        fy = ty;
        gsap.to(w, { autoAlpha: 1, duration: 0.25 });
      }
    };

    // Re-resolve from whatever is under the pointer when a cursor attribute changes there.
    const mo = new MutationObserver(() => {
      if (!shown) return;
      resolve(document.elementFromPoint(tx, ty));
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-cursor-label", "data-cursor-color"] });

    const onLeave = () => {
      shown = false;
      gsap.to(w, { autoAlpha: 0, duration: 0.25 });
    };

    const onDown = () => gsap.to(s, { scale: mode === "hidden" ? 0 : 0.8, duration: 0.15, ease: ease("out") });
    const onUp = () => gsap.to(s, { scale: mode === "hidden" ? 0 : 1, duration: 0.4, ease: ease("out") });

    const dropMark = () => {
      const t = trailTuning.params;
      const m = document.createElement("div");
      const color = section ? getComputedStyle(section).color : "currentColor";
      m.style.cssText = `position:absolute;left:0;top:0;width:${t.size}px;height:${t.size}px;border:1px solid ${color};transform:translate(${pointer.x - t.size / 2}px,${pointer.y - t.size / 2}px) rotate(45deg);opacity:${t.opacity}`;
      layer.appendChild(m);
      gsap.to(m, {
        y: `+=${t.drop}`,
        opacity: 0,
        scale: 0.5,
        duration: t.life,
        ease: "power1.in",
        onComplete: () => m.remove(),
      });
    };

    const tick = (time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 100) / 1000;
      // expoOut-ish chase: matches a 0.35 s quickTo without re-creating tweens.
      const k = 1 - Math.exp((-dt * 4.6) / Math.max(f.lag, 0.01));
      fx += (tx - fx) * k;
      fy += (ty - fy) * k;
      const targetTilt = Math.max(-f.tiltMax, Math.min(f.tiltMax, pointer.vx * f.tiltPerSpeed));
      tilt += (targetTilt - tilt) * (1 - Math.exp((-dt * 4) / Math.max(f.tiltDecay, 0.01)));
      w.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
      s.style.rotate = `${(1 - morph.straight) * (45 + tilt) + morph.straight * tilt * 0.3}deg`;

      const t = trailTuning.params;
      if (section?.dataset.cursorSection?.includes("trail") && pointer.speed > t.minSpeed && time >= nextDrop) {
        dropMark();
        nextDrop = time + t.intervalMin + Math.random() * Math.max(0, t.intervalMax - t.intervalMin);
      }
    };

    gsap.set(s, { width: f.size, height: f.size, left: -f.size / 2, top: -f.size / 2, borderRadius: 1 });
    gsap.ticker.add(tick);
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      gsap.ticker.remove(tick);
      mo.disconnect();
      hideTimer?.kill();
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      stopPointer();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-(--z-cursor) overflow-hidden">
      <div ref={trail} className="absolute inset-0" />
      <div ref={wrap} className="invisible absolute top-0 left-0 opacity-0 mix-blend-difference">
        <div ref={shape} className="absolute top-0 left-0 bg-white" />
        <span
          ref={label}
          className="absolute top-0 left-0 font-mono text-[0.6875rem] leading-none tracking-wide whitespace-nowrap text-paper uppercase opacity-0"
        />
      </div>
    </div>
  );
}
