/* eslint-disable @next/next/no-img-element -- lab stand-in for a case study */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageTransition, TransitionLink } from "@/components/motion/page-transition";
import { getProject, PROJECTS } from "@/components/showcase/projects";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lab/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getProject(slug)?.name ?? "Work" };
}

/** Stand-in for the case study the showcase's second click opens. */
export default async function LabWorkPage({ params }: PageProps<"/lab/work/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <PageTransition>
      <article style={{ backgroundColor: project.field, color: project.deep }} className="min-h-svh">
        <div className="mx-auto max-w-page px-gutter pt-32 pb-section">
          <p className="font-mono text-xs tracking-wide uppercase opacity-70">
            {project.sector} · {project.place}
          </p>
          <h1 className="mt-4 text-display leading-[0.9] font-medium tracking-tight">{project.name}</h1>
          <p className="mt-6 max-w-[44ch] text-xl leading-snug">{project.line}</p>
          <img src={project.hero.src} alt={project.hero.alt} className="mt-14 aspect-[16/9] w-full rounded-md object-cover" />
          <p className="mt-10 font-mono text-xs tracking-wide uppercase opacity-70">
            Case study placeholder — the showcase&apos;s second click lands here.
          </p>
          <TransitionLink href="/lab/showcase" direction="back" className="mt-6 inline-block underline underline-offset-4">
            ← All showcase options
          </TransitionLink>
        </div>
      </article>
    </PageTransition>
  );
}
