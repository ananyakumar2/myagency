# myagency

The studio site: Next.js (App Router, TypeScript), Tailwind v4 tokens, Lenis + GSAP ScrollTrigger, React Three Fiber, and an interaction system built on a WebGL mirror of the page. Brand content (studio name, projects, sounds) is placeholder until it is chosen.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
npm run lint
npm run typecheck
```

Every effect has a lab page at `/lab` with live tuning. Values set in a lab persist in that browser (`localStorage["tune:<name>"]`) and apply across the whole site; "Copy" gives the changed values as JSON to fold back into `src/lib/interaction/config.ts`. Labs also take `?loader=full|short|none` and `?slow=<seconds>` to replay the loader or simulate a slow network.

## Where things live

| Path | What |
| --- | --- |
| `src/styles/tokens.css` | **All brand tokens**: palette (paper, ink, saffron, sea, lacquer and their deep partners), `[data-theme]` field themes, fonts, fluid type scale, spacing, radii, easing curves, durations. Each becomes a CSS variable and a Tailwind utility. GSAP reads the same easing curves at runtime. |
| `src/lib/interaction/` | `config.ts` (every tunable default, one `defineTuning` set per effect), `tuning.ts`, the shared `pointer`, device rules in `capability.ts`, and the loader's `readiness` gate. |
| `src/components/interaction/mirror/` | The Auge-style mirror: text, images and blocks inside `<MirrorRoot>` marked `data-mirror="text|image|block"` are drawn by one fixed WebGL2 canvas, so the scroll bend, cursor lens and click shockwave move the whole page. `MirrorImage` adds per-image bends, zoom, frame sequences and 3D-transformed cards (`projected`) on the same canvas. |
| `src/components/interaction/cursor/` | The difference-blend diamond follower, label pill (`data-cursor-label`, `data-cursor-color`) and section trails (`data-cursor-section="trail"`). |
| `src/components/interaction/burst/` | Idle bursts (scramble, flip, whip, band glitch, spin) on one shared scheduler. |
| `src/components/interaction/loader/` | The loader: head script choosing full, short or none; readiness gate; slow-network beat; window handoff into the first screen. |
| `src/components/interaction/transitions/` | Route curtain (`CurtainLink`), project links that wait for the shockwave (`ShockLink`), shared-element morph (`SharedMedia`), tilted `Sheet`s and the `InkReveal`. |
| `src/components/interaction/sequence/` | `FrameSequence`: scroll-scrubbed pre-rendered frames under a WebGL heat haze (Ananya's Mission Motorsport method). |
| `src/components/interaction/helmet/` | `Helmet`: KTX2 + meshopt GLB with AgX, cursor springs, render-on-demand and a pixel-ratio governor (her Jack Johns method). |
| `src/components/interaction/sections/` | One quiet response per section: `Torch` (deep sections) and `SpringField` (Agrumea springs). |
| `src/components/interaction/sound/` | Off-by-default sound with a toggle; delegated hover and click sounds. |
| `src/components/lab/`, `src/app/lab/` | Lab pages and the tuning panel. |
| `src/lib/work/projects.ts`, `src/app/work/` | Placeholder projects, the work index and case-study pages. |
| `src/components/motion/`, `src/components/three/` | Foundation primitives (`Reveal`, `SplitReveal`, `Parallax`, `HorizontalScroll`, `PinnedSteps`, `Magnetic`, `PageTransition`) and the hero canvas. |
| `scripts/` | Asset builds: `render-sequence.mjs` (frame sets and tip positions), `build-helmet.mjs` (GLB with KTX2 livery and poster), `make-placeholders.py`, `make-sounds.sh`. Renders use headless Chrome with SwiftShader (`scripts/lib/headless.mjs`). |

## Motion rules of thumb

- Reduced motion gets static, fully visible content: no Lenis, no mirror, no follower, no bursts, no loader.
- Phones and coarse pointers get no bend, lens, shockwave, follower or sound, static images in place of heavy WebGL, and the short loader.
- The mirror watches its own frame times and fades back to the DOM if a device can't keep up; after two retreats it stays off for the session.
- The 3D helmet runs only at 50 fps or better (it steps its pixel ratio down first), otherwise the poster stays.
- Content that reveals on scroll starts at `opacity: 0` only when JS is running and motion is allowed (`html.js`), so there is no layout shift and nothing is hidden from no-JS visitors.
