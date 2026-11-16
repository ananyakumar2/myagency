import type { Metadata } from "next";

import { ContactShowcase } from "@/components/showcase/contact-showcase";
import { LabShell } from "@/components/showcase/lab-shell";

export const metadata: Metadata = { title: "Showcase 4 — The Contact Sheet" };

export default function ShowcaseOption4() {
  return (
    <LabShell n={4}>
      <ContactShowcase />
    </LabShell>
  );
}
