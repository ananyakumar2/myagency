import type { Metadata } from "next";

import { DeckVariantPage } from "@/components/showcase/deck/deck-variants";

export const metadata: Metadata = { title: "Deck variant 3" };

export default function DeckVariant3() {
  return <DeckVariantPage n={3} />;
}
