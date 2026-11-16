import Link from "next/link";
import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion/page-transition";

import { OPTIONS } from "./options";

/** Frames one showcase option the way it would sit on the home page: content above, content below. */
export function LabShell({ n, children }: { n: number; children: ReactNode }) {
  const option = OPTIONS.find((o) => o.n === n)!;
  return (
    <PageTransition>
      <div>
        <header className="mx-auto grid min-h-[70svh] max-w-page content-end gap-10 px-gutter pt-32 pb-16 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
              Work showcase · option {n} of {OPTIONS.length}
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-medium tracking-tight">{option.name}</h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-snug">{option.idea}</p>
          </div>
          <dl className="grid gap-4 text-sm md:col-span-5">
            <Row term="Each project shows">{option.perProject}</Row>
            <Row term="Why four isn't thin">{option.fullness}</Row>
            <Row term="Inspired by">{option.inspiredBy}</Row>
            <Row term="Interaction">{option.interactions}</Row>
          </dl>
        </header>

        {children}

        <footer className="mx-auto max-w-page px-gutter py-section">
          <OptionNav current={n} />
        </footer>
      </div>
    </PageTransition>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <dt className="font-mono text-xs tracking-wide text-fg-muted uppercase">{term}</dt>
      <dd className="mt-1 leading-snug">{children}</dd>
    </div>
  );
}

export function OptionNav({ current }: { current?: number }) {
  return (
    <nav aria-label="Showcase options">
      <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-4">
        {OPTIONS.map((o) => (
          <li key={o.n} className="bg-bg">
            <Link
              href={`/lab/showcase/${o.n}`}
              aria-current={o.n === current ? "page" : undefined}
              className="block h-full p-5 aria-[current=page]:bg-surface"
            >
              <span className="font-mono text-xs text-fg-muted">0{o.n}</span>
              <span className="mt-2 block text-xl font-medium tracking-tight">{o.name}</span>
              <span className="mt-2 block text-sm leading-snug text-fg-muted">{o.idea}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
