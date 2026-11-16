"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewTransition, type ComponentProps, type MouseEvent, type ReactNode } from "react";

import { shockTuning } from "@/lib/interaction/config";

import { shockAt } from "../mirror/bus";
import { playSound } from "../sound/sound";
import { curtainNavigate } from "./curtain";

type ShockLinkProps = ComponentProps<typeof Link> & {
  /** "project" morphs the shared media into the case study; "curtain" runs the route curtain. */
  transition?: "project" | "curtain" | "none";
  curtainTitle?: string;
  curtainColor?: string;
};

/**
 * Decision 13: project cards and primary CTAs. The click sends a shockwave
 * through the mirrored page from the pointer, and navigation waits for it
 * (~0.45 s) so the ring is seen. Without a running mirror (phones, the home
 * page, reduced motion) it navigates straight away.
 */
export function ShockLink({ transition = "none", curtainTitle, curtainColor, onClick, href, children, ...props }: ShockLinkProps) {
  const router = useRouter();
  const go = () => {
    const url = String(href);
    if (transition === "curtain") {
      curtainNavigate({ href: url, title: curtainTitle ?? "", color: curtainColor });
      return;
    }
    // The shared-element snapshot is taken from the DOM, so hand the page back first.
    document.documentElement.classList.remove("mirror-on");
    router.push(url, transition === "project" ? { transitionTypes: ["project-open"] } : undefined);
  };
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const shocked = shockAt(e.clientX, e.clientY);
    playSound("click");
    if (shocked) window.setTimeout(go, shockTuning.params.navDelay * 1000);
    else go();
  };
  return (
    <Link href={href} onClick={handle} data-sound="off" {...props}>
      {children}
    </Link>
  );
}

/** Wraps a project's media on both the index card and the case-study hero so it morphs between them. */
export function SharedMedia({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <ViewTransition name={`project-${slug}`} share="project-morph" default="none">
      {children}
    </ViewTransition>
  );
}
