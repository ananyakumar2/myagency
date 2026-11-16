import Link from "next/link";

import { PageTransition } from "@/components/motion/page-transition";

import { DeckStageShowcase } from "./deck-stage-showcase";
import type { StageMode } from "./project-stage";

export const DECK_VARIANTS: { n: number; mode: StageMode; name: string; idea: string; detail: string }[] = [
  {
    n: 1,
    mode: "loops",
    name: "Loops on the desk",
    idea: "Each sheet sets a laptop and a phone on a stone surface under window light; both play recordings of the site's best sections, constantly.",
    detail:
      "Scroll loops of the live sites, desktop and mobile. Posters show first; a video only loads and plays while its sheet is on top and on screen.",
  },
  {
    n: 2,
    mode: "play",
    name: "The site, playable",
    idea: "The laptop runs each site's own interaction under your pointer: turn Jack Johns' helmet, hold to rev Mission, form Welth's galaxy, scroll Gridmasters.",
    detail:
      "Captured from the real sites frame by frame, so it's their motion, not an imitation. The phone holds the mobile site still beside it.",
  },
  {
    n: 3,
    mode: "play-then-loops",
    name: "Try it, then watch",
    idea: "The sheet opens on the interaction. Once you've tried it, the screens hand over to the recorded loops, laptop and phone together.",
    detail: "The interaction teaches that these are live sites; the loops then show the rest without asking for more.",
  },
];

export function DeckVariantPage({ n }: { n: number }) {
  const v = DECK_VARIANTS.find((d) => d.n === n)!;
  return (
    <PageTransition>
      <div>
        <header className="mx-auto grid min-h-[60svh] max-w-page content-end gap-10 px-gutter pt-32 pb-16 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
              The Deck · device stage · variant {n} of {DECK_VARIANTS.length}
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-medium tracking-tight">{v.name}</h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-snug">{v.idea}</p>
          </div>
          <p className="border-t border-border pt-3 text-sm leading-snug md:col-span-5">{v.detail}</p>
        </header>

        <DeckStageShowcase mode={v.mode} />

        <footer className="mx-auto max-w-page px-gutter py-section">
          <DeckVariantNav current={n} />
        </footer>
      </div>
    </PageTransition>
  );
}

export function DeckVariantNav({ current }: { current?: number }) {
  return (
    <nav aria-label="Deck variants">
      <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
        {DECK_VARIANTS.map((d) => (
          <li key={d.n} className="bg-bg">
            <Link
              href={`/lab/deck/${d.n}`}
              aria-current={d.n === current ? "page" : undefined}
              className="block h-full p-5 aria-[current=page]:bg-surface"
            >
              <span className="font-mono text-xs text-fg-muted">0{d.n}</span>
              <span className="mt-2 block text-xl font-medium tracking-tight">{d.name}</span>
              <span className="mt-2 block text-sm leading-snug text-fg-muted">{d.idea}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
