"use client";

/* eslint-disable @next/next/no-img-element -- lab prototype */

import { useEffect, useRef, useState } from "react";

import { useFinePointer } from "@/hooks/use-media-query";

type Props = {
  src: string;
  poster: string;
  /** Only plays while true (the sheet is on top) and the video is on screen. */
  play: boolean;
  className?: string;
};

/**
 * A screen recording that costs nothing until it's needed: poster first, no preload, plays only
 * while visible and wanted, pauses off screen. Touch devices keep the poster.
 */
export function LoopVideo({ src, poster, play, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const fine = useFinePointer();
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "10%" });
    io.observe(v);
    return () => io.disconnect();
  }, [fine]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (play && inView) {
      v.preload = "auto";
      v.play().catch(() => {});
    } else v.pause();
  }, [play, inView]);

  const cls = `absolute inset-0 size-full object-cover object-top ${className ?? ""}`;
  if (!fine) return <img src={poster} alt="" className={cls} draggable={false} />;
  return <video ref={ref} className={cls} src={src} poster={poster} muted loop playsInline preload="none" aria-hidden />;
}
