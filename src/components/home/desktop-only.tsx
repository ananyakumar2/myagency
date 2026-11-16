"use client";

import type { ReactNode } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";

/** Renders its children on large screens with a mouse; phones and tablets skip them. */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const desktop = useMediaQuery("(min-width: 1024px) and (hover: hover) and (pointer: fine)", false);
  return desktop ? children : null;
}
