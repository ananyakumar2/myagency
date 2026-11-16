import type { Metadata } from "next";

import { CubeSection } from "@/components/cube-scene/cube-section";

export const metadata: Metadata = { title: "Cube scene — Lab", robots: { index: false } };

export default function CubeSceneLab() {
  return (
    <>
      <section className="flex min-h-[100lvh] flex-col justify-between px-gutter pt-28 pb-10">
        <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Lab / Landing page, section 2</p>
        <div>
          <h1 className="max-w-[20ch] text-4xl font-medium tracking-tight">The cube structure, rebuilt from the reference numbers.</h1>
          <p className="mt-4 max-w-[52ch] text-fg-muted">
            Placeholder for the hero. Scroll: the opening sentence settles onto its cubes, the lattice assembles into the pyramid while the camera
            turns half a circle above it, then dives onto the apex.
          </p>
        </div>
        <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Scroll</p>
      </section>
      <CubeSection />
      <section className="grid min-h-[100lvh] place-items-center px-gutter">
        <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">Section 3 placeholder</p>
      </section>
    </>
  );
}
