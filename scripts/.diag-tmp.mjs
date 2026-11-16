import { launch } from "./lib/headless.mjs";
const browser = await launch();
for (const [w, h, route] of [[1280, 800, "/work"], [1280, 800, "/lab/bend"], [1280, 800, "/work/torque"]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  page.on("console", (m) => m.type() === "warn" || m.type() === "warning" ? console.log("warn", m.text()) : null);
  await page.goto("http://127.0.0.1:3100" + route, { waitUntil: "networkidle2" });
  await page.mouse.move(600, 400);
  await new Promise((r) => setTimeout(r, 3000));
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
  const mirror = await page.evaluate(() => document.documentElement.classList.contains("mirror-on"));
  console.log(route, w, h, "rAF fps", fps, "mirror", mirror);
  await page.close();
}
await browser.close();
