"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { transitionTuning } from "@/lib/interaction/config";
import { smoothstep } from "@/lib/motion/ease";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

import { parseColor } from "../mirror/rasterize";

/*
 * Decision 2 (one ink reveal within pages). A port of Grail's warpFill: a
 * domain-warped fBm blot with ridged fingers and low-frequency lobes spreads
 * from a corner, its edge stays wild mid-spread and settles to a clean fill,
 * coloured bright → base → deep from the origin. Scrubbed by scroll here.
 */

const VERT = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform vec2 uOrigin; uniform float uProgress; uniform float uNoiseAmp;
uniform float uNoiseScale; uniform float uEdge; uniform float uTime;
uniform vec3 uBright; uniform vec3 uBase; uniform vec3 uDeep;
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float valueNoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ v += valueNoise(p)*a; p = p*2.02 + 11.3; a *= 0.5; } return v/0.969; }
void main(){
  vec2 uv = vec2(gl_FragCoord.x/uRes.x, 1.0 - gl_FragCoord.y/uRes.y);
  float aspect = uRes.x/uRes.y;
  vec2 delta = uv - uOrigin; delta.x *= aspect;
  float md = 0.0; vec2 c;
  c = vec2(0,0) - uOrigin; c.x *= aspect; md = max(md, length(c));
  c = vec2(1,0) - uOrigin; c.x *= aspect; md = max(md, length(c));
  c = vec2(0,1) - uOrigin; c.x *= aspect; md = max(md, length(c));
  c = vec2(1,1) - uOrigin; c.x *= aspect; md = max(md, length(c));
  float d = length(delta)/max(md, 0.001);
  vec2 wq = uv*2.2;
  vec2 warp = vec2(fbm(wq + uTime*0.24), fbm(wq + 31.7 - uTime*0.2)) - 0.5;
  vec2 suv = uv + warp*0.4;
  float scl = uNoiseScale*0.5;
  float nz = fbm(suv*scl + uTime*0.14); nz = nz*0.6 + fbm(suv*scl*2.3 - uTime*0.09)*0.4;
  float ridged = 1.0 - abs(nz*2.0 - 1.0);
  float lobe = fbm(suv*(scl*0.3) + 7.0 + uTime*0.06);
  float fieldNoise = (nz-0.5)*1.4 + (ridged-0.5)*0.6 + (lobe-0.5)*1.9;
  float reach = uProgress*1.35 - 0.05;
  float settle = 1.0 - smoothstep(0.4, 1.0, uProgress);
  float edge = clamp(d*1.8, 0.0, 1.0);
  float coverage = (reach - d) + fieldNoise*uNoiseAmp*max(reach, 0.0)*settle*edge;
  float aa = max(uEdge*0.1, 0.004);
  float alpha = smoothstep(-aa, aa, coverage);
  float mottle = fbm(uv*7.0 + 3.0)*0.08*step(0.0, coverage);
  float gradT = clamp(length((uv - uOrigin)*uRes)/(max(uRes.x, uRes.y)*0.6), 0.0, 1.0);
  vec3 col = gradT < 0.5 ? mix(uBright, uBase, gradT*2.0) : mix(uBase, uDeep, (gradT-0.5)*2.0);
  col *= 1.0 - mottle;
  gl_FragColor = vec4(col*alpha, alpha);
}`;

function palette(color: string) {
  const [r, g, b] = parseColor(color);
  return {
    bright: [Math.min(r + 0.02, 1), Math.min(g + 0.1, 1), Math.min(b + 0.02, 1)],
    base: [r, g, b],
    deep: [r * 0.6, g * 0.34, Math.min(b * 0.95 + 0.05, 1)],
  };
}

export function InkReveal({
  color = "#ffcbc5",
  origin = [0.12, 0.92],
  className = "",
  children,
}: {
  color?: string;
  origin?: [number, number];
  className?: string;
  children: ReactNode;
}) {
  const [ox, oy] = origin;
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = section.current!;
    const cv = canvas.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = reduced ? null : cv.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) {
      el.style.background = color;
      if (content.current) content.current.style.opacity = "1";
      return;
    }
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
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u("uRes"),
      origin: u("uOrigin"),
      progress: u("uProgress"),
      amp: u("uNoiseAmp"),
      scale: u("uNoiseScale"),
      edge: u("uEdge"),
      time: u("uTime"),
      bright: u("uBright"),
      base: u("uBase"),
      deep: u("uDeep"),
    };
    const pal = palette(color);

    let progress = 0;
    let time = 0;
    let visible = false;
    const resize = () => {
      const r = el.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.round(r.width * ratio));
      cv.height = Math.max(1, Math.round(r.height * ratio));
    };
    const draw = () => {
      const p = transitionTuning.params;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, cv.width, cv.height);
      gl.uniform2f(U.origin, ox, oy);
      gl.uniform1f(U.progress, progress);
      gl.uniform1f(U.amp, p.inkAmp);
      gl.uniform1f(U.scale, p.inkScale);
      gl.uniform1f(U.edge, p.inkEdge);
      gl.uniform1f(U.time, time);
      gl.uniform3fv(U.bright, pal.bright);
      gl.uniform3fv(U.base, pal.base);
      gl.uniform3fv(U.deep, pal.deep);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const tick = (_t: number, dt: number) => {
      if (!visible) return;
      // The blot keeps flowing while its edge is still moving; a settled fill stops drawing.
      if (progress > 0 && progress < 1) time += dt / 1000;
      draw();
      if (content.current) {
        const k = smoothstep(0.45, 0.85, progress);
        content.current.style.opacity = String(k);
        content.current.style.translate = `0 ${(1 - k) * 2}rem`;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      end: "top top",
      scrub: true,
      onUpdate: (s) => (progress = s.progress),
      onToggle: (s) => (visible = s.isActive || s.progress > 0),
    });
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      st.kill();
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [color, ox, oy]);

  return (
    <section ref={section} className={`relative overflow-hidden ${className}`}>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
      <div ref={content} className="relative" style={{ opacity: 0 }}>
        {children}
      </div>
    </section>
  );
}
