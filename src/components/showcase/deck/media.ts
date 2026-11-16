/** Screen recordings and captured interactions for the Deck's device stage. */

export type Interaction =
  /** A grid of settled poses, picked by the pointer's position (Jack Johns' helmet). */
  | { kind: "grid"; cols: number; rows: number; frames: string[]; hint: string }
  /** Holding the pointer down drives the sequence forward; letting go runs it back. */
  | { kind: "hold"; frames: string[]; hint: string; rise: number; fall: number }
  /** The pointer's position across (x) or down (y) the stage scrubs the sequence. */
  | { kind: "sweep"; axis: "x" | "y"; frames: string[]; hint: string };

export type DeckMedia = {
  desktop: { src: string; poster: string };
  phone: { src: string; poster: string };
  play: Interaction;
};

const loops = (slug: string) => ({
  desktop: { src: `/work/${slug}/loop/desktop.mp4`, poster: `/work/${slug}/loop/desktop.webp` },
  phone: { src: `/work/${slug}/loop/phone.mp4`, poster: `/work/${slug}/loop/phone.webp` },
});

const seq = (slug: string, n: number) =>
  Array.from({ length: n }, (_, i) => `/work/${slug}/play/${String(i).padStart(2, "0")}.webp`);

export const DECK_MEDIA: Record<string, DeckMedia> = {
  gridmasters: {
    ...loops("gridmasters"),
    play: { kind: "sweep", axis: "y", frames: seq("gridmasters", 48), hint: "Move up and down to scroll the site" },
  },
  welth: {
    ...loops("welth"),
    play: { kind: "sweep", axis: "x", frames: seq("welth", 40), hint: "Move across to form the galaxy" },
  },
  "jack-johns": {
    ...loops("jack-johns"),
    play: { kind: "grid", cols: 7, rows: 5, frames: seq("jack-johns", 35), hint: "Move to turn the helmet" },
  },
  "mission-motorsport": {
    ...loops("mission-motorsport"),
    play: { kind: "hold", frames: seq("mission-motorsport", 39), hint: "Hold to rev", rise: 0.5, fall: 1 },
  },
};
