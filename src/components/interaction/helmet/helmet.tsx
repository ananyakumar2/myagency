"use client";

/* eslint-disable @next/next/no-img-element -- the poster is the fallback under the canvas */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const HelmetScene = dynamic(() => import("./helmet-scene"), { ssr: false });

const FALLBACK_KEY = "helmet:fallback";

/**
 * Decisions 21, 23 and 24, Ananya's Jack Johns method: a compressed GLB
 * helmet (meshopt geometry, KTX2 livery) that turns and leans toward the
 * cursor. Phones, reduced motion and devices that can't hold 50 fps get the
 * pre-rendered poster instead; a failed device is remembered for a day.
 */
export function Helmet({ className = "", poster = "/models/helmet-poster.webp", src = "/models/helmet.glb" }: { className?: string; poster?: string; src?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"poster" | "loading" | "live">("poster");
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let failed = false;
    try {
      failed = Date.now() - Number(localStorage.getItem(FALLBACK_KEY) ?? 0) < 864e5;
    } catch {
      /* storage blocked */
    }
    if (!fine || reduced || failed || !document.createElement("canvas").getContext("webgl2")) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) {
          setNear(true);
          setMode((m) => (m === "poster" ? "loading" : m));
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(box.current!);
    return () => io.disconnect();
  }, []);

  const fallBack = () => {
    try {
      localStorage.setItem(FALLBACK_KEY, String(Date.now()));
    } catch {
      /* storage blocked */
    }
    setMode("poster");
    setNear(false);
  };

  return (
    <div ref={box} className={`relative ${className}`} data-cursor-label="Turn" data-cursor-color="var(--color-lacquer-deep)">
      <img
        src={poster}
        alt="Racing helmet, placeholder model"
        className="absolute inset-0 size-full object-contain transition-opacity duration-700"
        style={{ opacity: mode === "live" ? 0 : 1 }}
        draggable={false}
      />
      {near && mode !== "poster" && (
        <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: mode === "live" ? 1 : 0 }}>
          <HelmetScene src={src} active={visible} onReady={() => setMode("live")} onSlow={fallBack} />
        </div>
      )}
    </div>
  );
}
