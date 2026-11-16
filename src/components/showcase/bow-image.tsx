"use client";

/* eslint-disable @next/next/no-img-element -- the <img> is the poster/fallback under a WebGL canvas */

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/use-media-query";
import { gsap } from "@/lib/motion/gsap";

type Getter = () => number;

type BowImageProps = {
  src: string;
  alt: string;
  /** Signed bend as a fraction of the image's half-size. Read every frame; ~±0.15 is strong. */
  bend?: Getter;
  /** "x": vertical edges bow sideways (horizontal travel). "y": horizontal edges bow up/down (vertical travel). */
  axis?: "x" | "y";
  /** Optional frame sequence; `frame` (0–1) picks the frame. `src` is the poster. */
  frames?: string[];
  frame?: Getter;
  /** Texture zoom, 1 = cover. */
  zoom?: Getter;
  /** Corner radius in CSS px, drawn in the shader so the bowed edge stays rounded. */
  radius?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/** How far the canvas extends past the box, so a bowed edge has room to travel. */
const OVERSCAN = 0.18;
const SEGMENTS = 24;
const MAX_DPR = 1.75;

const VERT = `
attribute vec2 aPos;
uniform float uBend;
uniform float uAxis;
uniform float uScale;
varying vec2 vUv;
void main() {
  vec2 p = aPos * 2.0 - 1.0;
  p.x += (1.0 - uAxis) * uBend * sin(3.14159265 * aPos.y) * 2.0;
  p.y -= uAxis * uBend * sin(3.14159265 * aPos.x) * 2.0;
  vUv = aPos;
  gl_Position = vec4(p * uScale, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uCover;
uniform float uZoom;
uniform vec2 uSize;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec2 uv = (vUv - 0.5) * uCover / uZoom + 0.5;
  vec4 c = texture2D(uTex, vec2(uv.x, 1.0 - uv.y));
  vec2 q = abs(vUv - 0.5) * uSize - (0.5 * uSize - uRadius);
  float d = length(max(q, 0.0)) - uRadius;
  float a = 1.0 - smoothstep(-0.75, 0.75, d);
  gl_FragColor = vec4(c.rgb * a, a);
}`;

/**
 * An image that bends with motion (Ananya's answer 6: cards bow with scroll
 * speed). The <img> is always rendered for SSR, alt text and as the fallback;
 * a WebGL plane draws over it once its texture is ready. Reduced motion and
 * no-WebGL keep the plain image.
 */
export function BowImage({ className = "", radius = 0, priority, sizes, ...rest }: BowImageProps) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  return (
    <div className={/\b(absolute|fixed)\b/.test(className) ? className : `relative ${className}`}>
      <img
        src={rest.src}
        alt={rest.alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full object-cover select-none"
        style={{ borderRadius: radius, opacity: ready && !reduced ? 0 : 1 }}
      />
      {!reduced && <BowCanvas {...rest} radius={radius} onReady={() => setReady(true)} />}
    </div>
  );
}

function BowCanvas({
  src,
  bend,
  axis = "x",
  frames,
  frame,
  zoom,
  radius = 0,
  onReady,
}: Omit<BowImageProps, "className" | "alt" | "sizes" | "priority"> & { onReady: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const getters = useRef({ bend, frame, zoom });
  useEffect(() => {
    getters.current = { bend, frame, zoom };
  });

  useEffect(() => {
    const host = hostRef.current;
    const box = host?.parentElement;
    if (!host || !box) return;
    // A fresh canvas per mount: a canvas keeps its first context for life, so
    // reusing one after loseContext() (e.g. Strict Mode remounts) would stay blank.
    const canvas = document.createElement("canvas");
    canvas.className = "size-full";
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true });
    if (!gl) {
      canvas.remove();
      return;
    }

    const program = link(gl, VERT, FRAG);
    if (!program) return;
    gl.useProgram(program);

    const verts: number[] = [];
    for (let y = 0; y < SEGMENTS; y++) {
      for (let x = 0; x < SEGMENTS; x++) {
        const x0 = x / SEGMENTS;
        const x1 = (x + 1) / SEGMENTS;
        const y0 = y / SEGMENTS;
        const y1 = (y + 1) / SEGMENTS;
        verts.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
      }
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uBend = u("uBend");
    const uAxis = u("uAxis");
    const uScale = u("uScale");
    const uCover = u("uCover");
    const uZoom = u("uZoom");
    const uSize = u("uSize");
    const uRadius = u("uRadius");
    gl.uniform1f(uAxis, axis === "y" ? 1 : 0);
    gl.uniform1f(uScale, 1 / (1 + 2 * OVERSCAN));

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const sources = frames?.length ? frames : [src];
    const images: (HTMLImageElement | null)[] = sources.map(() => null);
    let shown = -1;
    let imgAspect = 1;
    let disposed = false;

    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const im = new Image();
        im.decoding = "async";
        im.onload = () => {
          images[i] = im;
          resolve();
        };
        im.onerror = () => resolve();
        im.src = sources[i];
      });

    const upload = (i: number) => {
      const im = images[i];
      if (!im || i === shown) return false;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      imgAspect = im.naturalWidth / im.naturalHeight;
      shown = i;
      return true;
    };

    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * (1 + 2 * OVERSCAN) * dpr));
      canvas.height = Math.max(1, Math.round(h * (1 + 2 * OVERSCAN) * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      dirty = true;
    };

    let visible = false;
    let dirty = true;
    let current = 0;
    let lastZoom = -1;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "20%" });
    io.observe(box);
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    const draw = () => {
      if (!visible || shown < 0 || disposed) return;
      const g = getters.current;
      const target = g.bend ? g.bend() : 0;
      const next = current + (target - current) * 0.16;
      const settled = Math.abs(next - current) < 1e-4 && Math.abs(target - next) < 1e-4;
      current = settled ? target : next;

      if (g.frame && images.length > 1) {
        const idx = Math.round(gsap.utils.clamp(0, 1, g.frame()) * (images.length - 1));
        let pick = idx;
        while (pick > 0 && !images[pick]) pick--;
        if (upload(pick)) dirty = true;
      }
      const z = g.zoom ? g.zoom() : 1;
      if (z !== lastZoom) {
        lastZoom = z;
        dirty = true;
      }
      if (settled && !dirty) return;

      const planeAspect = w / Math.max(h, 1);
      const cover =
        planeAspect > imgAspect ? [1, imgAspect / planeAspect] : [planeAspect / imgAspect, 1];
      gl.uniform2f(uCover, cover[0], cover[1]);
      gl.uniform1f(uZoom, z);
      gl.uniform2f(uSize, w, h);
      gl.uniform1f(uRadius, Math.min(radius, w / 2, h / 2));
      gl.uniform1f(uBend, current);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 2);
      dirty = false;
    };

    load(0).then(() => {
      if (disposed) return;
      upload(0);
      dirty = true;
      draw();
      onReady();
      for (let i = 1; i < sources.length; i++) void load(i);
    });
    gsap.ticker.add(draw);

    return () => {
      disposed = true;
      gsap.ticker.remove(draw);
      io.disconnect();
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
    // Re-initialise only when the image source or geometry setup changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, frames, axis, radius]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        top: `${-OVERSCAN * 100}%`,
        left: `${-OVERSCAN * 100}%`,
        width: `${(1 + 2 * OVERSCAN) * 100}%`,
        height: `${(1 + 2 * OVERSCAN) * 100}%`,
      }}
    />
  );
}

function link(gl: WebGLRenderingContext, vs: string, fs: string) {
  const compile = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}
