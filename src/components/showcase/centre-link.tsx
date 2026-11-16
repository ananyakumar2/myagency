"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type CentreLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  /** True when this item is already the centred one; the click then opens it. */
  centred: boolean;
  onCentre: () => void;
};

/**
 * Ananya's answer 15: the first click on a side item centres it, a second
 * click opens it. It stays a real link, so modified clicks (new tab) and
 * crawlers still get the project URL.
 */
export function CentreLink({ centred, onCentre, ...props }: CentreLinkProps) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (centred || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onCentre();
  };
  return (
    <Link
      {...props}
      transitionTypes={["page-forward"]}
      onClick={onClick}
      data-cursor-label={centred ? "Open" : "Centre"}
      aria-current={centred ? "true" : undefined}
    />
  );
}
