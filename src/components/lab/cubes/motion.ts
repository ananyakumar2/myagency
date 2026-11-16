import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";

import { CUBE, HALF, type Cube } from "./config";

/** Written by the intro tween and the scroll timeline, read every frame. */
export type CubeState = {
  intro: number;
  slide: number;
  swing: number;
  roll: number;
  flatten: number;
  universe: number;
};

export const createState = (): CubeState => ({ intro: 0, slide: 0, swing: 0, roll: 0, flatten: 0, universe: 0 });

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

/*
 * Per-cube motion. The vertex shader repeats these lines exactly (see
 * shader.ts) so the CPU hover test and the universe faces land on the
 * pixels the GPU draws.
 */
export function cubeScale(c: Cube, s: CubeState) {
  const delay = c.ring * 0.09 + c.k * 0.05 + c.hash * 0.12;
  return cubicOut(clamp01((s.intro * 1.7 - delay) / 0.75));
}

export function cubeCenter(c: Cube, s: CubeState, out: Vector3) {
  const scale = cubeScale(c, s);
  const levelT = cubicOut(clamp01(s.slide * 1.6 - c.k * 0.15));
  const dir = c.k % 2 === 0 ? 1 : -1;
  const slideX = c.k === 0 ? 0 : dir * 1.2 * (1 - levelT);
  const flatT = smooth(clamp01(s.flatten * 1.5 - (4 - c.ring) * 0.1));
  const sink = (c.colH - 1) * flatT;
  const rise = (1 - scale) * -0.6;
  return out.set(c.i - HALF + slideX, c.k + 0.5 - sink + rise, c.j - HALF);
}

export const halfSize = (c: Cube, s: CubeState) => (CUBE / 2) * cubeScale(c, s);

const DEG = Math.PI / 180;
const euler = new Euler(0, 0, 0, "YXZ");
const quat = new Quaternion();
const offset = new Vector3();

export type Tilt = { yaw: number; pitch: number };

/** The camera: swing about y while rising, a roll mid-way, then straight down. */
export function placeCamera(cam: PerspectiveCamera, s: CubeState, tilt: Tilt) {
  const sw = smooth(s.swing);
  const f = smooth(s.flatten);
  const aspect = cam.aspect || 1.6;
  const az = (-50 + 140 * sw) * DEG + tilt.yaw * (1 - f * 0.6);
  const elOblique = (30 + 22 * sw) * DEG;
  const el = elOblique + (89.5 * DEG - elOblique) * f + tilt.pitch * (1 - f * 0.6);
  const roll = -20 * DEG * s.roll;
  const far = 44 * Math.max(1, 1.5 / aspect);
  const near = 25 * Math.max(1, 1.4 / aspect);
  const dist = far + (near - far) * f;
  const ty = 1.6 + (0.5 - 1.6) * f;

  euler.set(-el, az, roll);
  quat.setFromEuler(euler);
  offset.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
  cam.position.set(offset.x, ty + offset.y, offset.z);
  cam.quaternion.copy(quat);
  cam.updateMatrixWorld();
}
