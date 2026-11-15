"use client";

import { Float, MeshDistortMaterial, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, type RefObject } from "react";
import { MathUtils, type Group, type Mesh } from "three";

import type { GpuTier } from "@/hooks/use-gpu-tier";

export type SceneInputs = {
  /** 0–1 progress of the hero scrolling out of view. */
  scroll: number;
  /** Normalised window pointer, -1..1. Stays 0 on "lite". */
  pointer: { x: number; y: number };
};

type SceneProps = {
  tier: Exclude<GpuTier, "static">;
  inputs: RefObject<SceneInputs>;
  /** False while off-screen: the render loop stops entirely. */
  active: boolean;
  onReady: () => void;
};

export default function Scene({ tier, inputs, active, onReady }: SceneProps) {
  const full = tier === "full";
  const [dpr, setDpr] = useState(full ? 1.75 : 1.25);

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{ antialias: full, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => requestAnimationFrame(onReady)}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.8} />
      <Placeholder inputs={inputs} detail={full ? 48 : 20} />
    </Canvas>
  );
}

function Placeholder({ inputs, detail }: { inputs: RefObject<SceneInputs>; detail: number }) {
  const group = useRef<Group>(null);
  const blob = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  // MeshDistortMaterial exposes `distort` on its material instance.
  const material = useRef<{ distort: number } | null>(null);
  // Fit the ring (diameter ~3.8 units) inside narrow/portrait viewports.
  const viewport = useThree((s) => s.viewport);
  const fit = Math.min(1, viewport.width / 4.4, viewport.height / 4.2);

  useFrame((state, delta) => {
    const { scroll, pointer } = inputs.current;
    const g = group.current;
    if (!g || !blob.current || !ring.current) return;

    g.rotation.y = MathUtils.damp(g.rotation.y, pointer.x * 0.35 + scroll * Math.PI * 0.6, 2.5, delta);
    g.rotation.x = MathUtils.damp(g.rotation.x, -pointer.y * 0.25 + scroll * 0.4, 2.5, delta);
    g.position.y = MathUtils.damp(g.position.y, scroll * 1.6, 6, delta);
    const s = fit * (1 - scroll * 0.25);
    g.scale.setScalar(MathUtils.damp(g.scale.x, s, 6, delta));

    blob.current.rotation.z += delta * 0.04;
    ring.current.rotation.z = state.clock.elapsedTime * 0.06 + scroll * 2;
    if (material.current) {
      material.current.distort = MathUtils.damp(material.current.distort, 0.22 + scroll * 0.2, 2, delta);
    }
  });

  return (
    <group ref={group}>
      <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.4}>
        <mesh ref={blob}>
          <icosahedronGeometry args={[1.15, detail]} />
          <MeshDistortMaterial
            ref={material as never}
            color="#9a9a96"
            roughness={0.25}
            metalness={0.15}
            distort={0.22}
            speed={0.8}
          />
        </mesh>
        <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.9, 0.012, 16, 160]} />
          <meshStandardMaterial color="#141414" roughness={0.4} />
        </mesh>
      </Float>
    </group>
  );
}
