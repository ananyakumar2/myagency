import type { Metadata } from "next";

import { DeckVariantPage } from "@/components/showcase/deck/deck-variants";

export const metadata: Metadata = { title: "Deck variant 1" };

export default function DeckVariant1() {
  return <DeckVariantPage n={1} />;
}
