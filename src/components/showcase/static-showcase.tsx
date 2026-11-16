/* eslint-disable @next/next/no-img-element -- static lab fallback, real assets ship with next/image later */
import Link from "next/link";

import { PROJECTS, pad, projectHref } from "./projects";

/** Reduced-motion layout shared by every option: the same content, no wheel, no pin. */
export function StaticShowcase() {
  return (
    <ol className="mx-auto grid max-w-page gap-16 px-gutter py-section md:grid-cols-2">
      {PROJECTS.map((p, i) => (
        <li key={p.slug}>
          <Link href={projectHref(p.slug)} className="group block">
            <img src={p.hero.src} alt={p.hero.alt} className="aspect-[16/10] w-full rounded-md object-cover" />
            <div className="mt-4 flex items-baseline justify-between gap-6">
              <h3 className="text-2xl font-medium tracking-tight">
                <span className="mr-3 font-mono text-xs text-fg-muted">{pad(i + 1)}</span>
                {p.name}
              </h3>
              <span className="text-sm text-fg-muted">{p.sector}</span>
            </div>
            <p className="mt-2 max-w-[48ch] text-fg-muted">{p.line}</p>
          </Link>
        </li>
      ))}
    </ol>
  );
}
