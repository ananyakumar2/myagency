"use client";

/* eslint-disable @next/next/no-img-element -- lab prototype */

import { useEffect, useRef } from "react";

import { gsap } from "@/lib/motion/gsap";

type Props = {
  frames: string[];
  /** Frame index to show, read every tick; fractional values round. */
  frame: () => number;
  /** Start fetching the frames (the sheet is on top). */
  load: boolean;
  className?: string;
};

/** Plays a captured frame sequence under the pointer's control, cross-fading between frames. */
export function FrameScrub({ frames, frame, load, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const imgs = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(frame);
  useEffect(() => {
    frameRef.current = frame;
  });

  useEffect(() => {
    if (!load || imgs.current.length) return;
    imgs.current = frames.map((src) => {
      const i = new Image();
      i.decoding = "async";
      i.src = src;
      return i;
    });
  }, [load, frames]);

  useEffect(() => {
    const el = host.current!;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 size-full";
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    let shown = -1;
    let prev = -1;
    let fadeAt = 0;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    const size = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(el.clientWidth * dpr);
      canvas.height = Math.round(el.clientHeight * dpr);
      shown = -1;
    };
    const ro = new ResizeObserver(size);
    ro.observe(el);

    const ready = (k: number) => {
      const i = imgs.current[k];
      return i && i.complete && i.naturalWidth > 0 ? i : null;
    };
    const nearestReady = (k: number) => {
      for (let d = 0; d < frames.length; d++) {
        if (ready(k - d)) return k - d;
        if (ready(k + d)) return k + d;
      }
      return -1;
    };
    const draw = (img: HTMLImageElement, alpha: number) => {
      const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (canvas.width - w) / 2, 0, w, img.naturalHeight * s);
    };

    const tick = () => {
      if (!visible || !imgs.current.length) return;
      const want = gsap.utils.clamp(0, frames.length - 1, Math.round(frameRef.current()));
      const k = nearestReady(want);
      if (k < 0) return;
      if (k !== shown) {
        prev = shown;
        shown = k;
        fadeAt = performance.now();
      }
      const t = Math.min(1, (performance.now() - fadeAt) / 140);
      if (t >= 1 && prev === -2) return;
      if (prev >= 0 && ready(prev)) draw(ready(prev)!, 1);
      draw(ready(shown)!, prev >= 0 ? t : 1);
      if (t >= 1) prev = -2;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      ro.disconnect();
      canvas.remove();
    };
  }, [frames]);

  return (
    <div ref={host} className={`absolute inset-0 ${className ?? ""}`}>
      <img src={frames[0]} alt="" className="absolute inset-0 size-full object-cover object-top" draggable={false} />
    </div>
  );
}
