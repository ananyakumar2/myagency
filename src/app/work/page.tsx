import type { Metadata } from "next";

import { MirrorRoot } from "@/components/interaction/mirror/mirror-root";
import { PageTransition } from "@/components/motion/page-transition";
import { WorkCard } from "@/components/site/work-card";
import { WORK } from "@/lib/work/projects";

export const metadata: Metadata = { title: "Work" };

/**
 * The work index runs on the mirror (decision 1): the page is drawn to one
 * WebGL canvas that bows with scroll speed (60 px at full speed), carries a
 * faint lens under the cursor (decision 8) and ripples on card clicks.
 */
export default function WorkPage() {
  return (
    <PageTransition>
      <MirrorRoot>
        <div data-cursor-section="trail" className="px-gutter pt-36 pb-section">
          <div className="mx-auto max-w-page">
            <p data-mirror="text" className="font-mono text-xs tracking-wide text-fg-muted uppercase">
              Selected work — placeholder projects
            </p>
            <h1 data-mirror="text" className="mt-6 max-w-[18ch] text-display leading-tight font-medium tracking-tight">
              Five small worlds, each with one idea.
            </h1>
            <p data-mirror="text" className="mt-6 max-w-[52ch] text-lg text-fg-muted">
              Scroll fast to feel the page bend, move the cursor to see the lens, and open a project to watch its image carry
              you into the case study.
            </p>
            <ul className="mt-20 grid gap-x-6 gap-y-16 md:grid-cols-2">
              {WORK.map((project, i) => (
                <li key={project.slug} className={i % 2 === 1 ? "md:mt-32" : ""}>
                  <WorkCard project={project} index={i} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </MirrorRoot>
    </PageTransition>
  );
}
