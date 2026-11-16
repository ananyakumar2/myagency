import type { Metadata } from "next";

import { DeckVariantPage } from "@/components/showcase/deck/deck-variants";

export const metadata: Metadata = { title: "Deck variant 2" };

export default function DeckVariant2() {
  return <DeckVariantPage n={2} />;
}
