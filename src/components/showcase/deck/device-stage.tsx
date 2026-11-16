"use client";

import { useEffect, useRef } from "react";

import { useFinePointer } from "@/hooks/use-media-query";
import { gsap } from "@/lib/motion/gsap";

import type { ShowcaseProject } from "../projects";

/** What a screen shows this frame: images drawn in order, each at its own opacity. */
export type ScreenLayers = () => [CanvasImageSource, number][];

type Props = {
  project: ShowcaseProject;
  laptop: ScreenLayers;
  phone: ScreenLayers;
  /** Redraw every frame (the sheet is on top); otherwise only when something loads or resizes. */
  live: boolean;
  /** The scene leans a few degrees towards the cursor. */
  tilt?: boolean;
  className?: string;
};

const DPR_CAP = 1.5;

/**
 * A laptop and a phone lying on a stone surface under hard window light, after Auge's project
 * pages. It's one canvas so the shared mirror can draw it as an image inside the Deck's CSS 3D,
 * and the same canvas is what shows when the mirror is off.
 */
export function DeviceStage({ project, laptop, phone, live, tilt = true, className }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const inputs = useRef({ laptop, phone, live });
  useEffect(() => {
    inputs.current = { laptop, phone, live };
  });

  useEffect(() => {
    const el = root.current!;
    const scene = el.querySelector<HTMLElement>("[data-scene]")!;
    const canvas = document.createElement("canvas");
    canvas.dataset.mirror = "image";
    canvas.setAttribute("data-mirror-3d", "");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "absolute inset-0 size-full rounded-[10px]";
    scene.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    const grain = makeGrain();
    let light: HTMLCanvasElement | null = null;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let dirty = true;
    let visible = false;

    const size = () => {
      dpr = Math.min(devicePixelRatio, DPR_CAP);
      w = scene.clientWidth;
      h = scene.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      light = makeLight(w, h, dpr);
      dirty = true;
    };
    const ro = new ResizeObserver(size);
    ro.observe(scene);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      dirty = true;
    });
    io.observe(el);

    const to = { x: 0, y: 0 };
    const at = { x: 0, y: 0 };
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      to.x = (e.clientX - b.left) / b.width - 0.5;
      to.y = (e.clientY - b.top) / b.height - 0.5;
    };
    const leave = () => {
      to.x = 0;
      to.y = 0;
    };
    const leans = tilt && fine;
    if (leans) {
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
    }

    const tick = (_t: number, dt: number) => {
      if (leans) {
        const k = Math.min(1, dt / 220);
        at.x += (to.x - at.x) * k;
        at.y += (to.y - at.y) * k;
        scene.style.transform = `rotateX(${10 - at.y * 5}deg) rotateY(${at.x * 6}deg)`;
      }
      if (!visible || !w || !(dirty || inputs.current.live)) return;
      dirty = false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, w, h, project, grain, light, at.x, inputs.current.laptop(), inputs.current.phone());
    };
    gsap.ticker.add(tick);
    // Posters arriving after the first draw.
    const redraw = () => (dirty = true);
    const poll = window.setInterval(redraw, 400);

    return () => {
      gsap.ticker.remove(tick);
      window.clearInterval(poll);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      canvas.remove();
    };
  }, [project, tilt, fine]);

  return (
    <div ref={root} className={`relative size-full [container-type:size] ${className ?? ""}`}>
      <div className="absolute inset-0 m-auto aspect-[16/11] w-[min(100%,145.4cqh)] [perspective:1600px]">
        <div data-scene className="relative size-full" style={{ transform: "rotateX(10deg)" }} />
      </div>
    </div>
  );
}

/* ---------- drawing ---------- */

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ShowcaseProject,
  grain: HTMLCanvasElement,
  light: HTMLCanvasElement | null,
  lean: number,
  laptop: [CanvasImageSource, number][],
  phone: [CanvasImageSource, number][],
) {
  const u = w / 100;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);

  // Stone: the project's deep tone, a cool spill of its field colour, grain.
  ctx.fillStyle = p.deep;
  ctx.fillRect(0, 0, w, h);
  const spill = ctx.createRadialGradient(w * 0.18, 0, 0, w * 0.18, 0, w * 0.75);
  spill.addColorStop(0, withAlpha(p.field, 0.16));
  spill.addColorStop(1, withAlpha(p.field, 0));
  ctx.fillStyle = spill;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ctx.createPattern(grain, "repeat")!;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Laptop.
  const lx = w * 0.06;
  const ly = h * 0.08;
  const lw = w * 0.68;
  const pad = 1.15 * u;
  const sw = lw - pad * 2;
  const sh = sw / 1.6;
  const bh = sh + pad + 1.6 * u;
  contactShadow(ctx, lx + lw / 2, ly + bh + 1.4 * u, lw * 0.62, 2.6 * u, 0.55);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 18;
  ctx.shadowOffsetY = 26;
  roundRect(ctx, lx, ly, lw, bh, 1.4 * u);
  ctx.fillStyle = "#0b0b0d";
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, lx + 0.5, ly + 0.5, lw - 1, bh - 1, 1.4 * u);
  ctx.stroke();
  screen(ctx, laptop, lx + pad, ly + pad, sw, sh, 0.35 * u);
  // Aluminium lip of the base.
  const bx = lx - lw * 0.055;
  const bw = lw * 1.11;
  const by = ly + bh;
  const lip = 1.4 * u;
  const metal = ctx.createLinearGradient(0, by, 0, by + lip);
  metal.addColorStop(0, "#d9dadc");
  metal.addColorStop(0.55, "#9a9b9f");
  metal.addColorStop(1, "#5b5c60");
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, bx, by, bw, lip, [0, 0, 1.2 * u, 1.2 * u]);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, bx + bw * 0.43, by, bw * 0.14, lip * 0.45, [0, 0, 0.6 * u, 0.6 * u]);
  ctx.fillStyle = "#7c7d81";
  ctx.fill();

  // Phone, propped in front and to the right.
  const pw = w * 0.19;
  const pp = 0.7 * u;
  const psw = pw - pp * 2;
  const psh = psw * (844 / 390);
  const ph = psh + pp * 2;
  const px = w - w * 0.07 - pw;
  const py = h - h * 0.07 - ph;
  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.rotate((4 * Math.PI) / 180);
  ctx.translate(-pw / 2, -ph / 2);
  contactShadow(ctx, pw / 2, ph * 0.98, pw * 0.62, 2.2 * u, 0.5);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetX = 20;
  ctx.shadowOffsetY = 24;
  roundRect(ctx, 0, 0, pw, ph, 3 * u);
  ctx.fillStyle = "#0b0b0d";
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  roundRect(ctx, 0.5, 0.5, pw - 1, ph - 1, 3 * u);
  ctx.stroke();
  screen(ctx, phone, pp, pp, psw, psh, 2.4 * u);
  roundRect(ctx, pp + psw * 0.35, pp + psh * 0.016, psw * 0.3, psh * 0.032, psh * 0.016);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // Window light thrown across everything, then the shade beyond it.
  if (light) {
    ctx.globalCompositeOperation = "soft-light";
    ctx.drawImage(light, -lean * 0.04 * w - w * 0.12, -h * 0.12, w * 1.24, h * 1.24);
    ctx.globalCompositeOperation = "source-over";
  }
  const shade = ctx.createRadialGradient(w * 0.3, h * 0.25, w * 0.2, w * 0.3, h * 0.25, w * 0.95);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

/** Layers drawn cover-fit to the top of the screen, as `object-cover object-top` would. */
function screen(ctx: CanvasRenderingContext2D, layers: [CanvasImageSource, number][], x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.clip();
  for (const [src, alpha] of layers) {
    const [nw, nh] = naturalSize(src);
    if (!nw || alpha <= 0) continue;
    const s = Math.max(w / nw, h / nh);
    ctx.globalAlpha = alpha;
    ctx.drawImage(src, x + (w - nw * s) / 2, y, nw * s, nh * s);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function naturalSize(src: CanvasImageSource): [number, number] {
  if (src instanceof HTMLVideoElement) return src.readyState >= 2 ? [src.videoWidth, src.videoHeight] : [0, 0];
  if (src instanceof HTMLImageElement) return src.complete ? [src.naturalWidth, src.naturalHeight] : [0, 0];
  const s = src as { width: number; height: number };
  return [s.width, s.height];
}

function contactShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function makeGrain() {
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d")!;
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 120;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 140;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Barred window light: bright slats at 112°, faded out from a patch towards the top left. */
function makeLight(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  const cw = Math.max(1, Math.round(w * 1.24 * dpr * 0.5));
  const ch = Math.max(1, Math.round(h * 1.24 * dpr * 0.5));
  c.width = cw;
  c.height = ch;
  const g = c.getContext("2d")!;
  const slats = document.createElement("canvas");
  slats.width = cw;
  slats.height = ch;
  const s = slats.getContext("2d")!;
  s.translate(cw / 2, ch / 2);
  s.rotate(((112 - 90) * Math.PI) / 180);
  const span = Math.hypot(cw, ch);
  const period = span * 0.23;
  s.fillStyle = "rgba(255,255,255,0.9)";
  for (let x = -span; x < span; x += period) s.fillRect(x + period * 0.07 * 4, -span, period * 0.6, span * 2);
  g.filter = `blur(${Math.max(1, 3 * dpr * 0.5)}px)`;
  g.drawImage(slats, 0, 0);
  g.filter = "none";
  g.globalCompositeOperation = "destination-in";
  const m = g.createRadialGradient(cw * 0.34, ch * 0.34, 0, cw * 0.34, ch * 0.34, Math.max(cw, ch) * 0.7);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(0.4, "rgba(0,0,0,1)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m;
  g.fillRect(0, 0, cw, ch);
  return c;
}
