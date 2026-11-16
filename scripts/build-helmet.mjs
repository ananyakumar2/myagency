// Builds the placeholder racing helmet with Ananya's Jack Johns pipeline
// (decision 21): geometry → glTF, livery → KTX2 (Basis ETC1S via toktx),
// meshes → meshopt + quantisation (glTF-Transform). Then renders a poster in
// headless Chrome through the same loaders the site uses, which also proves
// the file decodes.
//
//   node scripts/build-helmet.mjs
//
// Her production helmet.glb can replace public/models/helmet.glb as long as
// its meshes keep the names shell / visor / trim (materials are set by name).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization, KHRTextureBasisu } from "@gltf-transform/extensions";
import { meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import * as THREE from "three";

import { importMap, launch, startServer } from "./lib/headless.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/models");
mkdirSync(outDir, { recursive: true });

/* ---------- geometry ---------- */

// One deformation for every part, so the visor and trim sit on the shell.
function deform(geo) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const front = Math.max(0, v.z);
    v.x *= 0.88;
    v.z *= 1.12;
    if (v.y > 0) v.y *= 0.95;
    // Chin bar: the lower front pushes forward and down.
    if (v.y < 0) v.z += -v.y * 0.3 * front * front;
    if (v.y < 0 && v.z > 0) v.y -= -v.y * 0.08 * front;
    // Neck: taper toward the opening, the back flares slightly.
    if (v.y < -0.45) {
      const k = (-v.y - 0.45) * 0.3;
      v.x *= 1 - k;
      v.z *= v.z > 0 ? 1 - k * 0.4 : 1 + k * 0.2;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const OPEN = Math.PI * 0.8;
const shell = deform(new THREE.SphereGeometry(1, 128, 80, 0, Math.PI * 2, 0, OPEN));
const liner = deform(new THREE.SphereGeometry(0.965, 64, 40, 0, Math.PI * 2, 0, OPEN));

// The visor: a squircle patch of a slightly larger sphere, so it sits proud
// of the shell with rounded corners.
function visorGeometry(n = 48) {
  const pos = [];
  const idx = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * 2 - 1;
      const b = (j / n) * 2 - 1;
      const m = Math.max(Math.abs(a), Math.abs(b));
      const sq = m === 0 ? 1 : m / Math.pow(Math.pow(Math.abs(a), 5) + Math.pow(Math.abs(b), 5), 1 / 5);
      const phi = Math.PI / 2 + a * sq * 1.0;
      const theta = Math.PI * 0.5 + b * sq * Math.PI * 0.1 * (1 - 0.12 * a * a);
      const r = 1.022;
      pos.push(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * (n + 1) + i;
      idx.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
const visor = deform(visorGeometry());
const rim = new THREE.TorusGeometry(Math.sin(OPEN), 0.045, 20, 144);
rim.rotateX(Math.PI / 2);
rim.translate(0, Math.cos(OPEN), 0);
const trim = deform(rim);

/* ---------- livery (equirectangular over the shell's UVs) ---------- */

function png(w, h, rgba) {
  const crc = (buf) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PAPER = hex("#efe8dc");
const LACQUER = hex("#843c38");
const SAFFRON = hex("#f5d5ab");
const SEA = hex("#006566");
const TW = 1024;
const TH = 512;
const tex = Buffer.alloc(TW * TH * 4);
for (let y = 0; y < TH; y++) {
  // glTF samples without a flip: image row 0 is the shell's rim, the last row its crown.
  const v = 1 - y / TH;
  for (let x = 0; x < TW; x++) {
    const u = x / TW;
    // Distance (in u) from the front and back meridians, narrowing toward the crown.
    const meridian = Math.min(Math.abs(u - 0.25), Math.abs(u - 0.75));
    const half = 0.035 + 0.05 * v;
    let c = PAPER;
    if (v < 0.62 && meridian < half) c = LACQUER;
    else if (v < 0.62 && meridian < half + 0.008) c = SAFFRON;
    else if (Math.abs(v - 0.72) < 0.018) c = LACQUER;
    else if (Math.abs(v - 0.75) < 0.005) c = SEA;
    const i = (y * TW + x) * 4;
    tex[i] = c[0];
    tex[i + 1] = c[1];
    tex[i + 2] = c[2];
    tex[i + 3] = 255;
  }
}
const work = join(tmpdir(), `helmet-${process.pid}`);
mkdirSync(work, { recursive: true });
writeFileSync(join(work, "livery.png"), png(TW, TH, tex));

const KTX = process.env.TOKTX ?? "/tmp/ktx/KTX-Software-4.4.2-Linux-x86_64/bin/toktx";
let liveryData;
let liveryMime = "image/ktx2";
if (existsSync(KTX)) {
  execFileSync(KTX, ["--t2", "--encode", "etc1s", "--clevel", "4", "--qlevel", "200", "--genmipmap", "--assign_oetf", "srgb", join(work, "livery.ktx2"), join(work, "livery.png")], {
    env: { ...process.env, LD_LIBRARY_PATH: join(dirname(KTX), "../lib") },
  });
  liveryData = readFileSync(join(work, "livery.ktx2"));
} else {
  console.warn("toktx not found: falling back to a PNG livery (set TOKTX to compress to KTX2)");
  liveryData = readFileSync(join(work, "livery.png"));
  liveryMime = "image/png";
}

/* ---------- glTF ---------- */

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene("helmet");
const liveryTex = doc.createTexture("livery").setImage(liveryData).setMimeType(liveryMime);
if (liveryMime === "image/ktx2") doc.createExtension(KHRTextureBasisu).setRequired(true);

const materials = {
  shell: doc.createMaterial("shell").setBaseColorTexture(liveryTex).setRoughnessFactor(0.35).setMetallicFactor(0),
  visor: doc.createMaterial("visor").setBaseColorFactor([0.08, 0.07, 0.07, 1]).setRoughnessFactor(0.05).setMetallicFactor(1),
  trim: doc.createMaterial("trim").setBaseColorFactor([0.03, 0.03, 0.03, 1]).setRoughnessFactor(0.8).setMetallicFactor(0),
};

function addMesh(name, geo, material) {
  const g = geo.index ? geo : geo;
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(g.attributes.position.array)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(g.attributes.normal.array)).setBuffer(buffer))
    .setMaterial(material);
  if (g.attributes.uv) prim.setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(g.attributes.uv.array)).setBuffer(buffer));
  if (g.index) prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(g.index.array)).setBuffer(buffer));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  scene.addChild(doc.createNode(name).setMesh(mesh));
}

addMesh("shell", shell, materials.shell);
addMesh("visor", visor, materials.visor);
addMesh("trim", trim, materials.trim);
addMesh("liner", liner, materials.trim);

await MeshoptEncoder.ready;
await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization, KHRTextureBasisu]).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const glb = await io.writeBinary(doc);
writeFileSync(join(outDir, "helmet.glb"), glb);
console.log(`helmet.glb ${(glb.byteLength / 1024).toFixed(1)} KB (livery ${(liveryData.byteLength / 1024).toFixed(1)} KB ${liveryMime})`);
rmSync(work, { recursive: true, force: true });

/* ---------- runtime transcoder + poster ---------- */

const basisOut = join(root, "public/basis");
mkdirSync(basisOut, { recursive: true });
for (const f of ["basis_transcoder.js", "basis_transcoder.wasm"]) copyFileSync(join(root, "node_modules/three/examples/jsm/libs/basis", f), join(basisOut, f));

const page = `<!doctype html><html><body style="margin:0;background:#f4f0e7">IMPORTS<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const W = 1200, H = 1200;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.AgXToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 50);
camera.position.set(2.6, 0.7, 4.2);
camera.lookAt(0, -0.05, 0);
const ktx2 = new KTX2Loader().setTranscoderPath("/public/basis/").detectSupport(renderer);
const loader = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.loadAsync("/public/models/helmet.glb");
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  if (o.name === "shell") o.material = new THREE.MeshPhysicalMaterial({ map: o.material.map, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
  if (o.name === "visor") o.material = new THREE.MeshPhysicalMaterial({ color: "#5a4632", metalness: 1, roughness: 0.05, iridescence: 0.55, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 420] });
  if (o.name === "liner") o.material = new THREE.MeshStandardMaterial({ color: "#14110e", roughness: 0.95, side: THREE.BackSide });
});
gltf.scene.rotation.y = 0.42;
scene.add(gltf.scene);
const key = new THREE.DirectionalLight("#fff3e2", 1.6); key.position.set(3, 4, 5); scene.add(key);
renderer.render(scene, camera);
window.poster = renderer.domElement.toDataURL("image/webp", 0.86);
</script></body></html>`;
const pages = {};
const { server, origin } = await startServer(root, pages);
pages["/__helmet.html"] = page.replace("IMPORTS", importMap(origin));
const browser = await launch();
const tab = await browser.newPage();
tab.on("pageerror", (e) => console.error("page:", e.message));
await tab.goto(`${origin}/__helmet.html`);
await tab.waitForFunction("window.poster", { timeout: 120000 });
const data = await tab.evaluate(() => window.poster);
writeFileSync(join(outDir, "helmet-poster.webp"), Buffer.from(data.split(",")[1], "base64"));
console.log("helmet-poster.webp written");
await browser.close();
server.close();
