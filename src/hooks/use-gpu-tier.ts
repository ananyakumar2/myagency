"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "./use-media-query";

/**
 * "full"   – desktop-class device: live, interactive WebGL
 * "lite"   – capable but constrained (mobile, few cores): WebGL at low DPR, no pointer tracking
 * "static" – reduced motion, Save-Data, no WebGL, or very low-end: render the static fallback
 */
export type GpuTier = "full" | "lite" | "static";

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function detectTier(): GpuTier {
  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return "static";

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!gl) return "static";

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) return "static";

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse || cores <= 4 || memory <= 4) return "lite";
  return "full";
}

/** Returns null until measured on the client. */
export function useGpuTier(): GpuTier | null {
  const reduced = useReducedMotion();
  const [tier, setTier] = useState<GpuTier | null>(null);

  useEffect(() => {
    // Detection touches browser-only APIs, so it has to run after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTier(detectTier());
  }, []);

  if (reduced) return "static";
  return tier;
}
