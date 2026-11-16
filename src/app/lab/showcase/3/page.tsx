import type { Metadata } from "next";

import { DeckShowcase } from "@/components/showcase/deck-showcase";
import { LabShell } from "@/components/showcase/lab-shell";

export const metadata: Metadata = { title: "Showcase 3 — The Deck" };

export default function ShowcaseOption3() {
  return (
    <LabShell n={3}>
      <DeckShowcase />
    </LabShell>
  );
}
