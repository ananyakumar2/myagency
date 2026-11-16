import { Magnetic } from "@/components/motion/magnetic";
import { PageTransition, TransitionLink } from "@/components/motion/page-transition";
import { Parallax, ParallaxMedia } from "@/components/motion/parallax";
import { HorizontalScroll, PinnedSteps } from "@/components/motion/pinned";
import { Reveal } from "@/components/motion/reveal";
import { SplitReveal } from "@/components/motion/split-reveal";
import { HomeHero } from "@/components/site/home-hero";
import { PlaceholderMedia } from "@/components/site/placeholder-media";

const label = "font-mono text-xs tracking-wide text-fg-muted uppercase";

const projects = [
  { name: "Maritime", sector: "Yachting" },
  { name: "Altitude", sector: "Private aviation" },
  { name: "Torque", sector: "Automotive" },
  { name: "Skyline", sector: "Real estate" },
  { name: "Origin", sector: "Specialty coffee" },
];

export default function Home() {
  return (
    <PageTransition>
      {/* 1. Hero: colour-cycling field, letter push, scramble bursts, 3D canvas, curtain CTA */}
      <HomeHero />

      {/* 2. Scroll-triggered reveal: staggered fade/translate */}
      <section className="px-gutter py-section">
        <div className="mx-auto max-w-page">
          <Reveal variant="fade" className={`${label} mb-12`}>
            01 — Reveal / stagger
          </Reveal>
          <Reveal stagger={0.15} className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
            {["Strategy", "Design", "Engineering"].map((title, i) => (
              <div key={title} className="flex min-h-72 flex-col justify-between bg-bg p-8">
                <span className={label}>0{i + 1}</span>
                <div>
                  <h2 className="text-2xl font-medium tracking-tight">{title}</h2>
                  <p className="mt-3 max-w-[32ch] text-fg-muted">
                    Placeholder copy describing the capability in a sentence or two.
                  </p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 3. Scrubbed word reveal */}
      <section className="px-gutter py-section">
        <div className="mx-auto max-w-page">
          <Reveal variant="fade" className={`${label} mb-12`}>
            02 — Text scrub
          </Reveal>
          <SplitReveal mode="words-scrub" className="max-w-[24ch] text-3xl leading-snug font-medium tracking-tight">
            Every detail is placeholder for now. This paragraph brightens word by word as you scroll, tied
            directly to scroll position rather than time.
          </SplitReveal>
        </div>
      </section>

      {/* 4. Parallax media gallery: layers at different speeds */}
      <section className="overflow-hidden px-gutter py-section">
        <div className="mx-auto max-w-page">
          <Reveal variant="fade" className={`${label} mb-12`}>
            03 — Parallax layers
          </Reveal>
          <div className="grid grid-cols-12 gap-4 md:gap-6">
            <Parallax speed={-0.15} className="col-span-7 md:col-span-5">
              <ParallaxMedia aspect="4 / 5" className="rounded-md">
                <PlaceholderMedia label="Image 01" tone={0} />
              </ParallaxMedia>
            </Parallax>
            <Parallax speed={0.25} className="col-span-5 mt-24 md:col-span-3 md:mt-40">
              <ParallaxMedia aspect="3 / 4" className="rounded-md">
                <PlaceholderMedia label="Image 02" tone={2} />
              </ParallaxMedia>
            </Parallax>
            <Parallax speed={0.08} className="col-span-12 md:col-span-4 md:mt-12">
              <ParallaxMedia aspect="1 / 1" className="rounded-md">
                <PlaceholderMedia label="Image 03" tone={1} />
              </ParallaxMedia>
              <p className="mt-4 max-w-[34ch] text-sm text-fg-muted">
                Frames drift inside their masks while the frames themselves move at different speeds.
              </p>
            </Parallax>
          </div>
        </div>
      </section>

      {/* 5. Pinned horizontal scroll */}
      <HorizontalScroll
        header={
          <div className="mx-auto mb-12 w-full max-w-page px-gutter">
            <p className={label}>04 — Pinned horizontal</p>
            <h2 className="mt-4 text-4xl font-medium tracking-tight">Selected work</h2>
          </div>
        }
        trackClassName="gap-4 px-gutter md:gap-6"
      >
        {projects.map((p, i) => (
          <TransitionLink
            key={p.name}
            href="/work"
            data-cursor-label="View"
            className="group block w-[78vw] md:w-[38vw]"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-md">
              <div className="size-full transition-transform duration-(--duration-slow) ease-out group-hover:scale-[1.03]">
                <PlaceholderMedia label={`Case 0${i + 1}`} tone={i} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <h3 className="text-xl font-medium tracking-tight">{p.name}</h3>
              <span className={label}>{p.sector}</span>
            </div>
          </TransitionLink>
        ))}
      </HorizontalScroll>

      {/* 6. Pinned steps */}
      <PinnedSteps
        aside={
          <div>
            <p className={label}>05 — Pinned steps</p>
            <h2 className="mt-4 max-w-[12ch] text-4xl font-medium tracking-tight">How we work</h2>
          </div>
        }
      >
        {[
          ["Discover", "Placeholder: understanding the brand, audience and ambition."],
          ["Define", "Placeholder: a clear creative and technical direction."],
          ["Craft", "Placeholder: design and motion developed in parallel."],
          ["Launch", "Placeholder: performance-tuned, measured, refined."],
        ].map(([title, body], i) => (
          <div key={title}>
            <span className={label}>Step 0{i + 1}</span>
            <h3 className="mt-6 text-3xl font-medium tracking-tight">{title}</h3>
            <p className="mt-4 max-w-[36ch] text-fg-muted">{body}</p>
          </div>
        ))}
      </PinnedSteps>

      {/* 7. Contact: magnetic CTA + page transition link */}
      <section id="contact" className="px-gutter py-section">
        <div className="mx-auto flex max-w-page flex-col items-start gap-12">
          <SplitReveal as="h2" className="max-w-[16ch] text-4xl leading-tight font-medium tracking-tight">
            Have something exceptional in mind?
          </SplitReveal>
          <div className="flex flex-wrap items-center gap-6">
            <Magnetic strength={0.25}>
              <a
                href="mailto:hello@example.com"
                className="inline-flex size-40 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-fg"
              >
                Get in touch
              </a>
            </Magnetic>
            <TransitionLink href="/work" className="text-sm underline underline-offset-4">
              See the page transition →
            </TransitionLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-gutter py-8">
        <div className={`mx-auto flex max-w-page justify-between ${label}`}>
          <span>© Placeholder</span>
          <span>Dubai · Abu Dhabi</span>
        </div>
      </footer>
    </PageTransition>
  );
}
