"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AgXToneMapping,
  BackSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  type Group,
  type Mesh,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

import { helmetTuning } from "@/lib/interaction/config";
import { pointer, startPointer } from "@/lib/interaction/pointer";

const DPR_KEY = "helmet:dpr";

/** Jack Johns' governor: a pixel budget caps the ratio, slow frames step it down, the result is kept for a day. */
function initialDpr() {
  const p = helmetTuning.params;
  try {
    const saved = JSON.parse(localStorage.getItem(DPR_KEY) ?? "null") as { v: number; t: number } | null;
    if (saved && Date.now() - saved.t < 864e5) return saved.v;
  } catch {
    /* storage blocked */
  }
  const css = window.innerWidth * window.innerHeight * 0.6;
  const budget = Math.sqrt((p.budgetMP * 1e6) / Math.max(css, 1));
  return Math.max(p.dprMin, Math.min(window.devicePixelRatio || 1, p.dprMax, budget));
}

export default function HelmetScene({ src, active, onReady, onSlow }: { src: string; active: boolean; onReady: () => void; onSlow: () => void }) {
  const [dpr, setDpr] = useState(initialDpr);
  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "demand" : "never"}
      camera={{ position: [0, 0.15, 5.2], fov: 26 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = AgXToneMapping;
      }}
    >
      <directionalLight position={[3, 4, 5]} intensity={1.6} color="#fff3e2" />
      <directionalLight position={[-4, 1, -3]} intensity={0.7} color="#ffcbc5" />
      <Model src={src} onReady={onReady} />
      <Governor dpr={dpr} setDpr={setDpr} onSlow={onSlow} />
    </Canvas>
  );
}

function Model({ src, onReady }: { src: string; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const group = useRef<Group>(null);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });
  const gltf = useLoader(GLTFLoader, src, (loader) => {
    loader.setKTX2Loader(new KTX2Loader().setTranscoderPath("/basis/").detectSupport(gl));
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  useMemo(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const map = (mesh.material as MeshStandardMaterial).map as Texture | null;
      if (mesh.name === "shell") mesh.material = new MeshPhysicalMaterial({ map, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
      // Chrome visor with a thin-film tint, in place of Jack Johns' custom visor shader.
      if (mesh.name === "visor")
        mesh.material = new MeshPhysicalMaterial({ color: "#5a4632", metalness: 1, roughness: 0.05, iridescence: 0.55, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 420] });
      if (mesh.name === "liner") mesh.material = new MeshStandardMaterial({ color: "#14110e", roughness: 0.95, side: BackSide });
    });
  }, [gltf]);

  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    gl.toneMappingExposure = helmetTuning.params.exposure;
    invalidate();
    const id = requestAnimationFrame(() => ready.current());
    const unsub = helmetTuning.subscribe(() => {
      gl.toneMappingExposure = helmetTuning.params.exposure;
      invalidate();
    });
    return () => {
      cancelAnimationFrame(id);
      unsub();
      env.dispose();
      pmrem.dispose();
    };
  }, [get, invalidate]);

  // Springs toward the cursor; render on demand, sleeping once they settle.
  const state = useRef({ ry: 0, vry: 0, rx: 0, vrx: 0, s: 1, vs: 0 });
  useEffect(() => {
    const stop = startPointer();
    const wake = () => invalidate();
    window.addEventListener("pointermove", wake, { passive: true });
    return () => {
      stop();
      window.removeEventListener("pointermove", wake);
    };
  }, [invalidate]);

  useFrame((three, delta) => {
    const g = group.current;
    if (!g) return;
    const p = helmetTuning.params;
    const dt = Math.min(delta, 1 / 30);
    const rect = three.gl.domElement.getBoundingClientRect();
    const nx = pointer.active ? Math.max(-1.5, Math.min(1.5, (pointer.x - (rect.left + rect.width / 2)) / (rect.width / 2))) : 0;
    const ny = pointer.active ? Math.max(-1.5, Math.min(1.5, (pointer.y - (rect.top + rect.height / 2)) / (rect.height / 2))) : 0;
    const over = pointer.active && Math.abs(nx) < 1 && Math.abs(ny) < 1;
    const s = state.current;
    const spring = (x: number, v: number, target: number, k = 60, c = 11) => {
      const nv = v + (k * (target - x) - c * v) * dt;
      return [x + nv * dt, nv] as const;
    };
    const deg = Math.PI / 180;
    [s.ry, s.vry] = spring(s.ry, s.vry, 0.42 + nx * p.turn * deg);
    [s.rx, s.vrx] = spring(s.rx, s.vrx, ny * p.lean * deg);
    [s.s, s.vs] = spring(s.s, s.vs, over ? 1 + p.lift : 1, 90, 14);
    g.rotation.set(s.rx, s.ry, 0);
    g.scale.setScalar(s.s * Math.min(1, size.width / size.height / 0.8));
    const moving = Math.abs(s.vry) + Math.abs(s.vrx) + Math.abs(s.vs) > 1e-4;
    if (moving) three.invalidate();
  });

  return (
    <group ref={group} rotation={[0, 0.42, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function Governor({ dpr, setDpr, onSlow }: { dpr: number; setDpr: (v: number) => void; onSlow: () => void }) {
  const samples = useRef<number[]>([]);
  const last = useRef(0);
  useFrame(() => {
    const now = performance.now();
    const gap = now - last.current;
    last.current = now;
    // Only consecutive frames count: render-on-demand leaves long idle gaps.
    if (gap <= 0 || gap > 120) return;
    samples.current.push(gap);
    if (samples.current.length < 40) return;
    const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
    samples.current.length = 0;
    if (avg <= 20) return;
    const p = helmetTuning.params;
    if (dpr - 0.25 >= p.dprMin) {
      const next = dpr - 0.25;
      setDpr(next);
      try {
        localStorage.setItem(DPR_KEY, JSON.stringify({ v: next, t: Date.now() }));
      } catch {
        /* storage blocked */
      }
    } else {
      onSlow();
    }
  });
  return null;
}
