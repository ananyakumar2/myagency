"use client";

import { useEffect } from "react";

import { colourTuning, pressTuning } from "@/lib/interaction/config";

/** Mirrors the CSS-driven tuning sets (press states, signature accent) onto custom properties. */
export function TuningTokens() {
  useEffect(() => {
    const html = document.documentElement;
    const applyPress = () => {
      const p = pressTuning.params;
      html.style.setProperty("--press-lift", `${p.lift}px`);
      html.style.setProperty("--press-hover", String(p.hoverScale));
      html.style.setProperty("--press-down", String(p.pressScale));
      html.style.setProperty("--press-duration", `${p.duration}s`);
    };
    const applyColour = () => {
      const s = colourTuning.params.signature;
      if (s === colourTuning.defaults.signature) {
        html.style.removeProperty("--color-signature");
        html.style.removeProperty("--color-signature-deep");
        return;
      }
      html.style.setProperty("--color-signature", `var(--color-${s})`);
      html.style.setProperty("--color-signature-deep", `var(--color-${s}-deep)`);
    };
    applyPress();
    applyColour();
    const a = pressTuning.subscribe(applyPress);
    const b = colourTuning.subscribe(applyColour);
    return () => {
      a();
      b();
    };
  }, []);
  return null;
}
