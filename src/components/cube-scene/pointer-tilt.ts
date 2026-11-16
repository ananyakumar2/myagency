import * as THREE from "three";

import { gsap } from "@/lib/motion/gsap";

import { POINTER_TILT } from "./constants";

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const axis = new THREE.Vector3();
const yaw = new THREE.Quaternion();
const pitch = new THREE.Quaternion();
const turn = new THREE.Quaternion();

/** Pointer position in -1..1, eased toward with 1 - e^(-4·dt). Desktop only. */
export function createPointerTilt() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let last = 0;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch" || window.innerWidth < POINTER_TILT.minWidth) return;
    targetX = THREE.MathUtils.clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
    targetY = THREE.MathUtils.clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
  };
  const reset = () => {
    targetX = 0;
    targetY = 0;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("mouseleave", reset);
  window.addEventListener("blur", reset);

  return {
    update(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      const off = reduced.matches || window.innerWidth < POINTER_TILT.minWidth;
      const k = 1 - Math.exp(-POINTER_TILT.response * dt);
      x += ((off ? 0 : targetX) - x) * k;
      y += ((off ? 0 : targetY) - y) * k;
      return { x, y };
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", reset);
      window.removeEventListener("blur", reset);
    },
  };
}

/** 0..1 weight that fades the tilt out once the orbit completes. */
export function createTiltWeight(duration: number = POINTER_TILT.weightFade) {
  const state = { value: 1 };
  let enabled = true;
  let tween: gsap.core.Tween | null = null;
  return {
    get value() {
      return state.value;
    },
    setEnabled(next: boolean) {
      if (enabled === next) return;
      enabled = next;
      tween?.kill();
      tween = gsap.to(state, { value: next ? 1 : 0, duration, ease: "power2.out", overwrite: true });
    },
    dispose() {
      tween?.kill();
      tween = null;
    },
  };
}

/** Swings the camera around its target: yaw about world up, pitch about the camera's own x axis. */
export function applyTilt(camera: THREE.Camera, target: THREE.Vector3, tx: number, ty: number) {
  if (Math.abs(tx) < 1e-4 && Math.abs(ty) < 1e-4) {
    camera.updateMatrixWorld();
    return;
  }
  yaw.setFromAxisAngle(WORLD_UP, -tx * THREE.MathUtils.degToRad(POINTER_TILT.yawDeg));
  axis.set(1, 0, 0).applyQuaternion(camera.quaternion);
  pitch.setFromAxisAngle(axis, -ty * THREE.MathUtils.degToRad(POINTER_TILT.pitchDeg));
  turn.copy(yaw).multiply(pitch);
  camera.position.sub(target).applyQuaternion(turn).add(target);
  camera.quaternion.premultiply(turn);
  camera.updateMatrixWorld();
}
