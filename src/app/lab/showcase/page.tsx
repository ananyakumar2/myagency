import type { Metadata } from "next";

import { PageTransition } from "@/components/motion/page-transition";
import { DeckVariantNav } from "@/components/showcase/deck/deck-variants";
import { OptionNav } from "@/components/showcase/lab-shell";

export const metadata: Metadata = { title: "Work showcase options" };

export default function ShowcaseIndex() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-page px-gutter pt-40 pb-section">
        <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Lab · home page work section</p>
        <h1 className="mt-4 max-w-[20ch] text-4xl leading-tight font-medium tracking-tight">
          Four ways to show four projects.
        </h1>
        <p className="mt-6 max-w-[60ch] text-lg leading-snug text-fg-muted">
          Each option uses the real imagery from Gridmasters, Welth, Jack Johns and Mission Motorsport. All of them
          bow with scroll speed, and in all of them the first click centres a project and the second opens it.
        </p>
        <div className="mt-16">
          <OptionNav />
        </div>
        <section className="mt-24">
          <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Chosen: the Deck</p>
          <h2 className="mt-4 max-w-[28ch] text-2xl leading-tight font-medium tracking-tight">
            Each sheet with the project alive on a laptop and a phone — three ways.
          </h2>
          <div className="mt-8">
            <DeckVariantNav />
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
