"use client";

import { useEffect, useRef } from "react";

import { getActiveMirror } from "@/components/interaction/mirror/bus";

/** Live numbers from the running mirror, for tuning the bend and lens by eye and by value. */
export function MirrorReadout() {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const m = getActiveMirror();
      if (ref.current)
        ref.current.textContent = m
          ? `mirror   on\nbend     ${m.state.curve.toFixed(1)} px\nscroll   ${Math.round(m.state.scrollVelocity)} px/s\nlens     ${m.state.lensPx.toFixed(1)} px\nfps      ${m.state.fps}\nitems    ${m.state.items}`
          : "mirror   off (phone, reduced motion, no WebGL2 or retreated)";
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, []);
  return <pre ref={ref} className="fixed bottom-4 left-4 z-(--z-panel) rounded-md bg-ink/85 px-3 py-2 font-mono text-[0.6875rem] leading-relaxed text-paper" />;
}
