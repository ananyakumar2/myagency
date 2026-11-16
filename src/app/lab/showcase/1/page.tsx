import type { Metadata } from "next";

import { DialShowcase } from "@/components/showcase/dial-showcase";
import { LabShell } from "@/components/showcase/lab-shell";

export const metadata: Metadata = { title: "Showcase 1 — The Dial" };

export default function ShowcaseOption1() {
  return (
    <LabShell n={1}>
      <DialShowcase />
    </LabShell>
  );
}
