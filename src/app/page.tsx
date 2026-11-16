import { ArchHero } from "@/components/home/arch-hero";
import { DesktopOnly } from "@/components/home/desktop-only";
import { ContactFooter, Services, Studio, WorkIntro } from "@/components/home/home-sections";
import { MirrorRoot } from "@/components/interaction/mirror/mirror-root";
import { CubeSection } from "@/components/lab/cubes/cube-section";
import { PageTransition } from "@/components/motion/page-transition";
import { WorkDeck } from "@/components/showcase/work-deck";

/**
 * One mirror for the whole page (only one MirrorRoot is allowed per page): the copy bends with
 * scroll speed, carries the lens and ripples on clicks, and the Deck's sheets are drawn on it.
 */
export default function Home() {
  return (
    <PageTransition>
      <MirrorRoot>
        <ArchHero />
        <WorkIntro />
        <WorkDeck id="work" ownMirror={false} />
        <DesktopOnly>
          <CubeSection />
        </DesktopOnly>
        <Services />
        <Studio />
        <ContactFooter />
      </MirrorRoot>
    </PageTransition>
  );
}
