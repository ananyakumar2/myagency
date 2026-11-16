import { MirrorImage } from "@/components/interaction/mirror/mirror-image";
import { SharedMedia, ShockLink } from "@/components/interaction/transitions/project-link";
import type { WorkProject } from "@/lib/work/projects";

/**
 * Decisions 12, 13 and 26: the card fills with its project's field colour
 * (0.6 s) while the image tilts 1.5°, the cursor becomes a pill in the
 * project's deep tone, and a click sends a shockwave before the image morphs
 * into the case study's hero.
 */
export function WorkCard({ project, index }: { project: WorkProject; index: number }) {
  return (
    <ShockLink
      href={`/work/${project.slug}`}
      transition="project"
      data-cursor-label="View"
      data-cursor-color={project.deep}
      className="group block"
      style={{ ["--field" as string]: project.field }}
    >
      <div
        data-mirror="block"
        data-mirror-live=""
        data-mirror-clip=""
        className="relative overflow-hidden rounded-md bg-surface p-3 transition-colors duration-600 ease-card group-hover:bg-(--field)"
      >
        <SharedMedia slug={project.slug}>
          <MirrorImage
            src={project.hero.src}
            alt={project.hero.alt}
            projected
            radius={4}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-[16/10] transition-[rotate,scale] duration-600 ease-card group-hover:scale-[1.02] group-hover:rotate-[1.5deg]"
          />
        </SharedMedia>
        <div className="mt-4 flex items-baseline justify-between gap-4 px-1 pb-1">
          <span data-mirror="text" className="text-xl font-medium tracking-tight text-ink">
            {project.name}
          </span>
          <span data-mirror="text" className="font-mono text-[0.6875rem] tracking-wide text-ink-2 uppercase">
            {String(index + 1).padStart(2, "0")} — {project.sector}
          </span>
        </div>
      </div>
    </ShockLink>
  );
}
