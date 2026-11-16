// Deterministic desktop capture of /lab/cubes. Time is virtual: rAF,
// performance.now and Date.now only move when the script advances them, so
// every frame of the mp4 is exactly 1/30 s apart however slow the renderer.
//
//   node scripts/record-cubes.mjs <words|universes|snap|stills> [out] [origin]
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { launch } from "./lib/headless.mjs";

const [kind = "stills", out = `/tmp/cube-${kind}.mp4`, origin = "http://localhost:3100"] = process.argv.slice(2);
const FPS = 30;
const W = 1600;
const H = 900;

const QUERIES = {
  words: "mode=words&snap=off&words=worlds",
  universes: "mode=universes&snap=off&words=universes",
  snap: "mode=words&snap=steps&words=worlds",
  stills: process.env.Q ?? "mode=universes&snap=off&words=worlds",
};

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  let now = 0;
  const epoch = Date.now();
  let id = 0;
  const callbacks = new Map();
  performance.now = () => now;
  Date.now = () => epoch + now;
  window.requestAnimationFrame = (cb) => {
    callbacks.set(++id, cb);
    return id;
  };
  window.cancelAnimationFrame = (n) => callbacks.delete(n);
  window.__advance = (ms) => {
    now += ms;
    const due = [...callbacks.values()];
    callbacks.clear();
    for (const cb of due) {
      try {
        cb(now);
      } catch (err) {
        console.error(err);
      }
    }
  };
});
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warn") console.log(`[page ${m.type()}]`, m.text().slice(0, 3000));
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto(`${origin}/lab/cubes?loader=none&${QUERIES[kind]}`, { waitUntil: "networkidle0", timeout: 180000 });
await new Promise((r) => setTimeout(r, 4000));

const step = 1000 / FPS;
const advance = (ms = step) => page.evaluate((v) => window.__advance(v), ms);
// A few unrecorded frames so the canvases and the mirror exist before frame 0.
for (let i = 0; i < 3; i++) await advance(1);
await new Promise((r) => setTimeout(r, 1500));
await page.mouse.move(W * 0.62, H * 0.45);

const dir = `/tmp/cube-frames-${kind}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
let frame = 0;
let tSec = 0;

async function shoot() {
  await page.screenshot({ path: join(dir, `${String(frame++).padStart(5, "0")}.jpg`), type: "jpeg", quality: 90 });
}

/** One recorded frame: optional wheel, a drifting pointer, then advance. */
async function tick({ wheel = 0, record = true } = {}) {
  const x = W * (0.55 + 0.18 * Math.sin(tSec * 0.6));
  const y = H * (0.48 + 0.14 * Math.sin(tSec * 0.9 + 1));
  await page.mouse.move(x, y);
  if (wheel) await page.mouse.wheel({ deltaY: wheel });
  await advance();
  tSec += 1 / FPS;
  if (record) await shoot();
}

const hold = async (sec) => {
  for (let i = 0; i < Math.round(sec * FPS); i++) await tick();
};
const scrollFor = async (sec, px) => {
  const n = Math.round(sec * FPS);
  for (let i = 0; i < n; i++) await tick({ wheel: px / n });
};
const scrollable = await page.evaluate(() => document.querySelector("section").offsetHeight - innerHeight);

if (kind === "stills") {
  const stops = [0, 0.3, 0.5, 0.68, 0.85, 1];
  let at = 0;
  for (let i = 0; i < 80; i++) await tick({ record: false });
  for (const p of stops) {
    const target = p * scrollable;
    await tick({ wheel: target - at, record: false });
    at = target;
    for (let i = 0; i < 120; i++) await tick({ record: false });
    await page.screenshot({ path: `/tmp/cube-still-${p}.jpg`, type: "jpeg", quality: 85 });
  }
  console.log(`stills written for ${scrollable}px`);
} else if (kind === "snap") {
  await hold(2.6);
  // Short flicks; the page glides on to the next resting state.
  for (const px of [260, 420, 520]) {
    await scrollFor(0.3, px);
    await hold(3);
  }
  await scrollFor(0.3, -300);
  await hold(3.2);
} else {
  await hold(2.6);
  await scrollFor(15, scrollable);
  await hold(1.8);
}

await browser.close();

if (kind !== "stills") {
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", join(dir, "%05d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  console.log(`${out}: ${frame} frames`);
}
