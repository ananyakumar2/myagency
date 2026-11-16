"use client";

import { type RefObject, useEffect, useRef } from "react";

import { gsap } from "@/lib/motion/gsap";

type Layers = [CanvasImageSource, number][];

/**
 * A screen recording that costs nothing until it's needed: the poster loads first; the video
 * (never in the DOM, drawn by the stage canvas) is only fetched and played while `play` is true
 * and the stage is on screen, and pauses otherwise.
 */
export function useLoopSource(host: RefObject<HTMLElement | null>, src: string, poster: string, play: boolean) {
  const media = useRef<{ poster: HTMLImageElement | null; video: HTMLVideoElement | null }>({ poster: null, video: null });
  const want = useRef(play);

  useEffect(() => {
    const img = new Image();
    img.decoding = "async";
    img.src = poster;
    media.current.poster = img;
  }, [poster]);

  useEffect(() => {
    want.current = play;
    const el = host.current;
    if (!el) return;
    let inView = false;
    const sync = () => {
      let v = media.current.video;
      if (want.current && inView) {
        if (!v) {
          v = document.createElement("video");
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.preload = "auto";
          v.src = src;
          media.current.video = v;
        }
        v.play().catch(() => {});
      } else v?.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      sync();
    });
    io.observe(el);
    const m = media.current;
    return () => {
      io.disconnect();
      m.video?.pause();
    };
  }, [host, src, play]);

  useEffect(() => {
    const m = media.current;
    return () => {
      const v = m.video;
      if (v) {
        v.removeAttribute("src");
        v.load();
      }
    };
  }, []);

  return (): Layers => {
    const { poster: p, video: v } = media.current;
    if (v && v.readyState >= 2) return [[v, 1]];
    return p ? [[p, 1]] : [];
  };
}

/**
 * A captured frame sequence under the pointer's control. Frames are fetched only once `load`
 * turns true (the sheet is on top); a new frame fades in over the last one.
 */
export function useFrameSource(frames: string[], load: boolean, frame: () => number) {
  const imgs = useRef<HTMLImageElement[]>([]);
  const fade = useRef({ shown: -1, prev: -1, at: 0 });

  useEffect(() => {
    if (!load || imgs.current.length) return;
    imgs.current = frames.map((src) => {
      const i = new Image();
      i.decoding = "async";
      i.src = src;
      return i;
    });
  }, [load, frames]);

  const ready = (k: number) => {
    const i = imgs.current[k];
    return i && i.complete && i.naturalWidth > 0 ? i : null;
  };

  return (): Layers => {
    if (!imgs.current.length) return [];
    const want = gsap.utils.clamp(0, frames.length - 1, Math.round(frame()));
    let k = -1;
    for (let d = 0; d < frames.length && k < 0; d++) k = ready(want - d) ? want - d : ready(want + d) ? want + d : -1;
    if (k < 0) return [];
    const f = fade.current;
    const now = performance.now();
    if (k !== f.shown) {
      f.prev = f.shown;
      f.shown = k;
      f.at = now;
    }
    const t = Math.min(1, (now - f.at) / 140);
    const prev = t < 1 && f.prev >= 0 ? ready(f.prev) : null;
    return prev ? [[prev, 1], [ready(k)!, t]] : [[ready(k)!, 1]];
  };
}
