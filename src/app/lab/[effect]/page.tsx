import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LabDemo } from "@/components/lab/demos";
import { getLab, LABS } from "@/components/lab/labs";
import { TuningPanel } from "@/components/lab/tuning-panel";

export function generateStaticParams() {
  return LABS.map((l) => ({ effect: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lab/[effect]">): Promise<Metadata> {
  const lab = getLab((await params).effect);
  return { title: lab ? `${lab.title} — Lab` : "Lab", robots: { index: false } };
}

export default async function LabPage({ params }: PageProps<"/lab/[effect]">) {
  const lab = getLab((await params).effect);
  if (!lab) notFound();
  const i = LABS.indexOf(lab);
  const next = LABS[(i + 1) % LABS.length]!;
  return (
    <div className="min-h-svh pt-24 md:pr-[21rem]">
      <header className="px-gutter pb-10">
        <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
          <Link href="/lab" className="underline underline-offset-4">
            Lab
          </Link>{" "}
          / Decision {lab.decisions}
        </p>
        <h1 className="mt-3 text-5xl font-medium tracking-tight">{lab.title}</h1>
        <p className="mt-3 max-w-[56ch] text-fg-muted">{lab.blurb}</p>
      </header>
      <LabDemo slug={lab.slug} />
      <footer className="px-gutter py-16 text-sm">
        Next:{" "}
        <Link href={`/lab/${next.slug}`} className="underline underline-offset-4">
          {next.title}
        </Link>
      </footer>
      <TuningPanel sets={lab.sets} />
    </div>
  );
}
