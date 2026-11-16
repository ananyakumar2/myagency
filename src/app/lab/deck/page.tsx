import type { Metadata } from "next";

import { PageTransition } from "@/components/motion/page-transition";
import { DeckVariantNav } from "@/components/showcase/deck/deck-variants";

export const metadata: Metadata = { title: "The Deck — device stage variants" };

export default function DeckIndex() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-page px-gutter pt-40 pb-section">
        <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Lab · work showcase · the Deck</p>
        <h1 className="mt-4 max-w-[24ch] text-4xl leading-tight font-medium tracking-tight">
          Each project, alive on a laptop and a phone.
        </h1>
        <p className="mt-6 max-w-[60ch] text-lg leading-snug text-fg-muted">
          Recorded from the live sites. Videos load only for the sheet on top, start from a poster, and pause off
          screen; touch devices and reduced motion get the posters.
        </p>
        <div className="mt-16">
          <DeckVariantNav />
        </div>
      </div>
    </PageTransition>
  );
}
