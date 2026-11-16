"use client";

/* eslint-disable @next/next/no-img-element -- the <img> is what the mirror draws, and the fallback */

import { useEffect, useRef } from "react";

import { gsap } from "@/lib/motion/gsap";

import { bindMirror } from "./bus";

type Getter = () => number;

export type MirrorImageProps = {
  src: string;
  alt: string;
  /** Signed bend as a fraction of the image's size, read every frame (BowImage's scale). */
  bend?: Getter;
  axis?: "x" | "y";
  /** Optional frame sequence; `frame` (0-1) picks the frame. `src` is the poster. */
  frames?: string[];
  frame?: Getter;
  /** Texture zoom, 1 = cover. */
  zoom?: Getter;
  /** Corner radius in CSS px; the bowed edge stays rounded. */
  radius?: number;
  /** Set when the image sits inside CSS 3D transforms (a ring, a deck). */
  projected?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * BowImage's props on the shared mirror canvas: no WebGL context of its own.
 * It must sit inside a <MirrorRoot>. While the mirror runs, the engine draws
 * it (bent, zoomed, on its current frame) and the <img> is hidden but stays
 * for layout, alt text and links; otherwise it is a plain image.
 */
export function MirrorImage({ src, alt, bend, axis = "x", frames, frame, zoom, radius = 0, projected, className = "", sizes, priority }: MirrorImageProps) {
  const img = useRef<HTMLImageElement>(null);
  const getters = useRef({ bend, frame, zoom });
  useEffect(() => {
    getters.current = { bend, frame, zoom };
  });

  useEffect(() => {
    const el = img.current;
    if (!el) return;
    const images: (HTMLImageElement | null)[] = (frames ?? []).map(() => null);
    let disposed = false;
    frames?.forEach((url, i) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => {
        if (!disposed) images[i] = im;
      };
      im.src = url;
    });
    const pick = () => {
      const f = getters.current.frame;
      if (!frames?.length || !f) return -1;
      let i = Math.round(gsap.utils.clamp(0, 1, f()) * (frames.length - 1));
      while (i > 0 && !images[i]) i--;
      return images[i] ? i : -1;
    };
    const unbind = bindMirror(el, {
      axis,
      bend: () => getters.current.bend?.() ?? 0,
      zoom: () => getters.current.zoom?.() ?? 1,
      source: frames?.length ? () => images[pick()] ?? null : undefined,
    });
    // Without the mirror the <img> itself steps through the frames.
    let shown = -1;
    const tick = () => {
      if (!frames?.length || document.documentElement.classList.contains("mirror-on")) return;
      const i = pick();
      if (i >= 0 && i !== shown) {
        shown = i;
        el.src = frames[i];
      }
    };
    if (frames?.length) gsap.ticker.add(tick);
    return () => {
      disposed = true;
      unbind();
      gsap.ticker.remove(tick);
    };
  }, [frames, axis]);

  return (
    <div className={/\b(absolute|fixed)\b/.test(className) ? className : `relative ${className}`}>
      <img
        ref={img}
        src={src}
        alt={alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={false}
        data-mirror="image"
        data-mirror-3d={projected ? "" : undefined}
        className="absolute inset-0 size-full object-cover select-none"
        style={{ borderRadius: radius }}
      />
    </div>
  );
}
