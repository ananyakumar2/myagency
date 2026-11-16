// Pre-renders the placeholder frame sequence for the scroll-scrubbed chapter
// (decision 24, Ananya's Mission Motorsport method): a camera move from the
// side of a race car's tail to dead behind it, rendered into four frame sets
// (landscape and portrait, full and low), with each frame's exhaust tip
// positions written to the manifest so the haze shader knows where to rise.
//
//   node scripts/render-sequence.mjs          # writes public/seq/demo/
//
// Swap in real renders by keeping the manifest shape: frames, sets, tips.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { importMap, launch, startServer } from "./lib/headless.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/seq/demo");
const FRAMES = 48;
const SETS = {
  land: { w: 1440, h: 810, fov: 30 },
  "land-low": { w: 960, h: 540, fov: 30 },
  port: { w: 810, h: 1200, fov: 50 },
  "port-low": { w: 540, h: 800, fov: 50 },
};

const scene = `
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const DEEP = new THREE.Color("#201111");
let renderer, scene, camera;
const TIPS = [new THREE.Vector3(-0.36, 0.42, -1.24), new THREE.Vector3(0.36, 0.42, -1.24)];

window.setup = (w, h, fov) => {
  renderer?.dispose();
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  document.body.replaceChildren(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.background = DEEP;
  scene.fog = new THREE.Fog(DEEP, 7, 16);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;
  camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 50);

  const paint = new THREE.MeshPhysicalMaterial({ color: "#843c38", roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
  const carbon = new THREE.MeshStandardMaterial({ color: "#151212", roughness: 0.55, metalness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#0d0b0b", roughness: 0.9 });
  const titanium = new THREE.MeshStandardMaterial({ color: "#c9b79e", roughness: 0.22, metalness: 1 });
  const soot = new THREE.MeshStandardMaterial({ color: "#050404", roughness: 1 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); scene.add(m); return m;
  };
  add(new RoundedBoxGeometry(2.24, 0.46, 3.1, 4, 0.1), paint, 0, 0.6, 0.35);
  add(new RoundedBoxGeometry(1.86, 0.18, 1.6, 4, 0.08), paint, 0, 0.88, -0.2);
  const canopy = add(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: "#120c0c", roughness: 0.05, metalness: 0.5, clearcoat: 1 }), 0, 0.96, 0.55);
  canopy.scale.set(0.62, 0.3, 0.95);
  add(new THREE.BoxGeometry(1.9, 0.035, 0.02), new THREE.MeshStandardMaterial({ color: "#ffcbc5", emissive: "#ff8f86", emissiveIntensity: 2.4 }), 0, 0.72, -1.205);
  add(new THREE.BoxGeometry(2.36, 0.03, 0.34), carbon, 0, 1.36, -0.98, -0.06);
  add(new THREE.BoxGeometry(2.36, 0.02, 0.12), carbon, 0, 1.43, -1.1, -0.35);
  for (const x of [-1.19, 1.19]) add(new THREE.BoxGeometry(0.025, 0.22, 0.42), carbon, x, 1.32, -0.98);
  for (const x of [-0.42, 0.42]) add(new THREE.BoxGeometry(0.035, 0.42, 0.12), carbon, x, 1.12, -0.92, 0.12);
  add(new THREE.BoxGeometry(2.0, 0.04, 0.5), carbon, 0, 0.2, -1.0, 0.24);
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.018, 0.16, 0.46), carbon, -0.84 + i * 0.28, 0.25, -1.02, 0.24);
  for (const [x, z] of [[-1.1, 1.3], [1.1, 1.3], [-1.12, -0.6], [1.12, -0.6]]) {
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.34, 64), rubber, x, 0.34, z, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.35, 32), titanium, x, 0.34, z, 0, 0, Math.PI / 2);
  }
  for (const tip of TIPS) {
    add(new THREE.CylinderGeometry(0.1, 0.09, 0.5, 48, 1, true), titanium, tip.x, tip.y, tip.z + 0.25, Math.PI / 2);
    add(new THREE.TorusGeometry(0.096, 0.012, 12, 48), titanium, tip.x, tip.y, tip.z);
    add(new THREE.CircleGeometry(0.092, 32), soot, tip.x, tip.y, tip.z + 0.06, 0, Math.PI);
  }
  const groundMat = new THREE.MeshStandardMaterial({ color: "#1a0f0e", roughness: 0.62, metalness: 0, envMap: envTex, envMapIntensity: 0.06 });
  add(new THREE.PlaneGeometry(60, 60), groundMat, 0, 0, 0, -Math.PI / 2);
  const key = new THREE.DirectionalLight("#fff1dc", 1.1); key.position.set(3, 7, 4); scene.add(key);
  const rim = new THREE.SpotLight("#f5d5ab", 90, 16, 0.45, 0.8); rim.position.set(-2.2, 3.2, -6); rim.target.position.set(0, 0.6, -1); scene.add(rim, rim.target);
  const side = new THREE.DirectionalLight("#ffe7cf", 0.6); side.position.set(6, 1.5, 2); scene.add(side);
  const fill = new THREE.PointLight("#ffcbc5", 4, 6); fill.position.set(1.8, 0.8, -3); scene.add(fill);
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
window.frame = (i, n, mime) => {
  const t = ease(i / (n - 1));
  const az = THREE.MathUtils.degToRad(72 + (180 - 72) * t);
  const radius = 6.8 - 1.6 * t;
  const height = 1.75 - 0.55 * t;
  const target = new THREE.Vector3(0, 0.7 - 0.1 * t, -0.1 - 0.8 * t);
  camera.position.set(Math.sin(az) * radius, height, Math.cos(az) * radius);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  renderer.render(scene, camera);
  const tips = TIPS.map((p) => {
    const s = p.clone().project(camera);
    const edge = p.clone().add(new THREE.Vector3(0, 0.1, 0)).project(camera);
    const toCam = camera.position.clone().sub(p).normalize();
    const facing = toCam.dot(new THREE.Vector3(0, 0, -1));
    const vis = Math.min(1, Math.max(0, (facing - 0.05) / 0.5));
    return [+(s.x * 0.5 + 0.5).toFixed(4), +(0.5 - s.y * 0.5).toFixed(4), +Math.abs((edge.y - s.y) * 0.5).toFixed(4), +vis.toFixed(3)];
  });
  return { data: renderer.domElement.toDataURL(mime, 0.8), tips };
};
window.ready = true;
`;

const pages = {};
const { server, origin } = await startServer(root, pages);
pages["/__render.html"] = `<!doctype html><html><body style="margin:0;background:#000">${importMap(origin)}<script type="module">${scene}</script></body></html>`;
const browser = await launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page:", e.message));
page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await page.goto(`${origin}/__render.html`);
await page.waitForFunction("window.ready === true", { timeout: 60000 });

const manifest = { frames: FRAMES, format: "webp", sets: {}, tips: {} };
for (const [name, s] of Object.entries(SETS)) {
  mkdirSync(join(out, name), { recursive: true });
  await page.evaluate((w, h, fov) => window.setup(w, h, fov), s.w, s.h, s.fov);
  const tips = [];
  for (let i = 0; i < FRAMES; i++) {
    const r = await page.evaluate((i, n) => window.frame(i, n, "image/webp"), i, FRAMES);
    writeFileSync(join(out, name, `${String(i).padStart(3, "0")}.webp`), Buffer.from(r.data.split(",")[1], "base64"));
    tips.push(r.tips);
  }
  manifest.sets[name] = { w: s.w, h: s.h, path: `/seq/demo/${name}/` };
  if (!name.endsWith("-low")) manifest.tips[name] = tips;
  console.log(`rendered ${name}`);
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest));
await browser.close();
server.close();
