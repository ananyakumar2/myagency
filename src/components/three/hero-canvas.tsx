"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useGpuTier } from "@/hooks/use-gpu-tier";
import { duration, ease } from "@/lib/motion/ease";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

import type { SceneInputs } from "./scene";

// three.js + R3F (~250 kB gz) only download when the canvas is actually needed.
const Scene = dynamic(() => import("./scene"), { ssr: false });

/**
 * Lazy 3D canvas with a static fallback. The fallback is always rendered
 * first (it's what SSR, reduced motion, Save-Data and low-end devices see);
 * the WebGL scene mounts on top only on capable devices once near the
 * viewport, and stops rendering while off-screen.
 */
export function HeroCanvas({ className }: { className?: string }) {
  const tier = useGpuTier();
  const container = useRef<HTMLDivElement>(null);
  const canvasLayer = useRef<HTMLDivElement>(null);
  const inputs = useRef<SceneInputs>({ scroll: 0, pointer: { x: 0, y: 0 } });
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const live = tier === "full" || tier === "lite";

  useEffect(() => {
    const el = container.current;
    if (!el || !live) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) whenIdle(() => setNear(true));
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  useEffect(() => {
    if (tier !== "full") return;
    const onMove = (e: PointerEvent) => {
      inputs.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      inputs.current.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [tier]);

  useGSAP(
    () => {
      if (!live) return;
      const st = ScrollTrigger.create({
        trigger: container.current,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => (inputs.current.scroll = self.progress),
      });
      return () => st.kill();
    },
    { dependencies: [live] },
  );

  useGSAP(
    () => {
      if (!ready) return;
      gsap.fromTo(
        canvasLayer.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: duration("reveal"), ease: ease("out") },
      );
    },
    { dependencies: [ready] },
  );

  return (
    <div ref={container} className={`relative ${className ?? ""}`} aria-hidden>
      <StaticFallback hidden={ready} />
      {live && near && (
        <div ref={canvasLayer} className="absolute inset-0 opacity-0">
          <Scene tier={tier} inputs={inputs} active={visible} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}

/** Waits for page load + an idle slot so WebGL setup doesn't compete with first paint/hydration. */
function whenIdle(cb: () => void) {
  const idle = () =>
    "requestIdleCallback" in window ? requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 200);
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

function StaticFallback({ hidden }: { hidden: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
      style={{ opacity: hidden ? 0 : 1 }}
    >
      <div
        className="aspect-square w-[min(58%,28rem)] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, var(--color-surface) 0%, var(--color-surface-strong) 38%, var(--color-fg-muted) 100%)",
          boxShadow: "0 40px 80px -30px rgb(0 0 0 / 0.35)",
        }}
      />
    </div>
  );
}
