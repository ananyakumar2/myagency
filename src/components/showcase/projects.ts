export type ShowcaseImage = { src: string; alt: string; w: number; h: number };

export type ShowcaseProject = {
  slug: string;
  name: string;
  /** One-line, factual description taken from the live site. */
  line: string;
  sector: string;
  place: string;
  /** Light field colour the page washes into while this project is active. */
  field: string;
  /** Deep partner of `field`, for type and rules on top of it. */
  deep: string;
  /** Brand accent from the client's own site. */
  accent: string;
  hero: ShowcaseImage;
  /** Portrait or square crop for slots that need a tall card. */
  tall: ShowcaseImage;
  details: ShowcaseImage[];
  /** Optional scroll-scrubbed frame sequence (Mission Motorsport's hero). */
  frames?: string[];
};

const img = (src: string, alt: string, w: number, h: number): ShowcaseImage => ({ src, alt, w, h });

const missionFrames = Array.from(
  { length: 40 },
  (_, i) => `/work/mission-motorsport/seq/${String(i).padStart(2, "0")}.webp`,
);

export const PROJECTS: ShowcaseProject[] = [
  {
    slug: "gridmasters",
    name: "Gridmasters",
    line: "Track days, speed gates and corporate events on the UAE's circuits.",
    sector: "Motorsport events",
    place: "Dubai Autodrome · Yas Marina",
    field: "#efe2a6",
    deep: "#1a1606",
    accent: "#f2c400",
    hero: img("/work/gridmasters/hero.webp", "Hosts beside the number 23 Supra on the grid at night", 1600, 1066),
    tall: img("/work/gridmasters/gt3rs.webp", "Green GT3 RS in the pit lane", 900, 1170),
    details: [
      img("/work/gridmasters/grid.webp", "A full grid of Porsches lined up under floodlights", 1600, 900),
      img("/work/gridmasters/night.webp", "Night grid at Dubai Autodrome", 900, 990),
      img("/work/gridmasters/autodrome.webp", "Blue BRZ cornering at Dubai Autodrome", 1600, 900),
      img("/work/gridmasters/paddock.webp", "Sunset over the paddock", 900, 1170),
      img("/work/gridmasters/crew.webp", "GT2 RS with its crew", 900, 990),
    ],
  },
  {
    slug: "welth",
    name: "Welth",
    line: "Big decisions, rehearsed: financial futures you can try before you live them.",
    sector: "Fintech",
    place: "Personal and employer plans",
    field: "#eadfcb",
    deep: "#14110e",
    accent: "#e8e3d8",
    hero: img("/work/welth/galaxy.webp", "A particle galaxy of employees' finances", 1440, 900),
    tall: img("/work/welth/galaxy-square.webp", "Close crop of the particle galaxy", 700, 700),
    details: [
      img("/work/welth/desert.webp", "Watercolour desert with a distant skyline", 1440, 900),
      img("/work/welth/hero.webp", "Big decisions, rehearsed — the Welth hero", 1440, 900),
      img("/work/welth/chart.webp", "A projected net-worth line through a field of points", 1440, 900),
      img("/work/welth/product.webp", "Product cards that price a future", 1440, 900),
      img("/work/welth/stats.webp", "Employer statistics on a dark field", 1440, 900),
    ],
  },
  {
    slug: "jack-johns",
    name: "Jack Johns",
    line: "Racing driver, sim racer, coach and commentator, behind one helmet.",
    sector: "Driver portfolio",
    place: "Racing · Sim · Coaching · Commentary",
    field: "#cdd6ec",
    deep: "#0b1530",
    accent: "#2f5bff",
    hero: img("/work/jack-johns/portal.webp", "The Jack Johns portal: four quadrants around a blue helmet", 1440, 900),
    tall: img("/work/jack-johns/helmet.webp", "The blue helmet in its dial", 600, 600),
    details: [
      img("/work/jack-johns/racing.webp", "Racing quadrant: cars passing the grandstand", 664, 336),
      img("/work/jack-johns/sim.webp", "Sim racing quadrant", 664, 340),
      img("/work/jack-johns/helmet-turn.webp", "The helmet turning in its dial", 600, 600),
      img("/work/jack-johns/coaching.webp", "Coaching quadrant: the cockpit", 664, 340),
      img("/work/jack-johns/commentating.webp", "Commentating quadrant", 664, 340),
    ],
  },
  {
    slug: "mission-motorsport",
    name: "Mission Motorsport",
    line: "Performance exhausts — hear it before you fit it. Fitted in Dubai.",
    sector: "Automotive retail",
    place: "Dubai",
    field: "#d3e8cc",
    deep: "#0c160c",
    accent: "#3cb43c",
    hero: img("/work/mission-motorsport/hero.webp", "Twin exhaust tips of a green GT3", 1440, 900),
    tall: img("/work/mission-motorsport/seq/39.webp", "Pulled-back view of the GT3 and its wing", 1200, 675),
    details: [
      img("/work/mission-motorsport/exploded.webp", "Wireframe car with the exhaust system exploded", 1440, 900),
      img("/work/mission-motorsport/seq/12.webp", "The exhaust tips close up", 1200, 675),
      img("/work/mission-motorsport/dubai.webp", "The green GT3 from behind, fitted in Dubai", 1440, 900),
    ],
    frames: missionFrames,
  },
];

export const projectHref = (slug: string) => `/lab/work/${slug}`;
export const getProject = (slug: string) => PROJECTS.find((p) => p.slug === slug);
export const pad = (n: number) => String(n).padStart(2, "0");
