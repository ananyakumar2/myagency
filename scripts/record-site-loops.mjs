// Placeholder "universe" loops for /lab/cubes: a slow scroll down a live
// site, captured as small webp frames.
//   WELTH_URL=<welth site> node scripts/record-site-loops.mjs
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { launch } from "./lib/headless.mjs";

const SITES = [
  { slug: "gridmasters", url: "https://gridmasters.ae/" },
  { slug: "welth", url: process.env.WELTH_URL },
];
const FRAMES = 60;
const STEP = 36;
const OUT = join(process.cwd(), "public/lab/cubes");

const browser = await launch();
for (const site of SITES.filter((s) => s.url)) {
  const dir = join(OUT, site.slug);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 0.5 });
  await page.goto(site.url, { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));
  await page.mouse.move(640, 400);
  for (let i = 0; i < FRAMES; i++) {
    await page.screenshot({ path: join(dir, `${String(i).padStart(3, "0")}.webp`), type: "webp", quality: 72 });
    await page.mouse.wheel({ deltaY: STEP });
    await new Promise((r) => setTimeout(r, 90));
  }
  await page.close();
  console.log(`${site.slug}: ${FRAMES} frames`);
}
await browser.close();
