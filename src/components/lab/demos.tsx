"use client";

import { useRef, useState, type ReactNode } from "react";

import { Burst, type BurstHandle } from "@/components/interaction/burst/burst";
import { Helmet } from "@/components/interaction/helmet/helmet";
import { LetterPush } from "@/components/interaction/letter-push";
import { MirrorImage } from "@/components/interaction/mirror/mirror-image";
import { MirrorRoot } from "@/components/interaction/mirror/mirror-root";
import { shockAt } from "@/components/interaction/mirror/bus";
import { SpringField } from "@/components/interaction/sections/spring-field";
import { Torch } from "@/components/interaction/sections/torch";
import { FrameSequence } from "@/components/interaction/sequence/frame-sequence";
import { playSound, type SoundName } from "@/components/interaction/sound/sound";
import { SoundToggle } from "@/components/interaction/sound/sound-toggle";
import { CurtainLink } from "@/components/interaction/transitions/curtain";
import { InkReveal } from "@/components/interaction/transitions/ink-reveal";
import { ShockLink } from "@/components/interaction/transitions/project-link";
import { Sheet } from "@/components/interaction/transitions/sheet";
import { HomeHero } from "@/components/site/home-hero";
import { WORK } from "@/lib/work/projects";

import { MirrorReadout } from "./mirror-readout";

const label = "font-mono text-xs tracking-wide text-fg-muted uppercase";

export function LabDemo({ slug }: { slug: string }) {
  switch (slug) {
    case "bend":
    case "lens":
      return (
        <>
          <MirrorRoot ignoreRetreats>
            <MirrorSpecimen />
          </MirrorRoot>
          <MirrorReadout />
        </>
      );
    case "shockwave":
      return <ShockDemo />;
    case "cursor":
      return <CursorDemo />;
    case "letters":
      return <LettersDemo />;
    case "bursts":
      return <BurstsDemo />;
    case "loader":
      return <LoaderDemo />;
    case "sound":
      return <SoundDemo />;
    case "press":
      return <PressDemo />;
    case "transitions":
      return <TransitionsDemo />;
    case "sequence":
      return <FrameSequence manifest="/seq/demo/manifest.json" poster="/seq/demo/land/000.webp" alt="Placeholder car, turning from three-quarter to rear view" />;
    case "helmet":
      return (
        <Torch className="px-gutter py-16">
          <Helmet className="mx-auto aspect-square w-full max-w-[44rem]" />
        </Torch>
      );
    case "springs":
      return <SpringsDemo />;
    case "torch":
      return (
        <Torch className="grid min-h-[90svh] content-center gap-6 px-gutter py-24">
          <p className={`${label} text-(--color-fg-muted)`}>Deep section</p>
          <p className="max-w-[18ch] text-4xl leading-[1.05] font-medium tracking-tight">A warm light follows the cursor here, and only here.</p>
        </Torch>
      );
    case "colour":
      return <ColourDemo />;
    default:
      return null;
  }
}

function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`px-gutter py-16 ${className}`}>{children}</section>;
}

/** Mirrored text, images and blocks, long enough to scroll at speed. */
function MirrorSpecimen() {
  return (
    <div className="space-y-24 px-gutter pt-12 pb-[40vh]">
      <div className="grid gap-6 md:grid-cols-12">
        <p data-mirror="text" className="text-4xl leading-[0.95] font-medium tracking-tight md:col-span-8 md:text-display">
          Everything here is drawn by one WebGL canvas.
        </p>
        <p data-mirror="text" className="self-end text-fg-muted md:col-span-4">
          Text and images are mirrored into a texture, so the bend, the lens and the shockwave move them together, the way Auge&apos;s pages do.
        </p>
      </div>
      {WORK.map((p, i) => (
        <div key={p.slug} className="grid items-end gap-6 md:grid-cols-12">
          <MirrorImage src={p.hero.src} alt={p.hero.alt} className={`aspect-[16/10] md:col-span-7 ${i % 2 ? "md:order-2" : ""}`} radius={6} />
          <div data-mirror="block" className="rounded-md bg-surface p-6 md:col-span-5">
            <p data-mirror="text" className={label}>
              0{i + 1} — {p.sector}
            </p>
            <p data-mirror="text" className="mt-3 text-3xl font-medium tracking-tight">
              {p.name}
            </p>
            <p data-mirror="text" className="mt-3 text-sm text-fg-muted">
              {p.line}
            </p>
          </div>
        </div>
      ))}
      <p data-mirror="text" className="text-[18vw] leading-none font-medium tracking-tighter">
        Bend.
      </p>
    </div>
  );
}

function ShockDemo() {
  return (
    <>
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) return;
          if (shockAt(e.clientX, e.clientY)) playSound("click");
        }}
      >
        <MirrorRoot ignoreRetreats>
          <div className="px-gutter pt-12">
            <p data-mirror="text" className="max-w-[20ch] text-4xl font-medium tracking-tight">
              Click anywhere. The cards below wait for the ring before they open.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {WORK.slice(0, 3).map((p) => (
                <ShockLink key={p.slug} href={`/work/${p.slug}`} transition="project" data-cursor-label="View" data-cursor-color={p.deep} className="block">
                  <div data-mirror="block" className="rounded-md bg-surface p-3">
                    <MirrorImage src={p.hero.src} alt={p.name} className="aspect-[16/10]" radius={4} />
                    <p data-mirror="text" className="mt-3 text-lg font-medium">
                      {p.name}
                    </p>
                  </div>
                </ShockLink>
              ))}
            </div>
          </div>
          <MirrorSpecimen />
        </MirrorRoot>
      </div>
      <MirrorReadout />
    </>
  );
}

function CursorDemo() {
  const [opened, setOpened] = useState(false);
  return (
    <>
      <Section>
        <div className="grid gap-4 md:grid-cols-4">
          <Tile cursor="View">Label “View”</Tile>
          <Tile cursor="Drag" color="#006566">
            Sea deep pill
          </Tile>
          <Tile cursor="Read case" color="#843c38">
            Lacquer deep pill
          </Tile>
          <button
            type="button"
            data-cursor="hover"
            data-cursor-label={opened ? "Open" : "Centre"}
            onClick={() => setOpened((o) => !o)}
            className="grid aspect-[4/3] place-items-center rounded-md bg-saffron text-saffron-deep"
          >
            Click: label switches under a still pointer
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <a href="#trail" className="underline underline-offset-4">
            A link (diamond shrinks away)
          </a>
          <button type="button" data-press="" className="rounded-full bg-ink px-5 py-2 text-paper">
            A button
          </button>
        </div>
      </Section>
      <section id="trail" data-theme="deep" data-cursor-section="trail" className="grid min-h-[70svh] place-items-center bg-bg px-gutter text-fg">
        <p className="max-w-[24ch] text-center text-3xl font-medium tracking-tight">Move fast here: faint marks drop behind the cursor and fade within a second.</p>
      </section>
    </>
  );
}

function Tile({ children, cursor, color }: { children: ReactNode; cursor: string; color?: string }) {
  return (
    <div data-cursor-label={cursor} data-cursor-color={color} className="grid aspect-[4/3] place-items-center rounded-md bg-surface text-center text-sm">
      {children}
    </div>
  );
}

function LettersDemo() {
  return (
    <Section className="space-y-10">
      <h2 className="text-[11vw] leading-[0.9] font-medium tracking-tighter">
        <LetterPush text="Studio®" />
      </h2>
      <p className="max-w-[18ch] text-display leading-[1.02] font-medium tracking-tight">
        <LetterPush text="Quiet motion for considered brands." />
      </p>
    </Section>
  );
}

type BurstProps = React.ComponentProps<typeof Burst>;

const word = "text-4xl font-medium tracking-tight";

const BURSTS: { title: string; props: BurstProps }[] = [
  { title: "Scramble (Grail's label shuffle)", props: { kind: "scramble", phrases: ["Interaction-led design", "Dubai · Abu Dhabi", "Placeholder studio"], className: "text-3xl font-medium" } },
  { title: "Flip (letters turn over and settle)", props: { kind: "flip", text: "Considered", className: word } },
  { title: "Whip (fast lateral smear, slow settle)", props: { kind: "whip", text: "Momentum", className: word } },
  { title: "Whip and flip", props: { kind: "whipflip", text: "Arrival", className: word } },
  { title: "Band glitch (Auge's logo)", props: { kind: "glitch", className: word, children: "Studio®" } },
  {
    title: "Spin (fast, then a long slow tail)",
    props: {
      kind: "spin",
      children: (
        <svg viewBox="0 0 40 40" className="size-14 text-signature-deep" aria-hidden>
          <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="currentColor" />
        </svg>
      ),
    },
  },
];

function BurstsDemo() {
  const refs = useRef<(BurstHandle | null)[]>([]);
  return (
    <Section>
      <p className="mb-10 max-w-[48ch] text-fg-muted">They also fire on their own: one at a time, on a jittered rhythm, only while visible and never during scrolling.</p>
      <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
        {BURSTS.map((b, i) => (
          <div key={b.props.kind} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={label}>{b.title}</p>
              <button type="button" data-press="" onClick={() => refs.current[i]?.fire()} className="rounded-full border border-line px-3 py-1 text-xs">
                Fire
              </button>
            </div>
            <div className="flex min-h-24 items-center">
              <Burst
                {...b.props}
                ref={(h) => {
                  refs.current[i] = h;
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function LoaderDemo() {
  // The loader only runs on a full page load, so replays reload the page.
  const go = (q: string) => {
    history.replaceState(null, "", `${location.pathname}?${q}`);
    location.reload();
  };
  return (
    <Section className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <LabButton onClick={() => go("loader=full")}>Replay full loader</LabButton>
        <LabButton onClick={() => go("loader=short")}>Replay short loader</LabButton>
        <LabButton onClick={() => go("loader=full&slow=7")}>Slow network (7 s gate)</LabButton>
        <LabButton onClick={() => go("loader=none")}>No loader</LabButton>
      </div>
      <ul className="max-w-[60ch] list-disc space-y-2 pl-5 text-sm text-fg-muted">
        <li>Gate: fonts, first-screen images and video, and anything a page registers, each capped; 10 s overall.</li>
        <li>Full once per 24 hours for visitors arriving from outside; otherwise the 1 s short version. Reduced motion skips it.</li>
        <li>No number. The level climbs to a random park point, then on a slow network beats: the next field colour wipes up and the mark glitches.</li>
        <li>The window grows into the first screen; the page&apos;s entrance starts while it is still opening.</li>
        <li>The mark is a placeholder until the studio name is chosen.</li>
      </ul>
    </Section>
  );
}

const SOUNDS: SoundName[] = ["hover", "click", "whoosh", "scramble", "step", "toggle"];

function SoundDemo() {
  return (
    <Section className="space-y-8">
      <SoundToggle className="rounded-full border border-line" />
      <div className="flex flex-wrap gap-3">
        {SOUNDS.map((s) => (
          <LabButton key={s} onClick={() => playSound(s)} sound="off">
            {s}
          </LabButton>
        ))}
      </div>
      <p className="max-w-[56ch] text-sm text-fg-muted">
        Placeholders generated from noise and sine bursts, all under 0.8 s. Every link and button on the site already ticks on hover and clicks on press when sound is on; route changes whoosh.
      </p>
    </Section>
  );
}

function PressDemo() {
  return (
    <Section className="flex flex-wrap items-start gap-6">
      <button type="button" data-press="" className="rounded-full bg-ink px-6 py-3 text-paper">
        Primary
      </button>
      <button type="button" data-press="" className="rounded-full border border-ink px-6 py-3">
        Secondary
      </button>
      <div data-press="" data-cursor="hover" className="w-64 rounded-md bg-surface p-3">
        <MirrorImage src="/placeholder/origin-wide.webp" alt="" className="aspect-[16/10]" radius={4} />
        <p className="mt-3 text-sm font-medium">Card</p>
      </div>
    </Section>
  );
}

function TransitionsDemo() {
  const next = WORK[1]!;
  return (
    <>
      <Section className="space-y-6">
        <p className="max-w-[56ch] text-fg-muted">The curtain rises in the destination&apos;s field colour with its title scrambling in, then lifts away. Try it both ways:</p>
        <div className="flex flex-wrap gap-3">
          <CurtainLink href="/work" curtainTitle="Work" className="rounded-full bg-ink px-5 py-2.5 text-paper" data-press="">
            Curtain to Work (signature)
          </CurtainLink>
          <CurtainLink href={`/work/${next.slug}`} curtainTitle={next.name} curtainColor={next.field} className="rounded-full border border-ink px-5 py-2.5" data-press="">
            Curtain to {next.name} (its field colour)
          </CurtainLink>
        </div>
        <p className="text-sm text-fg-muted">From the Work index, a card&apos;s image morphs into the case study&apos;s hero.</p>
      </Section>
      <Sheet side="left" className="min-h-[80svh] px-gutter py-16">
        <p className={label}>Sheet, tilted from the left</p>
        <p className="mt-4 max-w-[20ch] text-4xl font-medium tracking-tight">Sections slide up like sheets laid on a table, a few degrees off true.</p>
      </Sheet>
      <InkReveal color={next.field} className="min-h-[90svh]">
        <div className="grid min-h-[90svh] content-center px-gutter">
          <p className="max-w-[18ch] text-4xl leading-[1.05] font-medium tracking-tight">Ink spreads from the corner, then the words settle in.</p>
        </div>
      </InkReveal>
      <Sheet side="right" className="min-h-[60svh] px-gutter py-16">
        <p className={label}>Sheet, tilted from the right</p>
      </Sheet>
    </>
  );
}

function SpringsDemo() {
  return (
    <section data-theme="sea" className="bg-bg px-gutter py-24 text-fg">
      <SpringField className="grid grid-cols-3 gap-6 md:gap-12">
        {["#a8e9e8", "#f5d5ab", "#ffcbc5"].map((c, i) => (
          <div key={c} data-spring="" className="aspect-[3/4] rounded-t-full shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]" style={{ background: `linear-gradient(160deg, ${c}, color-mix(in oklab, ${c}, #000 ${18 + i * 4}%))` }} />
        ))}
      </SpringField>
    </section>
  );
}

const THEMES = ["paper", "saffron", "sea", "lacquer", "deep"] as const;

function ColourDemo() {
  return (
    <>
      <div className="relative">
        <HomeHero />
      </div>
      <Section>
        <p className={`${label} mb-6`}>Field themes: one per screen, with paper rests between</p>
        <div className="grid gap-4 md:grid-cols-5">
          {THEMES.map((t) => (
            <div key={t} data-theme={t} className="flex aspect-[3/4] flex-col justify-between rounded-md bg-bg p-4 text-fg">
              <span className="font-mono text-xs uppercase">{t}</span>
              <span className="text-2xl font-medium tracking-tight">Aa</span>
              <span className="text-xs text-fg-muted">{t === "deep" ? "Kept for where it earns its place" : "Body text keeps AA contrast"}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[60ch] text-sm text-fg-muted">
          The signature switch in the panel changes the accent used by the curtain, the loader level and the signature CTA across the site. Gold is a material only (the helmet trim), never a fill.
        </p>
      </Section>
    </>
  );
}

function LabButton({ children, onClick, sound }: { children: ReactNode; onClick: () => void; sound?: "off" }) {
  return (
    <button type="button" data-press="" data-sound={sound} onClick={onClick} className="rounded-full border border-line bg-paper px-4 py-2 text-sm">
      {children}
    </button>
  );
}
