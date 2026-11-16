import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Helmet } from "@/components/interaction/helmet/helmet";
import { MirrorImage } from "@/components/interaction/mirror/mirror-image";
import { MirrorRoot } from "@/components/interaction/mirror/mirror-root";
import { SpringField } from "@/components/interaction/sections/spring-field";
import { Torch } from "@/components/interaction/sections/torch";
import { FrameSequence } from "@/components/interaction/sequence/frame-sequence";
import { CurtainLink } from "@/components/interaction/transitions/curtain";
import { InkReveal } from "@/components/interaction/transitions/ink-reveal";
import { SharedMedia, ShockLink } from "@/components/interaction/transitions/project-link";
import { Sheet } from "@/components/interaction/transitions/sheet";
import { PageTransition } from "@/components/motion/page-transition";
import { getProject, nextProject, WORK, type WorkProject } from "@/lib/work/projects";

export function generateStaticParams() {
  return WORK.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getProject(slug)?.name ?? "Work" };
}

const label = "font-mono text-xs tracking-wide uppercase";

export default async function CaseStudy({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const next = nextProject(slug);

  return (
    <PageTransition>
      <MirrorRoot>
        <header data-cursor-section="trail" className="px-gutter pt-36 pb-16">
          <div className="mx-auto max-w-page">
            <p data-mirror="text" className={`${label} text-fg-muted`}>
              {project.sector} — {project.place}
            </p>
            <h1 data-mirror="text" className="mt-6 text-display leading-none font-medium tracking-tight">
              {project.name}
            </h1>
            <p data-mirror="text" className="mt-6 max-w-[40ch] text-xl text-fg-muted">
              {project.line}
            </p>
            <SharedMedia slug={project.slug}>
              <MirrorImage src={project.hero.src} alt={project.hero.alt} radius={6} priority sizes="100vw" className="mt-14 aspect-[16/10]" />
            </SharedMedia>
          </div>
        </header>

        <Sheet side="left" className="z-(--z-content) px-gutter py-section">
          <div className="mx-auto grid max-w-page gap-12 md:grid-cols-[1fr_2fr]">
            <p className={`${label} text-fg-muted`}>01 — Brief</p>
            <div>
              <p className="max-w-[44ch] text-2xl leading-snug tracking-tight">
                Placeholder brief. One paragraph on what the client needed, what was in the way, and the single idea that
                carried the work.
              </p>
              <dl className="mt-12 grid grid-cols-2 gap-8 text-sm md:grid-cols-3">
                {[
                  ["Role", "Design, motion, build"],
                  ["Sector", project.sector],
                  ["Year", "Placeholder"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-fg-muted">{k}</dt>
                    <dd className="mt-1">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Sheet>

        <InkReveal color={project.field} deep={project.deep} className="relative z-(--z-content) min-h-svh">
          <div className="flex min-h-svh items-center px-gutter">
            <p className="mx-auto max-w-page text-display leading-tight font-medium tracking-tight" style={{ color: project.deep }}>
              One idea, carried all the way through.
            </p>
          </div>
        </InkReveal>

        <Chapter project={project} />

        <Sheet side="right" className="z-(--z-content) px-gutter py-section">
          <div className="mx-auto max-w-page">
            <p className={`${label} text-fg-muted`}>Next project</p>
            <CurtainLink
              href={`/work/${next.slug}`}
              curtainTitle={next.name}
              curtainColor={next.field}
              data-cursor-label="Next"
              data-cursor-color={next.deep}
              className="mt-6 block text-display leading-none font-medium tracking-tight"
            >
              {next.name} →
            </CurtainLink>
            <ShockLink href="/work" className="mt-12 inline-block text-sm underline underline-offset-4">
              All work
            </ShockLink>
          </div>
        </Sheet>
      </MirrorRoot>
    </PageTransition>
  );
}

/** The deep ground only where it earns its place: the 3D chapters. */
function Chapter({ project }: { project: WorkProject }) {
  if (project.chapter === "sequence")
    return (
      <FrameSequence
        manifest="/seq/demo/manifest.json"
        poster="/seq/demo/land/000.webp"
        alt="Placeholder render: the camera swings from the side of the car to behind its exhausts"
        className="z-(--z-content)"
      >
        <div className="flex h-full flex-col justify-between px-gutter pt-28 pb-12">
          <p className={`${label} text-fg-muted`}>02 — Frame sequence · scroll to scrub, hold to rev</p>
          <p className="max-w-[24ch] text-3xl leading-tight tracking-tight">Pre-rendered frames under a live heat haze.</p>
        </div>
      </FrameSequence>
    );
  if (project.chapter === "helmet")
    return (
      <Torch className="z-(--z-content) px-gutter py-section">
        <div className="mx-auto grid max-w-page items-center gap-12 md:grid-cols-2">
          <div>
            <p className={`${label} text-fg-muted`}>02 — The helmet</p>
            <p className="mt-6 max-w-[22ch] text-3xl leading-tight tracking-tight">
              A compressed model that turns to meet the cursor.
            </p>
          </div>
          <Helmet className="aspect-square w-full" />
        </div>
      </Torch>
    );
  return (
    <section className="relative z-(--z-content) bg-bg px-gutter py-section">
      <div className="mx-auto max-w-page">
        <p className={`${label} text-fg-muted`}>02 — The range</p>
        <SpringField className="mt-12 grid grid-cols-3 gap-6 md:gap-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-spring=""
              className="aspect-[3/5] rounded-t-full"
              style={{ background: `color-mix(in oklch, ${project.field} ${100 - i * 18}%, ${project.deep})` }}
            />
          ))}
        </SpringField>
      </div>
    </section>
  );
}
