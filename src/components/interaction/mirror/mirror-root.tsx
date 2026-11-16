"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { canRunMirror, recordRetreat } from "@/lib/interaction/capability";
import { watchdogTuning } from "@/lib/interaction/config";
import { startPointer } from "@/lib/interaction/pointer";
import { gsap } from "@/lib/motion/gsap";

import { setActiveMirror } from "./bus";
import { MirrorEngine } from "./engine";

export type MirrorStatus = "off" | "starting" | "on" | "retreated";

type MirrorRootProps = {
  children: ReactNode;
  className?: string;
  /** Labs pass true so a session that fell back can still be tuned. */
  ignoreRetreats?: boolean;
  onStatus?: (status: MirrorStatus, reason?: string) => void;
};

/**
 * Wraps a page whose content should bend, lens and ripple. Mark elements
 * inside with data-mirror (see engine.ts). Coarse pointers, reduced motion
 * and machines without WebGL2 keep the plain DOM.
 */
export function MirrorRoot({ children, className, ignoreRetreats, onStatus }: MirrorRootProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<MirrorStatus>("off");
  const statusCb = useRef(onStatus);

  useEffect(() => {
    statusCb.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv || !canRunMirror({ ignoreRetreats })) return;

    const html = document.documentElement;
    const stopPointer = startPointer();
    let engine: MirrorEngine | null = null;
    let disposed = false;
    let fadeIn: gsap.core.Tween | null = null;
    const report = (s: MirrorStatus, reason?: string) => {
      setStatus(s);
      statusCb.current?.(s, reason);
    };

    const teardown = () => {
      html.classList.remove("mirror-on");
      setActiveMirror(null);
      engine?.destroy();
      engine = null;
    };

    try {
      engine = new MirrorEngine(el, cv, {
        onReady: () => {
          if (disposed) return;
          // The canvas sits under the content: bring it up while the DOM still covers it,
          // then hide the DOM. Hiding first shows the bare window for the length of the fade.
          fadeIn = gsap.to(cv, { opacity: 1, duration: 0.2, onComplete: () => void (disposed || html.classList.add("mirror-on")) });
          report("on");
        },
        onRetreat: (reason) => {
          fadeIn?.kill();
          recordRetreat();
          html.classList.remove("mirror-on");
          setActiveMirror(null);
          gsap.to(cv, { opacity: 0, duration: watchdogTuning.params.fade, onComplete: teardown });
          report("retreated", reason);
        },
      });
    } catch (err) {
      console.warn("Mirror unavailable, staying on the DOM:", err);
      stopPointer();
      return;
    }
    report("starting");
    setActiveMirror(engine);
    // Arriving through a shared-element morph: start once it has landed. A mirror
    // drawing during the view transition would show the image twice.
    const morph = Number(html.dataset.morph ?? 0);
    delete html.dataset.morph;
    const wait = morph && Date.now() - morph < 4000 ? cssMs("--duration-slow", 1200) + 120 : 0;
    const startTimer = window.setTimeout(() => void engine?.start(), wait);

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      fadeIn?.kill();
      teardown();
      stopPointer();
    };
  }, [ignoreRetreats]);

  return (
    <>
      <canvas
        ref={canvas}
        aria-hidden
        data-mirror-status={status}
        className="pointer-events-none fixed inset-0 z-(--z-mirror) size-full opacity-0"
      />
      <div ref={root} data-mirror-root="" className={`relative z-(--z-content) ${className ?? ""}`}>
        {children}
      </div>
    </>
  );
}

function cssMs(name: string, fallback: number) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return v.endsWith("ms") ? n : n * 1000;
}
