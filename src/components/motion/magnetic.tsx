"use client";

import { useRef, type ReactNode } from "react";

import { duration, ease } from "@/lib/motion/ease";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { MOTION_OK_FINE_POINTER } from "@/lib/motion/queries";

type MagneticProps = {
  children: ReactNode;
  /** 0–1: how far the element follows the pointer. */
  strength?: number;
  /** Inner content moves a bit further for a layered feel. */
  innerStrength?: number;
  className?: string;
};

/** Pulls its child toward the pointer while hovered, then springs back. */
export function Magnetic({ children, strength = 0.2, innerStrength = 0.12, className }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK_FINE_POINTER, () => {
        const el = ref.current!;
        const x = gsap.quickTo(el, "x", { duration: 0.9, ease: "power2" });
        const y = gsap.quickTo(el, "y", { duration: 0.9, ease: "power2" });
        const ix = gsap.quickTo(inner.current, "x", { duration: 0.9, ease: "power2" });
        const iy = gsap.quickTo(inner.current, "y", { duration: 0.9, ease: "power2" });

        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          x(dx * strength);
          y(dy * strength);
          ix(dx * innerStrength);
          iy(dy * innerStrength);
        };
        const onLeave = () => {
          gsap.to([el, inner.current], { x: 0, y: 0, duration: duration("slow"), ease: ease("out"), overwrite: true });
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });
    },
    { scope: ref, dependencies: [strength, innerStrength] },
  );

  return (
    <div ref={ref} className={`inline-block ${className ?? ""}`}>
      <div ref={inner}>{children}</div>
    </div>
  );
}
