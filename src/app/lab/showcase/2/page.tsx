import type { Metadata } from "next";

import { RingShowcase } from "@/components/showcase/ring-showcase";
import { LabShell } from "@/components/showcase/lab-shell";

export const metadata: Metadata = { title: "Showcase 2 — The Ring" };

export default function ShowcaseOption2() {
  return (
    <LabShell n={2}>
      <RingShowcase />
    </LabShell>
  );
}
