// Headless Chrome with WebGL (SwiftShader) plus a static server on the repo
// root, so render pages can import three from node_modules.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import puppeteer from "puppeteer-core";

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".ktx2": "image/ktx2",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function startServer(root, pages = {}) {
  const server = createServer((req, res) => {
    const route = new URL(req.url, "http://x").pathname;
    if (pages[route]) {
      res.writeHead(200, { "content-type": "text/html" }).end(pages[route]);
      return;
    }
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

export async function launch() {
  return puppeteer.launch({
    executablePath: process.env.CHROME ?? "/usr/local/bin/google-chrome",
    headless: true,
    userDataDir: `/tmp/headless-render-${process.pid}`,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--hide-scrollbars",
      // Present as a desktop mouse, so (hover: hover) and (pointer: fine) match.
      "--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4",
    ],
  });
}

export const importMap = (origin) =>
  `<script type="importmap">${JSON.stringify({
    imports: {
      three: `${origin}/node_modules/three/build/three.module.js`,
      "three/addons/": `${origin}/node_modules/three/examples/jsm/`,
    },
  })}</script>`;
