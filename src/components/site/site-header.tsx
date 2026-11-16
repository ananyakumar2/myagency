import Link from "next/link";

import { Burst } from "@/components/interaction/burst/burst";
import { LetterPush } from "@/components/interaction/letter-push";
import { SoundToggle } from "@/components/interaction/sound/sound-toggle";
import { CurtainLink } from "@/components/interaction/transitions/curtain";
import { Magnetic } from "@/components/motion/magnetic";

export function SiteHeader() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-(--z-header) bg-bg/80 backdrop-blur-md"
      style={{ viewTransitionName: "site-header" }}
    >
      <nav className="mx-auto flex max-w-page items-center justify-between px-gutter py-4 text-sm text-fg">
        <CurtainLink href="/" curtainTitle="Studio" className="font-medium tracking-tight" aria-label="Studio, home">
          {/* Decision 5: the wordmark glitches in bursts and on hover; decision 9: its letters lean away. */}
          <Burst kind="glitch" hover>
            <LetterPush text="Studio®" />
          </Burst>
        </CurtainLink>
        <ul className="flex items-center gap-1">
          <li>
            <Magnetic>
              <Link href="/#work" className="block px-3 py-2">
                Work
              </Link>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <Link href="/#studio" className="block px-3 py-2">
                Studio
              </Link>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <CurtainLink href="/lab" curtainTitle="Lab" className="block px-3 py-2">
                Lab
              </CurtainLink>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <Link href="/#contact" className="block px-3 py-2">
                Contact
              </Link>
            </Magnetic>
          </li>
          <li className="ml-2">
            <SoundToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
}
