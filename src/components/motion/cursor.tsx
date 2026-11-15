"use client";

import { useRef, useState } from "react";

import { useFinePointer, useReducedMotion } from "@/hooks/use-media-query";
import { duration, ease } from "@/lib/motion/ease";
import { gsap, useGSAP } from "@/lib/motion/gsap";

/**
 * Hover-aware custom cursor. Elements opt in with:
 *   data-cursor="hover"            – ring grows (links/buttons get this automatically)
 *   data-cursor="view"             – large filled disc
 *   data-cursor-label="Drag"       – disc with a text label
 * Only mounts for fine pointers without reduced motion; the native cursor
 * stays for everyone else.
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  if (!fine || reduced) return null;
  return <CursorInner />;
}

type Mode = "default" | "hover" | "view";

function CursorInner() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");

  useGSAP(() => {
    const root = document.documentElement;
    const dotX = gsap.quickTo(dot.current, "x", { duration: 0.1, ease: "power3" });
    const dotY = gsap.quickTo(dot.current, "y", { duration: 0.1, ease: "power3" });
    const ringX = gsap.quickTo(ring.current, "x", { duration: 0.7, ease: "power3" });
    const ringY = gsap.quickTo(ring.current, "y", { duration: 0.7, ease: "power3" });
    let visible = false;
    let mode: Mode = "default";

    const scaleFor = (m: Mode) => (m === "view" ? 2.4 : m === "hover" ? 1.4 : 1);

    const setMode = (next: Mode, text = "") => {
      setLabel(text);
      if (next === mode) return;
      mode = next;
      gsap.to(ring.current, {
        scale: scaleFor(next),
        // The layer uses mix-blend-difference, so white renders as the inverse of the page.
        backgroundColor: next === "view" ? "rgba(255,255,255,1)" : "rgba(255,255,255,0)",
        duration: duration("base"),
        ease: ease("out"),
      });
      gsap.to(dot.current, { scale: next === "default" ? 1 : 0, duration: duration("fast") });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!visible) {
        visible = true;
        gsap.set([dot.current, ring.current], { x: e.clientX, y: e.clientY });
        gsap.to([dot.current, ring.current], { autoAlpha: 1, duration: duration("fast") });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    const onOver = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor], [data-cursor-label], a, button");
      if (!target) return setMode("default");
      const text = target.dataset.cursorLabel ?? "";
      setMode(text || target.dataset.cursor === "view" ? "view" : "hover", text);
    };

    const onLeave = () => {
      visible = false;
      gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: duration("fast") });
    };

    const onDown = () => gsap.to(ring.current, { scale: scaleFor(mode) * 0.9, duration: 0.2 });
    const onUp = () => gsap.to(ring.current, { scale: scaleFor(mode), duration: duration("base"), ease: ease("out") });

    root.classList.add("has-cursor");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-(--z-cursor) mix-blend-difference">
      <div
        ref={ring}
        className="invisible fixed top-0 left-0 -mt-5 -ml-5 flex size-10 items-center justify-center rounded-full border border-white opacity-0"
      >
        <span className="text-[0.3rem] font-medium tracking-wide text-black uppercase">{label}</span>
      </div>
      <div ref={dot} className="invisible fixed top-0 left-0 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-white opacity-0" />
    </div>
  );
}
