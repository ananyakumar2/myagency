"use client";

import { useState } from "react";

import { MirrorRoot } from "@/components/interaction/mirror/mirror-root";

import { STEPS, WORD_SETS } from "./config";
import { CubeSection } from "./cube-section";

export type CubeLabOptions = { mode: "words" | "universes"; snap: "off" | "steps"; words: string };

export function CubeLab({ mode, snap, words }: CubeLabOptions) {
  const [step, setStep] = useState(0);
  const wordSet = WORD_SETS.find((w) => w.key === words) ?? WORD_SETS[0]!;
  return (
    <MirrorRoot ignoreRetreats>
      <CubeSection mode={mode} snap={snap} words={wordSet.key} onStep={setStep} />
      <footer className="px-gutter py-24 text-sm text-fg-muted">End of the cube lab.</footer>
      <Panel mode={mode} snap={snap} words={wordSet.key} step={step} />
    </MirrorRoot>
  );
}

function Panel({ mode, snap, words, step }: { mode: string; snap: string; words: string; step: number }) {
  const href = (patch: Record<string, string>) => `?${new URLSearchParams({ mode, snap, words, ...patch })}`;
  const opt = (key: string, value: string, label: string, current: string) => (
    <a
      key={value}
      href={href({ [key]: value })}
      aria-current={current === value ? "true" : undefined}
      className={`rounded-full px-2.5 py-1 ${current === value ? "bg-fg text-bg" : "text-fg-muted hover:text-fg"}`}
    >
      {label}
    </a>
  );
  return (
    <aside className="fixed right-4 bottom-4 z-(--z-panel) flex flex-col gap-1.5 rounded-xl bg-bg/90 p-3 font-mono text-[11px] text-fg shadow-sm ring-1 ring-border backdrop-blur">
      <p className="px-1 tracking-wide uppercase">
        Cubes · {step + 1}/{STEPS.length} {STEPS[step]?.label}
      </p>
      <div className="flex gap-1">
        {opt("mode", "words", "Words", mode)}
        {opt("mode", "universes", "Universes", mode)}
      </div>
      <div className="flex gap-1">
        {opt("snap", "off", "Snap off", snap)}
        {opt("snap", "steps", "Snap to steps", snap)}
      </div>
      <div className="flex gap-1">{WORD_SETS.map((w) => opt("words", w.key, w.label, words))}</div>
    </aside>
  );
}
