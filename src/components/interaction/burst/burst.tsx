"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type ElementType, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/interaction/capability";

import { createBandGlitch, flipLetters, spinMark, whipLetters } from "./effects";
import { registerBurst } from "./scheduler";
import { scrambleTo } from "./scramble";

export type BurstKind = "scramble" | "flip" | "whip" | "whipflip" | "glitch" | "spin";

type BurstProps = {
  kind: BurstKind;
  /** Text for the letter kinds. For "scramble" with phrases, the first phrase. */
  text?: string;
  /** "scramble" cycles through these, one per burst. */
  phrases?: string[];
  children?: ReactNode;
  as?: ElementType;
  className?: string;
  /** Take part in the idle schedule (default true). */
  idle?: boolean;
  /** Also fire on pointer enter. */
  hover?: boolean;
  onFire?: (kind: BurstKind) => void;
};

export type BurstHandle = { fire: () => void };

/**
 * One idle burst source (decision 5). Letter kinds split their text into
 * letters inside unbroken words; "glitch" stacks four band copies of its
 * children; "spin" turns its children.
 */
export const Burst = forwardRef<BurstHandle, BurstProps>(function Burst(
  { kind, text = "", phrases, children, as: Tag = "span", className, idle = true, hover = false, onFire },
  handle,
) {
  const ref = useRef<HTMLElement>(null);
  const source = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLSpanElement>(null);
  const textEl = useRef<HTMLSpanElement>(null);
  const fireRef = useRef<() => void>(() => {});
  const phraseIndex = useRef(0);
  const onFireRef = useRef(onFire);
  const phrasesRef = useRef(phrases);
  const phraseKey = phrases?.join("|") ?? "";

  useImperativeHandle(handle, () => ({ fire: () => fireRef.current() }), []);

  useEffect(() => {
    onFireRef.current = onFire;
    phrasesRef.current = phrases;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const letters = () => Array.from(el.querySelectorAll<HTMLElement>("[data-letter]"));
    const glitch = kind === "glitch" && source.current && overlay.current ? createBandGlitch(source.current, overlay.current) : null;
    let flipDir = 1;

    const fire = (): number => {
      onFireRef.current?.(kind);
      switch (kind) {
        case "scramble": {
          const list = phrasesRef.current?.length ? phrasesRef.current : [text];
          phraseIndex.current = (phraseIndex.current + 1) % list.length;
          const next = list[phraseIndex.current];
          if (textEl.current) scrambleTo(textEl.current, next);
          return 1.1;
        }
        case "flip":
          return flipLetters(letters());
        case "whip":
          flipDir *= -1;
          return whipLetters(el, letters(), flipDir);
        case "whipflip": {
          flipDir *= -1;
          const a = whipLetters(el, letters(), flipDir);
          const b = flipLetters(letters());
          return Math.max(a, b);
        }
        case "glitch":
          return glitch?.shatter() ?? 0;
        case "spin":
          return source.current ? spinMark(source.current) : 0;
      }
    };

    const reg = registerBurst({ el, fire, enabled: idle });
    fireRef.current = reg.trigger;
    const onEnter = () => reg.trigger();
    if (hover) el.addEventListener("pointerenter", onEnter);
    return () => {
      if (hover) el.removeEventListener("pointerenter", onEnter);
      reg.dispose();
      glitch?.destroy();
    };
  }, [kind, text, phraseKey, idle, hover]);

  if (kind === "glitch") {
    return (
      <Tag ref={ref} className={`relative inline-block ${className ?? ""}`}>
        <span ref={source} className="inline-block">
          {children ?? text}
        </span>
        <span ref={overlay} aria-hidden className="pointer-events-none invisible absolute inset-0">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="absolute inset-0 block">
              {children ?? text}
            </span>
          ))}
        </span>
      </Tag>
    );
  }

  if (kind === "spin") {
    return (
      <Tag ref={ref} className={`inline-block ${className ?? ""}`}>
        <span ref={source} className="inline-block">
          {children ?? text}
        </span>
      </Tag>
    );
  }

  if (kind === "scramble") {
    const first = phrases?.[0] ?? text;
    return (
      <Tag ref={ref} className={className}>
        <span ref={textEl}>{first}</span>
      </Tag>
    );
  }

  const words = text.split(/(\s+)/);
  return (
    <Tag ref={ref} className={`inline-block ${className ?? ""}`} aria-label={text}>
      {words.map((word, wi) =>
        /^\s+$/.test(word) ? (
          <span key={wi} aria-hidden>
            {" "}
          </span>
        ) : (
          <span key={wi} aria-hidden className="inline-block whitespace-nowrap" style={{ perspective: "40em" }}>
            {[...word].map((ch, ci) => (
              <span key={ci} data-letter="" className="inline-block will-change-transform">
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </Tag>
  );
});
