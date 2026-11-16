"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  CanvasTexture,
  Color,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearSRGBColorSpace,
  type Mesh,
  NoBlending,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from "three";

import { prefersReducedMotion } from "@/lib/interaction/capability";
import { pointer, startPointer } from "@/lib/interaction/pointer";
import { gsap } from "@/lib/motion/gsap";

import { buildCubes, FACE, FACES_PER_CUBE, FEATURED, GRID, PALETTE, WALLS, type Cube, type WordSet } from "./config";
import { cubeCenter, halfSize, placeCamera, type CubeState, type Tilt } from "./motion";
import { COMETS, fragmentShader, vertexShader } from "./shader";

type SceneProps = {
  state: CubeState;
  words: WordSet;
  universes: boolean;
  /** One wrapper per featured column, placed on its top face every frame. */
  faces: RefObject<(HTMLDivElement | null)[]>;
  faceSize: number;
};

export default function CubeScene(props: SceneProps) {
  return (
    <Canvas
      frameloop="never"
      dpr={[1, 1.75]}
      camera={{ fov: 20, near: 1, far: 200, position: [0, 20, 40] }}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = NoToneMapping;
      }}
    >
      <Field {...props} />
    </Canvas>
  );
}

function atlasFor(words: string[]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  words.forEach((word, n) => {
    const cx = (n % 4) * 256 + 128;
    const cy = Math.floor(n / 4) * 256 + 128;
    let size = 80;
    ctx.font = `600 ${size}px ${family}`;
    while (ctx.measureText(word).width > 216 && size > 18) {
      size -= 2;
      ctx.font = `600 ${size}px ${family}`;
    }
    ctx.fillText(word, cx, cy + size * 0.04);
  });
  const tex = new CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

/** The shader writes display values straight out, so colours stay in sRGB, unconverted. */
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, LinearSRGBColorSpace);
};

function buildField(cubes: Cube[], words: WordSet, universes: boolean) {
  const count = cubes.length * FACES_PER_CUBE;
  const aCube = new Float32Array(count * 4);
  const aMeta = new Float32Array(count * 4);
  const aBase = new Float32Array(count * 3);
  const aDeep = new Float32Array(count * 3);
  const aInk = new Float32Array(count * 3);
  const aUni = new Float32Array(count);
  const aId = Float32Array.from({ length: count }, (_, n) => n);

  const paper = rgb(PALETTE.paper2);
  const ink = rgb(PALETTE.ink);
  const ink2 = rgb(PALETTE.ink2);
  const fields = PALETTE.fields.map(rgb);
  const deeps = PALETTE.deeps.map(rgb);

  const wallWords: string[] = [];
  const wallSlots: { face: number; level: number; i: number; j: number; word: number }[] = [];
  WALLS.forEach((wall, w) => {
    const phrase = words.walls[w];
    if (!phrase) return;
    phrase.split(" ").forEach((word, n) => {
      const index = words.tops.length + wallWords.length;
      wallWords.push(word);
      const at = wall.start + (wall.face === "px" ? -n : n);
      const [i, j] = wall.face === "pz" ? [at, GRID - 1] : wall.face === "nx" ? [0, at] : [GRID - 1, at];
      wallSlots.push({ face: FACE[wall.face], level: wall.level, i, j, word: index });
    });
  });

  const tops: number[] = [];
  const candidates: number[] = [];
  cubes.forEach((c, ci) => {
    const featured = c.k === c.colH - 1 ? FEATURED.findIndex(([i, j]) => i === c.i && j === c.j) : -1;
    const fieldIx = featured >= 0 ? featured % 3 : c.hash < 0.07 ? Math.floor(c.hash * 1000) % 3 : -1;
    if (featured >= 0) tops[featured] = ci;
    for (let f = 0; f < FACES_PER_CUBE; f++) {
      const n = ci * FACES_PER_CUBE + f;
      aCube.set([c.i, c.j, c.k, c.colH], n * 4);
      let word = -1;
      if (f === FACE.top && featured >= 0 && !universes) word = featured;
      const slot = wallSlots.find((s) => s.face === f && s.level === c.k && s.i === c.i && s.j === c.j);
      if (slot) word = slot.word;
      aMeta.set([c.ring, c.hash, f, word], n * 4);
      (fieldIx >= 0 ? fields[fieldIx] : paper).toArray(aBase, n * 3);
      (fieldIx >= 0 ? deeps[fieldIx] : ink2).toArray(aDeep, n * 3);
      (fieldIx >= 0 ? deeps[fieldIx] : ink).toArray(aInk, n * 3);
      aUni[n] = universes && featured >= 0 && f === FACE.top ? 1 : 0;

      const outward =
        (f === FACE.top && c.k === c.colH - 1) ||
        (f === FACE.px && c.i === GRID - 1) ||
        (f === FACE.nx && c.i === 0) ||
        (f === FACE.pz && c.j === GRID - 1);
      if (outward && !aUni[n]) candidates.push(n);
    }
  });

  const plane = new PlaneGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute("position", plane.getAttribute("position"));
  geometry.setAttribute("uv", plane.getAttribute("uv"));
  geometry.setAttribute("aCube", new InstancedBufferAttribute(aCube, 4));
  geometry.setAttribute("aMeta", new InstancedBufferAttribute(aMeta, 4));
  geometry.setAttribute("aBase", new InstancedBufferAttribute(aBase, 3));
  geometry.setAttribute("aDeep", new InstancedBufferAttribute(aDeep, 3));
  geometry.setAttribute("aInk", new InstancedBufferAttribute(aInk, 3));
  geometry.setAttribute("aUni", new InstancedBufferAttribute(aUni, 1));
  geometry.setAttribute("aId", new InstancedBufferAttribute(aId, 1));
  geometry.instanceCount = count;

  return { geometry, atlasWords: [...words.tops, ...wallWords], tops, candidates };
}

/** A small deterministic generator, so recorded runs repeat. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const center = new Vector3();
const corner = new Vector3();
const view = new Vector3();
const ndc = new Vector2();
const raycaster = new Raycaster();
const invDir = new Vector3();

/** Unit-square-to-quad homography as a CSS matrix3d for a w x h element. */
function quadMatrix(p: number[], w: number, h: number) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, k = 0;
  if (Math.abs(dx3) > 1e-6 || Math.abs(dy3) > 1e-6) {
    const den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-9) return null;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    k = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3, f = y0;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${k / h},0,0,1,0,${c},${f},0,1)`;
}

function Field({ state, words, universes, faces, faceSize }: SceneProps) {
  const get = useThree((s) => s.get);
  const cubes = useMemo(() => buildCubes(), []);
  const mesh = useRef<Mesh>(null);
  const field = useMemo(() => buildField(cubes, words, universes), [cubes, words, universes]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        glslVersion: GLSL3,
        vertexShader,
        fragmentShader,
        blending: NoBlending,
        uniforms: {
          uIntro: { value: 0 },
          uSlide: { value: 0 },
          uFlatten: { value: 0 },
          uUniverse: { value: 0 },
          uTime: { value: 0 },
          uAtlas: { value: null },
          uInkLine: { value: rgb(PALETTE.ink) },
          uGlow: { value: rgb(PALETTE.fields[0]) },
          uCore: { value: rgb(PALETTE.deeps[0]) },
          uComets: { value: Array.from({ length: COMETS }, () => new Vector4(-1, 0, 1, 0)) },
        },
      }),
    [],
  );

  useEffect(() => {
    let tex: CanvasTexture | null = null;
    let live = true;
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!live) return;
      tex = atlasFor(field.atlasWords);
      const m = mesh.current?.material as ShaderMaterial | undefined;
      if (m) m.uniforms.uAtlas.value = tex;
    });
    return () => {
      live = false;
      tex?.dispose();
    };
  }, [field, material]);

  useEffect(() => () => field.geometry.dispose(), [field]);
  useEffect(() => () => material.dispose(), [material]);

  // R3F renders from GSAP's ticker, the same beat as Lenis and the mirror.
  useEffect(() => {
    const stop = startPointer();
    const tick = (time: number) => get().advance(time * 1000);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      stop();
    };
  }, [get]);

  const liveRef = useRef({ tilt: { yaw: 0, pitch: 0 } as Tilt, hovered: -1, nextAmbient: 0.8, slot: 1, rand: rng(7) });
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useFrame((three, delta) => {
    const cam = three.camera as PerspectiveCamera;
    const { width, height } = three.size;
    const t = gsap.ticker.time;
    const live = liveRef.current;
    const m = mesh.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    const u = m.uniforms;

    if (!reduced && pointer.active) {
      const nx = pointer.x / width - 0.5;
      const ny = pointer.y / height - 0.5;
      const ease = 1 - Math.exp(-delta * 3.5);
      live.tilt.yaw += (nx * 8 * (Math.PI / 180) - live.tilt.yaw) * ease;
      live.tilt.pitch += (ny * 5 * (Math.PI / 180) - live.tilt.pitch) * ease;
    }
    placeCamera(cam, state, live.tilt);

    syncUniforms(m, state, t);

    const comets = u.uComets.value as Vector4[];
    if (!reduced) {
      if (pointer.active) {
        const hit = pick(cubes, state, cam, (pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
        if (hit !== live.hovered) {
          live.hovered = hit;
          if (hit >= 0 && !(comets[0].x === hit && t - comets[0].y < 0.6)) comets[0].set(hit, t, 1.4, 1);
        }
      }
      if (t > live.nextAmbient && state.intro > 0.6) {
        const id = field.candidates[Math.floor(live.rand() * field.candidates.length)]!;
        comets[live.slot]!.set(id, t, 1.6 + live.rand() * 0.8, 0.85);
        live.slot = (live.slot % (COMETS - 1)) + 1;
        live.nextAmbient = t + 0.7 + live.rand() * 0.6;
      }
    }

    const els = faces.current;
    field.tops.forEach((ci, n) => {
      const el = els?.[n];
      if (!el) return;
      if (!universes || state.universe <= 0.001) {
        el.style.opacity = "0";
        return;
      }
      const c = cubes[ci]!;
      cubeCenter(c, state, center);
      const h = halfSize(c, state);
      const y = center.y + h;
      // TL, TR, BR, BL on the top face, in the face's own basis (right -z, up -x).
      const pts: number[] = [];
      let behind = false;
      for (const [sx, sz] of [
        [-1, 1],
        [-1, -1],
        [1, -1],
        [1, 1],
      ] as const) {
        corner.set(center.x + sx * h, y, center.z + sz * h);
        view.copy(corner).applyMatrix4(cam.matrixWorldInverse);
        if (view.z > -cam.near) behind = true;
        corner.project(cam);
        pts.push(((corner.x + 1) / 2) * width, ((1 - corner.y) / 2) * height);
      }
      const area = (pts[2]! - pts[0]!) * (pts[5]! - pts[1]!) - (pts[4]! - pts[0]!) * (pts[3]! - pts[1]!);
      const m = behind || area < 1 ? null : quadMatrix(pts, faceSize, faceSize);
      if (!m) {
        el.style.opacity = "0";
        return;
      }
      el.style.transform = m;
      el.style.opacity = String(state.universe);
    });
  });

  return <mesh ref={mesh} geometry={field.geometry} material={material} frustumCulled={false} />;
}

function syncUniforms(m: ShaderMaterial, state: CubeState, t: number) {
  const u = m.uniforms;
  u.uIntro.value = state.intro;
  u.uSlide.value = state.slide;
  u.uFlatten.value = state.flatten;
  u.uUniverse.value = state.universe;
  u.uTime.value = t;
}

/** CPU ray-box test against the cubes where the shader puts them; returns a face instance or -1. */
function pick(cubes: Cube[], state: CubeState, cam: PerspectiveCamera, x: number, y: number) {
  ndc.set(x, y);
  raycaster.setFromCamera(ndc, cam);
  const { origin, direction } = raycaster.ray;
  invDir.set(1 / direction.x, 1 / direction.y, 1 / direction.z);
  let best = Infinity;
  let face = -1;
  cubes.forEach((c, ci) => {
    const h = halfSize(c, state);
    if (h < 0.05) return;
    cubeCenter(c, state, center);
    let tmin = -Infinity, tmax = Infinity, axis = 0, sign = 0;
    for (let a = 0; a < 3; a++) {
      const o = origin.getComponent(a), cc = center.getComponent(a), id = invDir.getComponent(a);
      let t1 = (cc - h - o) * id, t2 = (cc + h - o) * id;
      let s = -1;
      if (t1 > t2) {
        [t1, t2] = [t2, t1];
        s = 1;
      }
      if (t1 > tmin) {
        tmin = t1;
        axis = a;
        sign = s;
      }
      tmax = Math.min(tmax, t2);
    }
    if (tmax < Math.max(tmin, 0) || tmin >= best) return;
    best = tmin;
    const f = axis === 1 ? (sign > 0 ? FACE.top : -1) : axis === 0 ? (sign > 0 ? FACE.px : FACE.nx) : sign > 0 ? FACE.pz : FACE.nz;
    face = f < 0 ? -1 : ci * FACES_PER_CUBE + f;
  });
  return face;
}
