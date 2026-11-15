import type { Metadata } from "next";

import { PageTransition, TransitionLink } from "@/components/motion/page-transition";
import { ParallaxMedia } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { SplitReveal } from "@/components/motion/split-reveal";
import { PlaceholderMedia } from "@/components/site/placeholder-media";

export const metadata: Metadata = { title: "Work" };

export default function WorkPage() {
  return (
    <PageTransition>
      <article className="px-gutter pt-40 pb-section">
        <div className="mx-auto max-w-page">
          <Reveal variant="fade" className="font-mono text-xs tracking-wide text-fg-muted uppercase">
            Case study — placeholder
          </Reveal>
          <SplitReveal as="h1" className="mt-6 max-w-[16ch] text-4xl leading-tight font-medium tracking-tight">
            A second route to demonstrate page transitions.
          </SplitReveal>
          <Reveal variant="clip" className="mt-16">
            <ParallaxMedia aspect="16 / 9" amount={8} className="rounded-md">
              <PlaceholderMedia label="Hero image" tone={2} />
            </ParallaxMedia>
          </Reveal>
          <Reveal variant="up" className="mt-16 max-w-[60ch] text-lg text-fg-muted">
            <p>
              Navigating here from the home page plays a forward transition; the link below plays the reverse.
              The header is excluded from the transition so it stays anchored.
            </p>
          </Reveal>
          <TransitionLink href="/" direction="back" className="mt-12 inline-block text-sm underline underline-offset-4">
            ← Back home
          </TransitionLink>
        </div>
      </article>
    </PageTransition>
  );
}
