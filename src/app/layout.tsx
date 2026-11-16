import type { Metadata, Viewport } from "next";

import { Follower } from "@/components/interaction/cursor/follower";
import { Loader } from "@/components/interaction/loader/loader";
import { LOADER_SCRIPT } from "@/components/interaction/loader/loader-script";
import { SoundDelegate } from "@/components/interaction/sound/sound-toggle";
import { Curtain } from "@/components/interaction/transitions/curtain";
import { TuningTokens } from "@/components/interaction/tuning-tokens";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { SiteHeader } from "@/components/site/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Studio — Placeholder", template: "%s — Studio" },
  description: "Interaction-led design and development studio. Placeholder content.",
};

export const viewport: Viewport = {
  themeColor: "#f4f0e7",
};

// Runs before first paint: marks JS as available so reveal targets can start
// hidden (see globals.css) without hiding content from no-JS visitors.
const jsFlag = `document.documentElement.classList.add("js")`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsFlag }} />
        <script dangerouslySetInnerHTML={{ __html: LOADER_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="fixed top-3 left-3 z-(--z-panel) -translate-y-20 rounded-sm bg-fg px-4 py-2 text-sm text-bg focus:translate-y-0"
        >
          Skip to content
        </a>
        <Loader />
        <SmoothScroll>
          <SiteHeader />
          <main id="main">{children}</main>
        </SmoothScroll>
        <Curtain />
        <Follower />
        <SoundDelegate />
        <TuningTokens />
      </body>
    </html>
  );
}
