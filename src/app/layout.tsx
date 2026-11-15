import type { Metadata, Viewport } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { Cursor } from "@/components/motion/cursor";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Studio — Placeholder", template: "%s — Studio" },
  description: "Interaction-led design and development studio. Placeholder content.",
};

export const viewport: Viewport = {
  themeColor: "#f4f4f2",
};

// Runs before first paint: marks JS as available so reveal targets can start
// hidden (see globals.css) without hiding content from no-JS visitors.
const jsFlag = `document.documentElement.classList.add("js")`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsFlag }} />
      </head>
      <body>
        <a
          href="#main"
          className="fixed top-3 left-3 z-[200] -translate-y-20 rounded-sm bg-fg px-4 py-2 text-sm text-bg focus:translate-y-0"
        >
          Skip to content
        </a>
        <SmoothScroll>
          <SiteHeader />
          <main id="main">{children}</main>
        </SmoothScroll>
        <Cursor />
      </body>
    </html>
  );
}
