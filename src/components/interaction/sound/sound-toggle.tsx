"use client";

import { useEffect, useSyncExternalStore } from "react";

import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound } from "./sound";

/** Visible toggle, off by default (decision 19). Phones never play sound (decision 23). */
export function SoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribeSound, isSoundEnabled, () => false);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setSoundEnabled(!on)}
      data-sound="off"
      className={`group hidden items-center gap-2 px-3 py-2 pointer-fine:inline-flex ${className ?? ""}`}
    >
      <span aria-hidden className="flex h-3 items-end gap-[2px]">
        {[0.45, 1, 0.7, 0.85].map((h, i) => (
          <span
            key={i}
            className="w-[2px] origin-bottom rounded-full bg-current transition-transform duration-300"
            style={{
              height: "100%",
              transform: `scaleY(${on ? h : 0.2})`,
              animation: on ? `sound-bar 0.9s ${i * 0.12}s ease-in-out infinite alternate` : "none",
            }}
          />
        ))}
      </span>
      <span className="font-mono text-xs tracking-wide uppercase">Sound {on ? "on" : "off"}</span>
    </button>
  );
}

const INTERACTIVE = "a, button, [role='button'], [data-sound-hover]";

/**
 * Delegated hover and click sounds for every link, button and press target,
 * so components don't each wire audio. data-sound="off" opts an element out.
 */
export function SoundDelegate() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let current: Element | null = null;
    const onOver = (e: PointerEvent) => {
      const target = (e.target as Element).closest(INTERACTIVE);
      if (target === current) return;
      current = target;
      if (target && (target as HTMLElement).dataset.sound !== "off") playSound("hover");
    };
    const onClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest<HTMLElement>(`${INTERACTIVE}, [data-press]`);
      if (target && target.dataset.sound !== "off") playSound("click");
    };
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);
  return null;
}
