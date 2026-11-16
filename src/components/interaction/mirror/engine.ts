"use client";

import { bendTuning, lensTuning, shockTuning, watchdogTuning } from "@/lib/interaction/config";
import { pointer } from "@/lib/interaction/pointer";
import { damp } from "@/lib/motion/ease";
import { gsap } from "@/lib/motion/gsap";

import { getMirrorBinding, type MirrorHandle } from "./bus";
import { parseColor, rasterizeText, textSignature, type TextRaster } from "./rasterize";
import { ITEM_FRAG, ITEM_VERT, POST_FRAG, POST_VERT } from "./shaders";

/*
 * DOM-to-WebGL mirror (Auge's method). Elements marked data-mirror inside a
 * [data-mirror-root] are drawn into an offscreen buffer every frame at their
 * live layout boxes; one full-screen pass then applies the scroll bow, the
 * cursor lens and click shockwaves. The DOM stays for layout, links and
 * accessibility and is visually hidden while the copy is live.
 *
 *   data-mirror="block"   background colour + corner radius
 *   data-mirror="text"    text, re-rasterised when it changes
 *   data-mirror="image"   <img>, <video> or <canvas>, honouring object-fit
 *   data-mirror-live      re-read colours every frame (hover fills)
 *   data-mirror-clip      clips mirrored descendants (overflow-hidden frames)
 *   data-mirror-3d        the element sits inside CSS 3D transforms: its
 *                         projected corners are read from four probes
 *
 * Per-element bend, zoom and frame source come from bindMirror() (bus.ts).
 */

const GRID = 24;

type Kind = "block" | "text" | "image";
type RGBA = [number, number, number, number];

type Item = {
  el: HTMLElement;
  kind: Kind;
  live: boolean;
  tex: WebGLTexture | null;
  raster: TextRaster | null;
  rasterCanvas: HTMLCanvasElement | null;
  dirty: boolean;
  color: RGBA;
  radius: number;
  chain: HTMLElement[];
  clipEl: HTMLElement | null;
  clipRadius: number;
  uploaded: string;
  mediaW: number;
  mediaH: number;
  bend: number;
  probes: HTMLElement[] | null;
  boundSource: TexImageSource | null;
};

type Shock = { x: number; y: number; t: number };

type Uniforms = Record<string, WebGLUniformLocation | null>;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string, names: string[]) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  const uniforms: Uniforms = {};
  for (const n of names) uniforms[n] = gl.getUniformLocation(program, n);
  return { program, uniforms };
}

export type MirrorEngineOptions = {
  onReady?: () => void;
  onRetreat?: (reason: string) => void;
};

export class MirrorEngine implements MirrorHandle {
  readonly state = { bend: 0, curve: 0, lensPx: 0, scrollVelocity: 0, fps: 60, items: 0 };

  private gl: WebGL2RenderingContext;
  private item: ReturnType<typeof compile>;
  private post: ReturnType<typeof compile>;
  private vao: WebGLVertexArrayObject;
  private gridVao: WebGLVertexArrayObject;
  private gridCount = 0;
  private mat = new Float32Array(9);
  private dt = 1 / 60;
  private fbo: WebGLFramebuffer;
  private sceneTex: WebGLTexture;
  private items = new Map<HTMLElement, Item>();
  private order: Item[] = [];
  private mo: MutationObserver;
  private ro: ResizeObserver;
  private ground: RGBA = [0.96, 0.94, 0.9, 1];
  private ratio = 1;
  private w = 0;
  private h = 0;
  private lastScroll = 0;
  private scrollV = 0;
  private bend = 0;
  private bendX = 0;
  private hTarget = 0;
  private hTargetAge = 1;
  private lensX = -9999;
  private lensY = -9999;
  private lensPx = 0;
  private shocks: Shock[] = [];
  private frames = 0;
  private samples: number[] = [];
  private running = false;
  private destroyed = false;
  private readyFired = false;
  private rescanQueued = false;

  constructor(
    private root: HTMLElement,
    private canvas: HTMLCanvasElement,
    private opts: MirrorEngineOptions = {},
  ) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("webgl2 unavailable");
    this.gl = gl;

    this.item = compile(gl, ITEM_VERT, ITEM_FRAG, [
      "uRes",
      "uMat",
      "uSize",
      "uBend",
      "uAxis",
      "uTex",
      "uMode",
      "uColor",
      "uUvRect",
      "uRadius",
      "uClip",
      "uClipRadius",
      "uOpacity",
      "uRatio",
    ]);
    this.post = compile(gl, POST_VERT, POST_FRAG, [
      "uScene",
      "uRes",
      "uCurve",
      "uCurveX",
      "uFeather",
      "uLensPos",
      "uLensR",
      "uLensK",
      "uPrism",
      "uShock",
      "uShockW",
    ]);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const grid: number[] = [];
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const [x0, x1, y0, y1] = [x / GRID, (x + 1) / GRID, y / GRID, (y + 1) / GRID];
        grid.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
      }
    this.gridVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.gridVao);
    const gridBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(grid), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.gridCount = grid.length / 2;
    gl.bindVertexArray(null);

    this.sceneTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;

    this.mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "childList") this.queueRescan();
        const target = r.target.nodeType === Node.TEXT_NODE ? r.target.parentElement : (r.target as HTMLElement);
        const owner = target?.closest<HTMLElement>("[data-mirror]");
        if (owner) this.markDirty(owner);
      }
    });
    this.ro = new ResizeObserver((entries) => {
      for (const e of entries) this.markDirty(e.target as HTMLElement);
    });

    canvas.addEventListener("webglcontextlost", this.onContextLost);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  async start() {
    await document.fonts?.ready;
    if (this.destroyed) return;
    this.resize();
    this.readGround();
    this.scan();
    // Inline style changes are animation frames; boxes and opacity are read live, so they never need a re-raster.
    this.mo.observe(this.root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "src"] });
    this.lastScroll = window.scrollY;
    this.running = true;
    gsap.ticker.add(this.frame);
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    gsap.ticker.remove(this.frame);
    this.mo.disconnect();
    this.ro.disconnect();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    const gl = this.gl;
    for (const it of this.items.values()) if (it.tex) gl.deleteTexture(it.tex);
    gl.deleteTexture(this.sceneTex);
    gl.deleteFramebuffer(this.fbo);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  /* ---------- public handle ---------- */

  shock(x: number, y: number) {
    this.shocks.push({ x, y, t: 0 });
    if (this.shocks.length > 4) this.shocks.shift();
  }

  setHorizontalVelocity(v: number) {
    this.hTarget = v;
    this.hTargetAge = 0;
  }

  invalidate(el?: Element) {
    if (!el) {
      this.readGround();
      this.items.forEach((it) => this.refreshStatic(it));
      return;
    }
    const it = this.items.get(el as HTMLElement);
    if (it) this.refreshStatic(it);
  }

  /* ---------- registry ---------- */

  private queueRescan() {
    if (this.rescanQueued) return;
    this.rescanQueued = true;
    requestAnimationFrame(() => {
      this.rescanQueued = false;
      if (!this.destroyed) this.scan();
    });
  }

  private scan() {
    const found = Array.from(this.root.querySelectorAll<HTMLElement>("[data-mirror]"));
    const seen = new Set(found);
    for (const [el, it] of this.items) {
      if (!seen.has(el)) {
        if (it.tex) this.gl.deleteTexture(it.tex);
        if (it.kind === "text") this.ro.unobserve(el);
        this.items.delete(el);
      }
    }
    for (const el of found) {
      if (this.items.has(el)) continue;
      const kind = (el.dataset.mirror as Kind) || "block";
      const chain: HTMLElement[] = [];
      for (let p: HTMLElement | null = el; p && p !== this.root.parentElement; p = p.parentElement) chain.push(p);
      const it: Item = {
        el,
        kind,
        live: el.hasAttribute("data-mirror-live"),
        tex: null,
        raster: null,
        rasterCanvas: null,
        dirty: true,
        color: [0, 0, 0, 0],
        radius: 0,
        chain,
        clipEl: el.parentElement?.closest<HTMLElement>("[data-mirror-clip]") ?? null,
        clipRadius: 0,
        uploaded: "",
        mediaW: 0,
        mediaH: 0,
        bend: 0,
        probes: el.hasAttribute("data-mirror-3d") ? this.probesFor(el) : null,
        boundSource: null,
      };
      this.refreshStatic(it);
      if (kind === "text") this.ro.observe(el);
      this.items.set(el, it);
    }
    this.order = found.map((el) => this.items.get(el)!).filter(Boolean);
    this.state.items = this.order.length;
  }

  /** Four zero-size markers at the element's corners; their boxes are the projected corners. */
  private probesFor(el: HTMLElement) {
    const host = el instanceof HTMLImageElement || el instanceof HTMLVideoElement || el instanceof HTMLCanvasElement ? el.parentElement : el;
    if (!host) return null;
    let box = host.querySelector<HTMLElement>(":scope > [data-mirror-probes]");
    if (!box) {
      box = document.createElement("span");
      box.dataset.mirrorProbes = "";
      box.setAttribute("aria-hidden", "true");
      box.style.cssText = "position:absolute;inset:0;pointer-events:none;visibility:hidden";
      for (const [x, y] of [[0, 0], [100, 0], [100, 100], [0, 100]]) {
        const p = document.createElement("span");
        p.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:0;height:0`;
        box.appendChild(p);
      }
      host.appendChild(box);
    }
    return Array.from(box.children) as HTMLElement[];
  }

  private refreshStatic(it: Item) {
    const style = getComputedStyle(it.el);
    it.radius = parseFloat(style.borderTopLeftRadius) || 0;
    if (it.kind === "block") it.color = parseColor(style.backgroundColor);
    if (it.clipEl) it.clipRadius = parseFloat(getComputedStyle(it.clipEl).borderTopLeftRadius) || 0;
    it.dirty = true;
  }

  private markDirty(el: HTMLElement) {
    const it = this.items.get(el);
    if (it) it.dirty = true;
  }

  private readGround() {
    const v = getComputedStyle(this.root).getPropertyValue("--color-bg").trim();
    if (v) this.ground = parseColor(v);
  }

  /* ---------- sizing ---------- */

  private onResize = () => {
    this.resize();
    this.items.forEach((it) => (it.dirty = true));
  };

  private resize() {
    const gl = this.gl;
    this.ratio = Math.min(window.devicePixelRatio || 1, bendTuning.params.dprCap);
    this.w = document.documentElement.clientWidth;
    this.h = document.documentElement.clientHeight;
    const pw = Math.round(this.w * this.ratio);
    const ph = Math.round(this.h * this.ratio);
    this.canvas.width = pw;
    this.canvas.height = ph;
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, pw, ph, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /* ---------- textures ---------- */

  private ensureTex(it: Item) {
    const gl = this.gl;
    if (!it.tex) {
      it.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, it.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, it.tex);
    }
  }

  private upload(it: Item, source: TexImageSource) {
    const gl = this.gl;
    this.ensureTex(it);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch {
      /* tainted or not decodable yet */
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  private prepareText(it: Item, rect: DOMRect) {
    if (!it.dirty && !it.live) return;
    if (it.live && !it.dirty && it.raster && textSignature(it.el, rect) === it.raster.signature) return;
    const raster = rasterizeText(it.el, this.ratio, it.rasterCanvas ?? undefined);
    it.dirty = false;
    if (!raster) return;
    it.raster = raster;
    it.rasterCanvas = raster.canvas;
    this.upload(it, raster.canvas);
  }

  private prepareMedia(it: Item): boolean {
    const el = it.el;
    const bound = getMirrorBinding(el)?.source?.();
    if (bound) {
      if (bound !== it.boundSource) {
        if (bound instanceof HTMLImageElement && (!bound.complete || !bound.naturalWidth)) return !!it.tex;
        this.upload(it, bound);
        it.boundSource = bound;
        it.uploaded = "";
        const m = bound as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number; height?: number };
        it.mediaW = m.naturalWidth || m.videoWidth || (m.width as number) || 1;
        it.mediaH = m.naturalHeight || m.videoHeight || (m.height as number) || 1;
      }
      return !!it.tex;
    }
    it.boundSource = null;
    if (el instanceof HTMLImageElement) {
      if (!el.complete || !el.naturalWidth) return false;
      if (it.uploaded !== el.currentSrc) {
        this.upload(it, el);
        it.uploaded = el.currentSrc;
        it.mediaW = el.naturalWidth;
        it.mediaH = el.naturalHeight;
      }
      return true;
    }
    if (el instanceof HTMLVideoElement) {
      if (el.readyState < 2) return !!it.tex;
      if (!el.paused || !it.tex) this.upload(it, el);
      it.mediaW = el.videoWidth;
      it.mediaH = el.videoHeight;
      return true;
    }
    if (el instanceof HTMLCanvasElement) {
      if (!el.width) return false;
      this.upload(it, el);
      it.mediaW = el.width;
      it.mediaH = el.height;
      return true;
    }
    return false;
  }

  /* ---------- frame ---------- */

  private onVisibility = () => {
    this.samples.length = 0;
    this.lastScroll = window.scrollY;
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.retreat("context lost");
  };

  private watchdog(deltaMs: number) {
    if (++this.frames < 30 || document.hidden) return;
    const p = watchdogTuning.params;
    this.samples.push(deltaMs);
    if (this.samples.length > p.window) this.samples.shift();
    // Slow frames count within the same rolling window, so a long session can't add up to a retreat.
    const slow = this.samples.filter((d) => d > p.slowMs).length;
    const janky = this.samples.filter((d) => d > p.jankMs).length / this.samples.length;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.state.fps = Math.round(1000 / Math.max(avg, 1));
    if (slow >= p.slowFrames) this.retreat(`${slow} of the last ${this.samples.length} frames over ${p.slowMs} ms`);
    else if (this.samples.length >= p.window && janky > p.jankRatio)
      this.retreat(`${Math.round(janky * 100)}% of frames over ${p.jankMs} ms`);
  }

  private retreat(reason: string) {
    if (!this.running) return;
    this.running = false;
    gsap.ticker.remove(this.frame);
    this.opts.onRetreat?.(reason);
  }

  private frame = (_time: number, deltaMs: number) => {
    if (!this.running || document.hidden) return;
    const dt = Math.min(Math.max(deltaMs, 1), 100) / 1000;
    this.dt = dt;
    this.watchdog(deltaMs);
    if (!this.running) return;

    const b = bendTuning.params;
    const l = lensTuning.params;
    const s = shockTuning.params;

    // Scroll bend: Auge's smoothing, attack and release.
    const sy = window.scrollY;
    const inst = (sy - this.lastScroll) / dt;
    this.lastScroll = sy;
    this.scrollV = this.scrollV * 0.6 + inst * 0.4;
    const target = Math.max(-1, Math.min(1, this.scrollV / b.velocityForFull));
    const growing = Math.abs(target) > Math.abs(this.bend);
    this.bend += (target - this.bend) * damp(growing ? b.rise : b.relax, dt);
    if (Math.abs(this.bend) < 0.01 && Math.abs(target) < 0.01) this.bend = 0;

    this.hTargetAge += dt;
    const hv = this.hTargetAge < 0.12 ? this.hTarget : 0;
    const hMag = Math.max(0, Math.abs(hv) - b.horizontalDeadZone) / b.horizontalForFull;
    const hTargetN = Math.sign(hv) * Math.min(1, hMag);
    const hGrowing = Math.abs(hTargetN) > Math.abs(this.bendX);
    this.bendX += (hTargetN - this.bendX) * damp(hGrowing ? b.rise : b.relax, dt);
    if (Math.abs(this.bendX) < 0.01 && Math.abs(hTargetN) < 0.01) this.bendX = 0;

    // Lens: always present at rest, grows with pointer speed.
    if (pointer.active) {
      if (this.lensX < -1000) {
        this.lensX = pointer.x;
        this.lensY = pointer.y;
      }
      const f = damp(l.follow, dt);
      this.lensX += (pointer.x - this.lensX) * f;
      this.lensY += (pointer.y - this.lensY) * f;
    }
    const speedN = Math.pow(Math.min(pointer.speed / l.speedForFull, 1), l.curvePower);
    const lensTarget = pointer.active ? l.rest + (l.fast - l.rest) * speedN : 0;
    this.lensPx += (lensTarget - this.lensPx) * damp(l.smoothing, dt);

    for (const sh of this.shocks) sh.t += dt;
    this.shocks = this.shocks.filter((sh) => sh.t < s.duration);

    this.state.bend = this.bend;
    this.state.curve = this.bend * b.curve;
    this.state.lensPx = this.lensPx;
    this.state.scrollVelocity = this.scrollV;

    this.draw();
  };

  /** Places the next item on an axis-aligned box in CSS px. */
  private placeBox(x: number, y: number, w: number, h: number) {
    const m = this.mat;
    m[0] = w; m[1] = 0; m[2] = 0;
    m[3] = 0; m[4] = h; m[5] = 0;
    m[6] = x; m[7] = y; m[8] = 1;
    const u = this.item.uniforms;
    this.gl.uniformMatrix3fv(u.uMat, false, m);
    this.gl.uniform2f(u.uSize, w, h);
  }

  /**
   * Places the next item on its projected corners (TL, TR, BR, BL) with the
   * unit-square-to-quad homography (Heckbert), so texture interpolation is
   * perspective-correct. Returns false for back-facing or degenerate quads.
   */
  private placeProjected(probes: HTMLElement[]) {
    const pts = probes.map((p) => p.getBoundingClientRect());
    const [x0, y0, x1, y1, x2, y2, x3, y3] = [pts[0].left, pts[0].top, pts[1].left, pts[1].top, pts[2].left, pts[2].top, pts[3].left, pts[3].top];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0) + (x2 - x0) * (y3 - y0) - (x3 - x0) * (y2 - y0);
    if (!(area > 1)) return false;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    let g = 0, h = 0;
    if (Math.abs(dx3) > 1e-6 || Math.abs(dy3) > 1e-6) {
      const den = dx1 * dy2 - dx2 * dy1;
      if (Math.abs(den) < 1e-9) return false;
      g = (dx3 * dy2 - dx2 * dy3) / den;
      h = (dx1 * dy3 - dx3 * dy1) / den;
    }
    const m = this.mat;
    m[0] = x1 - x0 + g * x1; m[1] = y1 - y0 + g * y1; m[2] = g;
    m[3] = x3 - x0 + h * x3; m[4] = y3 - y0 + h * y3; m[5] = h;
    m[6] = x0; m[7] = y0; m[8] = 1;
    this.gl.uniformMatrix3fv(this.item.uniforms.uMat, false, m);
    return true;
  }

  private drawItem(bend: number) {
    const gl = this.gl;
    const bent = Math.abs(bend) > 1e-4;
    gl.uniform1f(this.item.uniforms.uBend, bent ? bend : 0);
    gl.bindVertexArray(bent ? this.gridVao : this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, bent ? this.gridCount : 6);
  }

  private draw() {
    const gl = this.gl;
    const pw = this.canvas.width;
    const ph = this.canvas.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, pw, ph);
    const [gr, gg, gb] = this.ground;
    gl.clearColor(gr, gg, gb, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.item.program);
    gl.bindVertexArray(this.vao);
    const u = this.item.uniforms;
    gl.uniform2f(u.uRes, this.w, this.h);
    gl.uniform1f(u.uRatio, this.ratio);
    gl.uniform1i(u.uTex, 0);
    gl.uniform1f(u.uAxis, 0);
    gl.activeTexture(gl.TEXTURE0);
    // The post pass leaves the scene texture bound; a colour block drawn into the scene FBO
    // before any item binds its own texture would be a feedback loop, which WebGL drops.
    gl.bindTexture(gl.TEXTURE_2D, null);

    const margin = 160;
    const ease = damp(0.16, this.dt);
    for (const it of this.order) {
      const rect = it.el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.bottom < -margin || rect.top > this.h + margin || rect.right < -margin || rect.left > this.w + margin)
        continue;

      let opacity = 1;
      for (const c of it.chain) {
        const o = c.style.opacity;
        if (o !== "") opacity *= parseFloat(o);
        if (opacity <= 0.001) break;
      }
      if (opacity <= 0.001) continue;

      if (it.clipEl) {
        const cr = it.clipEl.getBoundingClientRect();
        gl.uniform4f(u.uClip, cr.left, cr.top, cr.width, cr.height);
        gl.uniform1f(u.uClipRadius, it.clipRadius);
      } else {
        gl.uniform4f(u.uClip, 0, 0, -1, -1);
      }
      gl.uniform1f(u.uOpacity, opacity);

      if (it.kind === "block") {
        if (it.live) it.color = parseColor(getComputedStyle(it.el).backgroundColor);
        if (it.color[3] <= 0) continue;
        gl.uniform1i(u.uMode, 0);
        gl.uniform4fv(u.uColor, it.color);
        this.placeBox(rect.left, rect.top, rect.width, rect.height);
        gl.uniform1f(u.uRadius, it.radius);
        this.drawItem(0);
        continue;
      }

      if (it.kind === "text") {
        this.prepareText(it, rect);
        const r = it.raster;
        if (!r || !it.tex) continue;
        gl.bindTexture(gl.TEXTURE_2D, it.tex);
        gl.uniform1i(u.uMode, 1);
        gl.uniform4f(u.uUvRect, 0, 0, 1, 1);
        // Scale the raster with the element so GSAP scale tweens still read.
        const sx = rect.width / (r.width + 2 * r.offsetX);
        const sy = rect.height / (r.height + 2 * r.offsetY);
        this.placeBox(rect.left + r.offsetX * sx, rect.top + r.offsetY * sy, r.width * sx, r.height * sy);
        gl.uniform1f(u.uRadius, 0);
        this.drawItem(0);
        continue;
      }

      if (!this.prepareMedia(it) || !it.tex) continue;
      const binding = getMirrorBinding(it.el);
      const bendTarget = binding?.bend?.() ?? 0;
      it.bend += (bendTarget - it.bend) * ease;
      if (Math.abs(it.bend - bendTarget) < 1e-4) it.bend = bendTarget;
      gl.uniform1f(u.uAxis, binding?.axis === "y" ? 1 : 0);
      gl.bindTexture(gl.TEXTURE_2D, it.tex);
      gl.uniform1i(u.uMode, 1);

      const projected = it.probes ? this.placeProjected(it.probes) : false;
      if (it.probes && !projected) continue;
      // In 3D the element's own box is the plane; otherwise its live layout box.
      const bw = projected ? it.el.offsetWidth : rect.width;
      const bh = projected ? it.el.offsetHeight : rect.height;
      const fit = projected ? "cover" : it.el.style.objectFit || it.el.dataset.mirrorFit || "cover";
      let [u0, v0, u1, v1] = [0, 0, 1, 1];
      let [dx, dy, dw, dh] = [rect.left, rect.top, rect.width, rect.height];
      const na = it.mediaW / Math.max(it.mediaH, 1);
      const ba = bw / Math.max(bh, 1);
      if (fit === "cover") {
        if (na > ba) {
          const k = ba / na;
          u0 = (1 - k) / 2;
          u1 = u0 + k;
        } else {
          const k = na / ba;
          v0 = (1 - k) / 2;
          v1 = v0 + k;
        }
      } else if (fit === "contain") {
        if (na > ba) {
          dh = rect.width / na;
          dy = rect.top + (rect.height - dh) / 2;
        } else {
          dw = rect.height * na;
          dx = rect.left + (rect.width - dw) / 2;
        }
      }
      const zoom = binding?.zoom?.() ?? 1;
      if (zoom !== 1 && zoom > 0) {
        const [cu, cv, hu, hv] = [(u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) / 2 / zoom, (v1 - v0) / 2 / zoom];
        [u0, u1, v0, v1] = [cu - hu, cu + hu, cv - hv, cv + hv];
      }
      gl.uniform4f(u.uUvRect, u0, v0, u1, v1);
      if (projected) gl.uniform2f(u.uSize, bw, bh);
      else this.placeBox(dx, dy, dw, dh);
      gl.uniform1f(u.uRadius, it.radius);
      this.drawItem(it.bend);
    }
    gl.bindVertexArray(this.vao);
    gl.uniform1f(u.uBend, 0);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pw, ph);
    gl.useProgram(this.post.program);
    const p = this.post.uniforms;
    const b = bendTuning.params;
    const l = lensTuning.params;
    const s = shockTuning.params;
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.uniform1i(p.uScene, 0);
    gl.uniform2f(p.uRes, this.w, this.h);
    gl.uniform1f(p.uCurve, this.bend * b.curve);
    gl.uniform1f(p.uCurveX, this.bendX * b.curve);
    gl.uniform1f(p.uFeather, b.edgeFeather);
    gl.uniform2f(p.uLensPos, this.lensX, this.lensY);
    gl.uniform1f(p.uLensR, l.radius);
    // Peak displacement of d·exp(−2d²/R²) is R/2·e^−½ ≈ 0.303 R.
    gl.uniform1f(p.uLensK, this.lensPx / (0.3033 * l.radius));
    gl.uniform1f(p.uPrism, l.prism * Math.min(1, this.lensPx / Math.max(l.fast, 0.001)) * 0.12);
    const shock = new Float32Array(16);
    this.shocks.forEach((sh, i) => {
      const k = sh.t / s.duration;
      shock[i * 4] = sh.x;
      shock[i * 4 + 1] = sh.y;
      shock[i * 4 + 2] = s.startRadius + s.travel * (1 - Math.pow(1 - k, 3));
      shock[i * 4 + 3] = s.amplitude * Math.pow(1 - k, 2);
    });
    gl.uniform4fv(p.uShock, shock);
    gl.uniform1f(p.uShockW, s.width);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!this.readyFired) {
      this.readyFired = true;
      this.opts.onReady?.();
    }
  }
}
