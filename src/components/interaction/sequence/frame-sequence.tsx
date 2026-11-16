"use client";

/* eslint-disable @next/next/no-img-element -- poster under the WebGL canvas */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { sequenceTuning } from "@/lib/interaction/config";
import { damp } from "@/lib/motion/ease";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

import { playSound } from "../sound/sound";

/*
 * Decision 24, Ananya's Mission Motorsport method: a pre-rendered frame
 * sequence scrubbed by scroll, drawn through a WebGL pass that blends the two
 * nearest frames and adds heat haze rising from the exhaust tips recorded
 * per frame in the manifest. Holding the pointer down revs it: the haze
 * thickens and the tips glow. Frames load progressively (both ends, then
 * strides of 16, 8, 4, 2, 1) over six fetchers, and only a small window
 * around the current frame is decoded at a time.
 */

type Tip = [number, number, number, number];
type Manifest = {
  frames: number;
  sets: Record<string, { w: number; h: number; path: string }>;
  tips: Record<string, Tip[][]>;
  format: string;
};

const FETCHERS = 6;
const WINDOW = 3;
const CACHE = 12;

const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos; gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec4 uTips[2];
uniform float uTime;
uniform float uLevel;
uniform float uStrength;
uniform float uPlume;
uniform float uGrain;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  // object-fit: cover, image uv with y down
  vec2 s = vec2(uRes.x / uRes.y, uImg.x / uImg.y);
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  if (s.x > s.y) uv.y = (uv.y - 0.5) * s.y / s.x + 0.5;
  else uv.x = (uv.x - 0.5) * s.x / s.y + 0.5;
  float aspect = uImg.x / uImg.y;

  vec2 off = vec2(0.0);
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    vec4 t = uTips[i];
    if (t.w <= 0.0) continue;
    vec2 d = uv - t.xy;
    d.x *= aspect;
    float up = -d.y;
    float along = clamp(up / uPlume, 0.0, 1.0);
    float width = t.z * (1.1 + along * 3.2);
    float m = smoothstep(width, 0.0, abs(d.x)) * smoothstep(-t.z * 0.8, t.z * 0.4, up) * (1.0 - along) * t.w;
    vec2 q = vec2(d.x / max(t.z, 1e-3) * 1.6, up / max(t.z, 1e-3) * 1.1 + uTime * (3.0 + 4.0 * uLevel));
    off += (vec2(noise(q), noise(q + 17.3)) - 0.5) * m;
    float r = length(d) / max(t.z, 1e-3);
    glow += vec3(1.0, 0.52, 0.22) * exp(-r * r * 1.4) * t.w;
  }
  uv += off * uStrength * 0.012;
  uv += vec2(sin(uTime * 71.0), cos(uTime * 53.0)) * 0.0007 * uLevel;
  vec3 c = mix(texture(uA, uv).rgb, texture(uB, uv).rgb, uMix);
  c += glow * uLevel * 0.45;
  c += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * uGrain;
  outColor = vec4(c, 1.0);
}`;

function progressiveOrder(n: number) {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i >= 0 && i < n && !seen.has(i)) {
      seen.add(i);
      out.push(i);
    }
  };
  push(0);
  push(n - 1);
  for (const stride of [16, 8, 4, 2, 1]) for (let i = 0; i < n; i += stride) push(i);
  return out;
}

export function FrameSequence({
  manifest: manifestUrl,
  poster,
  alt,
  scroll = 320,
  children,
  className = "",
}: {
  manifest: string;
  poster: string;
  alt: string;
  /** Section height in vh; the scrub runs over (scroll − 100) vh. */
  scroll?: number;
  children?: ReactNode;
  className?: string;
}) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const [revving, setRevving] = useState(false);
  const revTarget = useRef(0);

  useEffect(() => {
    const el = section.current!;
    const cv = canvas.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = cv.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) return;
    let disposed = false;
    const ctrl = new AbortController();

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const U = Object.fromEntries(
      ["uA", "uB", "uMix", "uRes", "uImg", "uTips", "uTime", "uLevel", "uStrength", "uPlume", "uGrain"].map((n) => [n, gl.getUniformLocation(prog, n)]),
    );
    const makeTex = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const slots = [
      { tex: makeTex(), frame: -1 },
      { tex: makeTex(), frame: -1 },
    ];

    let m: Manifest | null = null;
    let setName = "land";
    let tips: Tip[][] = [];
    const blobs: (Blob | null)[] = [];
    const bitmaps = new Map<number, ImageBitmap>();
    const decoding = new Set<number>();
    let progress = 0;
    let cur = 0;
    let level = 0;
    let time = 0;
    let visible = false;

    const resize = () => {
      const r = stage.current!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.round(r.width * ratio));
      cv.height = Math.max(1, Math.round(r.height * ratio));
    };

    const pickSet = (mf: Manifest) => {
      const portrait = window.innerHeight > window.innerWidth * 1.05;
      const base = portrait ? "port" : "land";
      const need = (portrait ? window.innerHeight : window.innerWidth) * Math.min(window.devicePixelRatio || 1, 2);
      const low = mf.sets[`${base}-low`];
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      const useLow = low && (saveData || need <= (portrait ? low.h : low.w) * 1.15);
      return { name: useLow ? `${base}-low` : base, tipsKey: base };
    };

    const decode = (i: number) => {
      const b = blobs[i];
      if (!b || bitmaps.has(i) || decoding.has(i)) return;
      decoding.add(i);
      void createImageBitmap(b)
        .then((bmp) => {
          decoding.delete(i);
          if (disposed) return bmp.close();
          bitmaps.set(i, bmp);
          if (bitmaps.size > CACHE) {
            let far = -1;
            let farD = -1;
            for (const k of bitmaps.keys()) {
              const d = Math.abs(k - cur);
              const inUse = slots.some((s) => s.frame === k);
              if (!inUse && d > farD) [far, farD] = [k, d];
            }
            if (far >= 0) {
              bitmaps.get(far)!.close();
              bitmaps.delete(far);
            }
          }
        })
        .catch(() => decoding.delete(i));
    };

    const nearest = (i: number, dir: -1 | 1) => {
      for (let k = i; k >= 0 && m && k < m.frames; k += dir) if (bitmaps.has(k)) return k;
      return -1;
    };

    const upload = (slot: (typeof slots)[number], frame: number) => {
      if (slot.frame === frame) return;
      const bmp = bitmaps.get(frame);
      if (!bmp) return;
      gl.bindTexture(gl.TEXTURE_2D, slot.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
      slot.frame = frame;
    };

    const tipsAt = (a: number, b: number, k: number) => {
      const out = new Float32Array(8);
      const ta = tips[a];
      const tb = tips[b] ?? ta;
      if (!ta) return out;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) out[i * 4 + j] = ta[i][j] + ((tb[i]?.[j] ?? ta[i][j]) - ta[i][j]) * k;
      return out;
    };

    const tick = (_t: number, dtMs: number) => {
      if (!m || !visible) return;
      const p = sequenceTuning.params;
      const dt = Math.min(dtMs, 100) / 1000;
      const target = progress * (m.frames - 1);
      cur += (target - cur) * damp(p.smoothing, dt);
      if (Math.abs(target - cur) < 0.001) cur = target;
      const tau = revTarget.current > level ? p.revRise : p.revFall;
      level += (revTarget.current - level) * (1 - Math.exp(-dt / Math.max(tau, 0.01)));
      time += dt * p.speed;

      const base = Math.floor(cur);
      for (let i = base - WINDOW; i <= base + WINDOW + 1; i++) if (i >= 0 && i < m.frames) decode(i);
      let a = nearest(base, -1);
      if (a < 0) a = nearest(base, 1);
      if (a < 0) return;
      let b = a === base ? nearest(base + 1, 1) : a;
      if (b < 0 || b - a > 2) b = a;
      const k = b > a ? gsap.utils.clamp(0, 1, (cur - a) / (b - a)) : 0;
      // Keep both frames resident; swap slots rather than re-uploading when moving on by one.
      if (slots[1].frame === a && slots[0].frame !== a) slots.reverse();
      upload(slots[0], a);
      upload(slots[1], b);

      gl.viewport(0, 0, cv.width, cv.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, slots[0].tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, slots[1].tex);
      gl.uniform1i(U.uA, 0);
      gl.uniform1i(U.uB, 1);
      gl.uniform1f(U.uMix, k);
      gl.uniform2f(U.uRes, cv.width, cv.height);
      const set = m.sets[setName];
      gl.uniform2f(U.uImg, set.w, set.h);
      gl.uniform4fv(U.uTips, tipsAt(a, b, k));
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uLevel, level);
      gl.uniform1f(U.uStrength, p.haze + (p.hazeRev - p.haze) * level);
      gl.uniform1f(U.uPlume, p.plume);
      gl.uniform1f(U.uGrain, p.grain);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const start = async () => {
      const res = await fetch(manifestUrl, { signal: ctrl.signal });
      const mf = (await res.json()) as Manifest;
      if (disposed) return;
      m = mf;
      const pick = pickSet(mf);
      setName = pick.name;
      tips = mf.tips[pick.tipsKey] ?? [];
      const set = mf.sets[setName];
      const order = progressiveOrder(mf.frames);
      let next = 0;
      let loaded = 0;
      let quarterDone = false;
      const needed = order.filter((i) => i % 4 === 0 || i === mf.frames - 1).length;
      const worker = async () => {
        while (next < order.length && !disposed) {
          const i = order[next++];
          try {
            const r = await fetch(`${set.path}${String(i).padStart(3, "0")}.${mf.format}`, { signal: ctrl.signal });
            blobs[i] = await r.blob();
          } catch {
            return;
          }
          if (i % 4 === 0 || i === mf.frames - 1) loaded++;
          if (!quarterDone && loaded >= needed) {
            quarterDone = true;
            decode(Math.floor(cur));
            // Wait for the first decoded frame before swapping the poster out.
            const wait = () => (bitmaps.size ? setLive(true) : !disposed && requestAnimationFrame(wait));
            wait();
          }
        }
      };
      await Promise.all(Array.from({ length: FETCHERS }, worker));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage.current!);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "50% 0px" });
    io.observe(el);
    const st = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: (s) => (progress = s.progress) });
    progress = st.progress;
    gsap.ticker.add(tick);
    void start().catch(() => undefined);

    return () => {
      disposed = true;
      ctrl.abort();
      gsap.ticker.remove(tick);
      st.kill();
      ro.disconnect();
      io.disconnect();
      bitmaps.forEach((b) => b.close());
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [manifestUrl]);

  const press = (on: boolean) => {
    if (on && revTarget.current === 0) playSound("whoosh");
    revTarget.current = on ? 1 : 0;
    setRevving(on);
  };

  return (
    <section ref={section} data-theme="deep" className={`relative bg-bg text-fg ${className}`} style={{ height: `${scroll}vh` }}>
      <div
        ref={stage}
        className="sticky top-0 h-svh touch-pan-y overflow-hidden select-none"
        onPointerDown={() => press(true)}
        onPointerUp={() => press(false)}
        onPointerLeave={() => press(false)}
        onPointerCancel={() => press(false)}
        data-cursor-label={revving ? "Revving" : "Hold to rev"}
        data-cursor-color="var(--color-deep-2)"
      >
        <img src={poster} alt={alt} className="absolute inset-0 size-full object-cover" style={{ opacity: live ? 0 : 1 }} draggable={false} />
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" style={{ opacity: live ? 1 : 0 }} />
        <div className="pointer-events-none relative h-full">{children}</div>
      </div>
    </section>
  );
}
