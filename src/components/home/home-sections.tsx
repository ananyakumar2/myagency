import { Burst } from "@/components/interaction/burst/burst";
import { CurtainLink } from "@/components/interaction/transitions/curtain";
import { Magnetic } from "@/components/motion/magnetic";

const label = "font-mono text-xs tracking-wide uppercase";

export function WorkIntro() {
  return (
    <section aria-label="Work introduction" className="px-gutter pt-section pb-16">
      <div className="mx-auto grid max-w-page items-end gap-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <Burst kind="flip" text="Selected work" hover className={`${label} block text-fg-muted`} />
          <h2 data-mirror="text" className="relative mt-5 max-w-[16ch] text-4xl leading-tight font-medium tracking-tight">
            Four worlds, dealt one at a time.
          </h2>
        </div>
        <p data-mirror="text" className="relative max-w-[40ch] text-lg leading-snug text-fg-muted md:col-span-5">
          Keep scrolling: each project lands on the pile with its live site running on a laptop and a phone. Try the laptop,
          or click a sheet to open it.
        </p>
      </div>
    </section>
  );
}

const SERVICES = [
  ["Websites as worlds", "Sites built around one idea, with motion and interaction carrying it from the first screen to the last."],
  ["3D and real-time", "Product models, scenes and frame sequences that load fast and hold 60 fps on the machines your clients use."],
  ["Brand in motion", "Marks, type and colour systems designed to move, so the brand behaves the same on every surface."],
  ["Launch and care", "Performance budgets, analytics and a studio that stays on after go-live to keep it sharp."],
] as const;

export function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="px-gutter py-section">
      <div className="mx-auto grid max-w-page gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Burst kind="whip" text="Services" hover className={`${label} block text-fg-muted`} />
          <h2 id="services-title" data-mirror="text" className="relative mt-5 max-w-[12ch] text-3xl leading-tight font-medium tracking-tight">
            What we make, start to finish.
          </h2>
        </div>
        <ol className="md:col-span-8">
          {SERVICES.map(([name, line], i) => (
            <li key={name} className="border-t border-border last:border-b">
              <a
                href="#contact"
                data-press=""
                data-cursor-label="Ask us"
                className="group grid grid-cols-12 items-baseline gap-4 py-7 transition-colors duration-(--duration-fast) hover:bg-surface"
              >
                <span data-mirror="text" className={`relative col-span-2 ${label} text-fg-muted md:col-span-1`}>
                  0{i + 1}
                </span>
                <span data-mirror="text" className="relative col-span-10 text-2xl font-medium tracking-tight md:col-span-5">
                  {name}
                </span>
                <span data-mirror="text" className="relative col-span-12 max-w-[44ch] leading-snug text-fg-muted md:col-span-6">
                  {line}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FACTS = [
  ["Based in", "Dubai · Abu Dhabi"],
  ["Working with", "Clients across the Gulf and Europe"],
  ["Team", "Designers and engineers, one room"],
  ["Since", "Placeholder year"],
] as const;

export function Studio() {
  return (
    <section id="studio" aria-labelledby="studio-title" className="px-gutter py-section">
      <div className="mx-auto grid max-w-page gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Burst kind="spin" text="Studio" hover className={`${label} block text-fg-muted`} />
        </div>
        <div className="md:col-span-8">
          <h2 id="studio-title" data-mirror="text" className="relative max-w-[22ch] text-4xl leading-tight font-medium tracking-tight">
            Small on purpose. Every project gets the people who designed it, all the way to launch.
          </h2>
          <dl className="mt-16 grid gap-px overflow-hidden rounded-md bg-border sm:grid-cols-2">
            {FACTS.map(([k, v]) => (
              <div key={k} data-mirror="block" className="relative bg-bg p-6">
                <dt data-mirror="text" className={`relative ${label} text-fg-muted`}>
                  {k}
                </dt>
                <dd data-mirror="text" className="relative mt-3 text-xl font-medium tracking-tight">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ContactFooter() {
  return (
    <footer id="contact" data-mirror="block" className="relative bg-signature px-gutter pt-section pb-10 text-ink">
      <div className="mx-auto max-w-page">
        <Burst kind="glitch" hover className={`${label} block`}>
          Contact
        </Burst>
        <h2 data-mirror="text" className="relative mt-6 max-w-[14ch] text-display leading-[0.95] font-medium tracking-tight">
          Have a world in mind?
        </h2>
        <div className="mt-14 flex flex-wrap items-center gap-6">
          <Magnetic strength={0.25}>
            <a
              href="mailto:hello@placeholder.studio"
              data-press=""
              data-cursor-label="Write to us"
              className="inline-flex h-16 items-center rounded-full bg-ink px-10 text-base font-medium text-paper"
            >
              hello@placeholder.studio
            </a>
          </Magnetic>
          <Magnetic>
            <a href="tel:+971000000000" data-press="" data-cursor-label="Call" className="inline-flex h-16 items-center px-4 text-base font-medium">
              +971 00 000 0000
            </a>
          </Magnetic>
        </div>

        <div className={`mt-section grid gap-8 border-t border-ink/20 pt-8 md:grid-cols-12 ${label}`}>
          <p data-mirror="text" className="relative md:col-span-4">
            © 2026 Placeholder Studio
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-6 md:col-span-5">
            <a href="#work" data-press="">
              Work
            </a>
            <a href="#services" data-press="">
              Services
            </a>
            <a href="#studio" data-press="">
              Studio
            </a>
            <CurtainLink href="/lab" curtainTitle="Lab" data-press="">
              Lab
            </CurtainLink>
          </nav>
          <div className="flex gap-6 md:col-span-3 md:justify-end">
            <a href="#" aria-label="Instagram (placeholder)" data-press="">
              Instagram
            </a>
            <a href="#" aria-label="LinkedIn (placeholder)" data-press="">
              LinkedIn
            </a>
            <a href="#top" data-press="" data-cursor-label="Top">
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
