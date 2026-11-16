"use client";

import { type CSSProperties, type ReactNode, useRef } from "react";

import { useFinePointer } from "@/hooks/use-media-query";
import { gsap, useGSAP } from "@/lib/motion/gsap";

import type { ShowcaseProject } from "../projects";

/** Film grain for the surface, so the slab reads as stone rather than a flat fill. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

type Props = {
  project: ShowcaseProject;
  laptop: ReactNode;
  phone: ReactNode;
  /** The scene leans a few degrees towards the cursor. */
  tilt?: boolean;
  /** Overlaid on the scene (hints, controls). */
  children?: ReactNode;
  className?: string;
};

/**
 * A laptop and a phone lying on a stone surface under hard window light, after Auge's project
 * pages — but built live, so the screens can be videos or interactive.
 */
export function DeviceStage({ project, laptop, phone, tilt = true, children, className }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();

  useGSAP(
    () => {
      if (!tilt || !fine) return;
      const el = root.current!;
      const scene = el.querySelector<HTMLElement>("[data-scene]")!;
      const light = el.querySelector<HTMLElement>("[data-light]")!;
      const to = { x: 0, y: 0 };
      const now = { x: 0, y: 0 };
      const move = (e: PointerEvent) => {
        const b = el.getBoundingClientRect();
        to.x = (e.clientX - b.left) / b.width - 0.5;
        to.y = (e.clientY - b.top) / b.height - 0.5;
      };
      const leave = () => {
        to.x = 0;
        to.y = 0;
      };
      const tick = (_t: number, dt: number) => {
        const k = Math.min(1, dt / 220);
        now.x += (to.x - now.x) * k;
        now.y += (to.y - now.y) * k;
        scene.style.transform = `rotateX(${10 - now.y * 5}deg) rotateY(${now.x * 6}deg)`;
        light.style.translate = `${-now.x * 4}% 0`;
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: root, dependencies: [tilt, fine] },
  );

  const surface: CSSProperties = {
    backgroundColor: project.deep,
    backgroundImage: `${GRAIN}, radial-gradient(120% 90% at 18% 0%, color-mix(in oklab, ${project.field} 16%, transparent), transparent 60%)`,
    backgroundBlendMode: "overlay, normal",
  };

  return (
    <div ref={root} className={`relative size-full [container-type:size] ${className ?? ""}`}>
      <div className="absolute inset-0 m-auto aspect-[16/11] w-[min(100%,145.4cqh)] [perspective:1600px]">
        <div
          data-scene
          className="relative size-full overflow-hidden rounded-[10px] [transform-style:preserve-3d]"
          style={{ ...surface, transform: "rotateX(10deg)" }}
        >
          {/* Laptop: screen with its bezel, the aluminium lip of the base below it. */}
          <div className="absolute top-[8%] left-[6%] w-[68%]">
            <div className="absolute -inset-x-[6%] top-[55%] -bottom-[16%] rounded-[50%] bg-black/55 blur-[18px]" />
            <div className="relative rounded-[1.4cqw] bg-[#0b0b0d] p-[1.15cqw] pb-[1.6cqw] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),18px_26px_40px_-18px_rgba(0,0,0,0.7)]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[0.35cqw] bg-black">{laptop}</div>
            </div>
            <div className="relative -mx-[5.5%] h-[1.4cqw] rounded-b-[1.2cqw] bg-[linear-gradient(#d9dadc,#9a9b9f_55%,#5b5c60)] shadow-[0_8px_14px_-6px_rgba(0,0,0,0.7)]">
              <div className="absolute top-0 left-1/2 h-[45%] w-[14%] -translate-x-1/2 rounded-b-[0.6cqw] bg-[#7c7d81]" />
            </div>
          </div>

          {/* Phone, propped in front and to the right. */}
          <div className="absolute right-[7%] bottom-[7%] w-[19%] rotate-[4deg]">
            <div className="absolute -inset-x-[10%] top-[30%] -bottom-[6%] rounded-[40%] bg-black/55 blur-[16px]" />
            <div className="relative rounded-[3cqw] bg-[#0b0b0d] p-[0.7cqw] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),20px_24px_34px_-16px_rgba(0,0,0,0.75)]">
              <div className="relative aspect-[390/844] overflow-hidden rounded-[2.4cqw] bg-black">
                {phone}
                <div className="absolute top-[1.6%] left-1/2 h-[3.2%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
              </div>
            </div>
          </div>

          {/* Window light: a bright, barred patch thrown across everything, and the shade beyond it. */}
          <div
            data-light
            className="pointer-events-none absolute -inset-[12%] mix-blend-soft-light"
            style={{
              backgroundImage:
                "repeating-linear-gradient(112deg, rgba(255,255,255,0) 0 7%, rgba(255,255,255,0.9) 7% 21%, rgba(255,255,255,0) 21% 23%)",
              maskImage: "radial-gradient(70% 60% at 34% 34%, #000 30%, transparent 75%)",
              filter: "blur(3px)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_90%_at_30%_25%,transparent_45%,rgba(0,0,0,0.45))]" />
        </div>
      </div>
      {children}
    </div>
  );
}
