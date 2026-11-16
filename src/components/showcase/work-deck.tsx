"use client";

import { type DeckHeroProps, DeckShowcase } from "./deck-showcase";
import { ProjectStage, type StageMode } from "./deck/project-stage";

export type WorkDeckMode = StageMode;

type WorkDeckProps = {
  /**
   * How each sheet's laptop and phone come alive:
   * - `loops`: recordings of each site's best sections play on both screens.
   * - `play`: the laptop runs the site's own interaction under the pointer.
   * - `play-then-loops`: the interaction first, then the recordings take over.
   */
  mode?: WorkDeckMode;
  /** Anchor id for the section. */
  id?: string;
  /** Pass false when the page already has a MirrorRoot. */
  ownMirror?: boolean;
};

/**
 * The four projects dealt as a pile of sheets, each with its site alive on a laptop and phone.
 * Pins for four screens of scroll. Touch devices and reduced motion get posters (reduced motion
 * gets the static list).
 */
export function WorkDeck({ mode = "play-then-loops", id, ownMirror }: WorkDeckProps) {
  return <DeckShowcase id={id} ownMirror={ownMirror} Hero={heroes[mode]} />;
}

const heroes: Record<StageMode, (p: DeckHeroProps) => React.ReactNode> = {
  loops: ({ project, active }) => <ProjectStage project={project} mode="loops" active={active} />,
  play: ({ project, active }) => <ProjectStage project={project} mode="play" active={active} />,
  "play-then-loops": ({ project, active }) => <ProjectStage project={project} mode="play-then-loops" active={active} />,
};
