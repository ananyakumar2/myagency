/**
 * Placeholder projects for the work index and case-study route. The fields
 * follow the showcase fork's ShowcaseProject (slug, name, line, sector,
 * place, field, deep, hero, tall), so real projects can replace this list
 * without touching the pages.
 */
export type WorkImage = { src: string; alt: string; w: number; h: number };

export type WorkProject = {
  slug: string;
  name: string;
  line: string;
  sector: string;
  place: string;
  /** Light field colour: card fill, curtain, ink reveal. */
  field: string;
  /** Deep partner: the cursor pill and type on the field. */
  deep: string;
  hero: WorkImage;
  tall: WorkImage;
  /** Which 3D chapter the case study carries (decisions 21 and 24). */
  chapter?: "sequence" | "helmet" | "springs";
};

const img = (src: string, alt: string, w: number, h: number): WorkImage => ({ src, alt, w, h });

export const WORK: WorkProject[] = [
  {
    slug: "torque",
    name: "Torque",
    line: "A launch film you scroll through, with heat coming off the exhausts.",
    sector: "Automotive",
    place: "Placeholder",
    field: "#ffcbc5",
    deep: "#843c38",
    hero: img("/placeholder/torque-wide.webp", "Placeholder render: the tail of a race car with twin exhausts", 1600, 1000),
    tall: img("/placeholder/torque-tall.webp", "Placeholder render: race car tail, portrait crop", 900, 1200),
    chapter: "sequence",
  },
  {
    slug: "altitude",
    name: "Altitude",
    line: "A driver portfolio built around one helmet that follows your cursor.",
    sector: "Driver portfolio",
    place: "Placeholder",
    field: "#f5d5ab",
    deep: "#754b00",
    hero: img("/placeholder/altitude-wide.webp", "Placeholder model: a cream racing helmet with a lacquer stripe", 1600, 1000),
    tall: img("/placeholder/altitude-tall.webp", "Placeholder model: racing helmet, portrait crop", 900, 1200),
    chapter: "helmet",
  },
  {
    slug: "maritime",
    name: "Maritime",
    line: "Charter pages that feel like the first hour out of the marina.",
    sector: "Yachting",
    place: "Placeholder",
    field: "#a8e9e8",
    deep: "#006566",
    hero: img("/placeholder/maritime-wide.webp", "Placeholder art: a low sun over a teal sea", 1600, 1000),
    tall: img("/placeholder/maritime-tall.webp", "Placeholder art: sun and sea, portrait crop", 900, 1200),
    chapter: "springs",
  },
  {
    slug: "skyline",
    name: "Skyline",
    line: "Off-plan towers sold with light, height and very little copy.",
    sector: "Real estate",
    place: "Placeholder",
    field: "#f2e3c6",
    deep: "#754b00",
    hero: img("/placeholder/skyline-wide.webp", "Placeholder art: a saffron skyline", 1600, 1000),
    tall: img("/placeholder/skyline-tall.webp", "Placeholder art: skyline, portrait crop", 900, 1200),
    chapter: "springs",
  },
  {
    slug: "origin",
    name: "Origin",
    line: "A roastery's range, each bag a small object you can nudge.",
    sector: "Specialty coffee",
    place: "Placeholder",
    field: "#e6ded0",
    deep: "#4f4942",
    hero: img("/placeholder/origin-wide.webp", "Placeholder art: a lacquer arch on stone", 1600, 1000),
    tall: img("/placeholder/origin-tall.webp", "Placeholder art: arch, portrait crop", 900, 1200),
    chapter: "springs",
  },
];

export const getProject = (slug: string) => WORK.find((p) => p.slug === slug);

export const nextProject = (slug: string) => {
  const i = WORK.findIndex((p) => p.slug === slug);
  return WORK[(i + 1) % WORK.length];
};
