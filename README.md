# myagency

Technical foundation for the studio site: Next.js (App Router, TypeScript), Tailwind v4 tokens, Lenis + GSAP ScrollTrigger, React Three Fiber. Styling is intentionally neutral until the brand kit exists.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
npm run lint
npm run typecheck
```

## Where things live

| Path | What |
| --- | --- |
| `src/styles/tokens.css` | **All brand tokens**: colors, fonts, fluid type scale, spacing, radii, easing curves, durations. Each becomes a CSS variable and a Tailwind utility (`text-fg`, `text-display`, `px-gutter`, `ease-out`…). GSAP reads the same easing curves at runtime. |
| `src/lib/motion/` | GSAP plugin registration, token-driven eases (`ease("out")`, `duration("reveal")`), shared media queries. |
| `src/components/providers/smooth-scroll.tsx` | Lenis on GSAP's ticker, synced to ScrollTrigger; resets and re-measures on route change. |
| `src/components/motion/` | Primitives: `Reveal`, `SplitReveal`, `Parallax`, `ParallaxMedia`, `HorizontalScroll`, `PinnedSteps`, `Magnetic`, `Cursor`, `PageTransition` / `TransitionLink`. |
| `src/components/three/` | `HeroCanvas` (lazy, capability-gated, static fallback) and the placeholder `scene`. |
| `src/app/page.tsx` | Demo page exercising every primitive. `/work` exists to demo page transitions. |

## Motion rules of thumb

- Every primitive registers its animation inside `gsap.matchMedia()`, so `prefers-reduced-motion: reduce` gets static, fully visible content (no Lenis, no 3D, no custom cursor, instant page swaps).
- Content that reveals on scroll starts at `opacity: 0` only when JS is running and motion is allowed (`html.js`), so there is no layout shift and nothing is hidden from no-JS visitors.
- Use `immediate` on above-the-fold reveals, and `lcp` on the hero headline (below 768px it uses a CSS fade instead of the JS split so LCP doesn't wait for hydration).
- Pinned sections only pin at ≥768px. On mobile the horizontal track becomes a native snap carousel and pinned steps stack.
- The custom cursor and magnetic hover only run for fine pointers. Opt elements in with `data-cursor="hover" | "view"` or `data-cursor-label="View"`.
- 3D tiers (`useGpuTier`): `full` (desktop: pointer-reactive, DPR up to 1.75), `lite` (touch or ≤4 cores: lower DPR and geometry, no pointer tracking), `static` (reduced motion, Save-Data, no WebGL, ≤2 cores or ≤2 GB memory). The scene loads after page load and idle, and stops rendering off-screen.
