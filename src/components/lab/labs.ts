export type Lab = {
  slug: string;
  title: string;
  /** Decision numbers from docs/reference-analysis.md. */
  decisions: string;
  blurb: string;
  /** Tuning set names shown in the panel. */
  sets: string[];
};

export const LABS: Lab[] = [
  { slug: "bend", title: "Scroll bend", decisions: "1", blurb: "The page bows with scroll speed, up to 60 px at full speed (Auge's strength). Scroll fast, then let go.", sets: ["bend", "watchdog"] },
  { slug: "lens", title: "Cursor lens", decisions: "8", blurb: "A faint bulge under the cursor at rest that grows with pointer speed, with a slight prism on edges.", sets: ["lens"] },
  { slug: "shockwave", title: "Click shockwave", decisions: "13", blurb: "Click anywhere: a ring travels out through the mirrored page. On project cards, navigation waits for it.", sets: ["shockwave"] },
  { slug: "cursor", title: "Cursor follower and pill", decisions: "7, 11, 12", blurb: "The native cursor plus a difference-blend diamond; labelled areas turn it into a scrambled pill; trails in marked sections.", sets: ["follower", "trail"] },
  { slug: "letters", title: "Letter push", decisions: "9", blurb: "Letters lean away from the cursor, up to 4 px, within a couple of letter widths.", sets: ["letters"] },
  { slug: "bursts", title: "Idle bursts", decisions: "5", blurb: "Text that moves fast, flips and settles; marks that spin fast then slow. One burst per screen at a time.", sets: ["bursts"] },
  { slug: "loader", title: "Loader", decisions: "16, 17, 18", blurb: "The placeholder mark, its readiness gate, the slow-network loop and the handoff into the first screen.", sets: ["loader"] },
  { slug: "sound", title: "Sound", decisions: "19", blurb: "Off by default. Placeholder hover ticks, click and whoosh; rotating variants, never louder than 0.6.", sets: ["sound"] },
  { slug: "press", title: "Press states", decisions: "14", blurb: "Grail's press: lift 2 px and grow to 1.03 on hover, settle to 0.99 on press, 0.15 s.", sets: ["press"] },
  { slug: "transitions", title: "Transitions", decisions: "2, 32", blurb: "The route curtain with a scrambled title, tilted sheets within a page, and the ink reveal.", sets: ["transitions"] },
  { slug: "sequence", title: "Frame sequence", decisions: "24", blurb: "Ananya's Mission Motorsport method: pre-rendered frames scrubbed by scroll under a WebGL heat haze. Hold to rev.", sets: ["sequence"] },
  { slug: "helmet", title: "Helmet", decisions: "21, 23, 24", blurb: "Ananya's Jack Johns method: a meshopt + KTX2 GLB that turns toward the cursor, rendering only while it moves.", sets: ["helmet"] },
  { slug: "springs", title: "Springs", decisions: "10, 22", blurb: "Agrumea's springs: objects turn 10°, lean 3° and lift 3% toward the cursor, each on its own spring.", sets: ["springs"] },
  { slug: "torch", title: "Section torch", decisions: "10", blurb: "The deep sections' one response: a warm light that follows the cursor.", sets: ["torch"] },
  { slug: "cubes", title: "Cubes", decisions: "proposal", blurb: "A terraced crater of cubes scrubbed by scroll: layers slide, the camera swings and rolls, then it all lies flat. Words or universes on the faces; snap optional.", sets: [] },
  { slug: "colour", title: "Colour", decisions: "25-34", blurb: "The proposed palette, field themes, the colour-cycling hero and the signature accent switch.", sets: ["colour", "hero"] },
];

export const getLab = (slug: string) => LABS.find((l) => l.slug === slug);
