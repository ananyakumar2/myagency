"use client";

import { DeckShowcase, type DeckHeroProps } from "../deck-showcase";
import { ProjectStage, type StageMode } from "./project-stage";

const heroes: Record<StageMode, (p: DeckHeroProps) => React.ReactNode> = {
  loops: ({ project, active }) => <ProjectStage project={project} mode="loops" active={active} />,
  play: ({ project, active }) => <ProjectStage project={project} mode="play" active={active} />,
  "play-then-loops": ({ project, active }) => <ProjectStage project={project} mode="play-then-loops" active={active} />,
};

export function DeckStageShowcase({ mode }: { mode: StageMode }) {
  return <DeckShowcase Hero={heroes[mode]} />;
}
