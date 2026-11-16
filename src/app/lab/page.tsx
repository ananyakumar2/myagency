import type { Metadata } from "next";
import Link from "next/link";

import { LABS } from "@/components/lab/labs";

export const metadata: Metadata = { title: "Lab", robots: { index: false } };

export default function LabIndex() {
  return (
    <div className="min-h-svh px-gutter pt-28 pb-24">
      <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Interaction lab</p>
      <h1 className="mt-3 max-w-[18ch] text-5xl font-medium tracking-tight">Every effect on its own page, with live tuning.</h1>
      <p className="mt-4 max-w-[60ch] text-fg-muted">
        Values set in a lab&apos;s panel persist in this browser and apply across the whole site, so they can be judged in place. Use Copy to send them back as new defaults.
      </p>
      <ul className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
        {LABS.map((lab) => (
          <li key={lab.slug} className="bg-bg">
            <Link href={`/lab/${lab.slug}`} data-press="" className="flex h-full flex-col gap-2 p-6">
              <span className="font-mono text-[0.6875rem] tracking-wide text-fg-muted uppercase">Decision {lab.decisions}</span>
              <span className="text-xl font-medium tracking-tight">{lab.title}</span>
              <span className="text-sm text-fg-muted">{lab.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
