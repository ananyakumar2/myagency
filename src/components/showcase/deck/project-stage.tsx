"use client";

import { useEffect, useRef, useState } from "react";

import { useFinePointer } from "@/hooks/use-media-query";
import { gsap } from "@/lib/motion/gsap";

import type { ShowcaseProject } from "../projects";
import { DeviceStage } from "./device-stage";
import { DECK_MEDIA, type Interaction } from "./media";
import { useFrameSource, useLoopSource } from "./screen-sources";

/**
 * - `loops`: both screens play recordings of the site's best sections.
 * - `play`: the laptop runs the site's own interaction under the pointer; the phone holds still.
 * - `play-then-loops`: the interaction comes first; once it's been tried, the recordings take over.
 */
export type StageMode = "loops" | "play" | "play-then-loops";

type Props = { project: ShowcaseProject; mode: StageMode; active: boolean };

const HANDOVER_MS = 700;

export function ProjectStage({ project, mode, active }: Props) {
  const media = DECK_MEDIA[project.slug];
  const play = media.play;
  const fine = useFinePointer();
  const interactive = mode !== "loops" && fine;
  const [engaged, setEngaged] = useState(false);
  const engagedAt = useRef(0);
  const host = useRef<HTMLDivElement>(null);
  const state = useRef(initialInput());
  useStageInput(host, state, play, interactive && active && !engaged, () => {
    if (mode !== "play-then-loops") return;
    engagedAt.current = performance.now();
    setEngaged(true);
  });

  const looping = mode === "loops" || engaged || !fine;
  // Touch devices keep the posters.
  const moving = active && fine && looping;
  const desktop = useLoopSource(host, media.desktop.src, media.desktop.poster, moving);
  const phone = useLoopSource(host, media.phone.src, media.phone.poster, moving && mode !== "play");
  const frames = useFrameSource(play.frames, interactive && active, () => frameFor(play, state.current));

  const laptopLayers = () => {
    if (!interactive) return desktop();
    if (!engaged) return frames();
    const t = Math.min(1, (performance.now() - engagedAt.current) / HANDOVER_MS);
    return [...frames(), ...desktop().map(([src, a]): [CanvasImageSource, number] => [src, a * t])];
  };

  /** A long press revs; it mustn't also open the project. */
  const onClickCapture = (e: React.MouseEvent) => {
    const s = state.current;
    if (play.kind === "hold" && s.heldAt && performance.now() - s.heldAt > 220) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={host}
      className="relative size-full select-none"
      onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}
    >
      <DeviceStage project={project} laptop={laptopLayers} phone={phone} live={active && fine} />
      {interactive && (
        <p
          data-mirror="block"
          data-mirror-3d=""
          className="pointer-events-none absolute bottom-[4%] left-[4%] rounded-full px-3 py-1.5 transition-opacity duration-500"
          style={{ backgroundColor: project.field, opacity: active && !engaged ? 1 : 0 }}
        >
          <span
            data-mirror="text"
            data-mirror-3d=""
            className="relative block font-mono text-[11px] tracking-wide uppercase"
            style={{ color: project.deep }}
          >
            {play.hint}
          </span>
        </p>
      )}
    </div>
  );
}

const initialInput = () => ({ x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, inside: false, held: false, heldAt: 0, v: 0, travel: 0, peak: 0, fired: false });
type InputState = ReturnType<typeof initialInput>;

function frameFor(play: Interaction, s: InputState) {
  if (play.kind === "grid") {
    const c = Math.round(s.sx * (play.cols - 1));
    const r = Math.round(s.sy * (play.rows - 1));
    return r * play.cols + c;
  }
  return s.v * (play.frames.length - 1);
}

/** Pointer state over the whole stage, eased every tick into the interaction's value. */
function useStageInput(
  ref: React.RefObject<HTMLDivElement | null>,
  state: React.RefObject<InputState>,
  play: Interaction,
  enabled: boolean,
  onEngaged: () => void,
) {
  const engagedRef = useRef(onEngaged);
  useEffect(() => {
    engagedRef.current = onEngaged;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const s = state.current;
    const pos = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      const x = gsap.utils.clamp(0, 1, (e.clientX - b.left) / b.width);
      const y = gsap.utils.clamp(0, 1, (e.clientY - b.top) / b.height);
      s.travel += Math.hypot(x - s.x, y - s.y);
      s.x = x;
      s.y = y;
    };
    const move = (e: PointerEvent) => {
      s.inside = true;
      pos(e);
    };
    const leave = () => {
      s.inside = false;
      s.held = false;
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      s.held = true;
      s.heldAt = performance.now();
    };
    const up = () => (s.held = false);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const tx = s.inside ? s.x : 0.5;
      const ty = s.inside ? s.y : 0.5;
      s.sx += (tx - s.sx) * Math.min(1, dt * 7);
      s.sy += (ty - s.sy) * Math.min(1, dt * 7);
      if (play.kind === "hold") {
        s.v = gsap.utils.clamp(0, 1, s.v + (s.held ? play.rise : -play.fall) * dt);
        s.peak = Math.max(s.peak, s.v);
      } else if (play.kind === "sweep") {
        s.v = play.axis === "x" ? s.sx : s.sy;
        s.peak = Math.max(s.peak, s.v);
      }
      const done = play.kind === "grid" ? s.travel > 1.6 : s.peak > 0.92 && (play.kind !== "hold" || s.v < 0.2);
      if (done && !s.fired) {
        s.fired = true;
        engagedRef.current();
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [enabled, play, ref, state]);
}
