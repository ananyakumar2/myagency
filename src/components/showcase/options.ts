export type ShowcaseOption = {
  n: number;
  name: string;
  idea: string;
  perProject: string;
  fullness: string;
  inspiredBy: string;
  interactions: string;
};

export const OPTIONS: ShowcaseOption[] = [
  {
    n: 1,
    name: "The Dial",
    idea: "A drum of project names turns like a combination dial as you scroll; a large stage beside it wipes from one project to the next.",
    perProject: "Name on the drum, one hero on the stage, its one-line story, sector and place, and three detail images.",
    fullness: "The drum carries the four names three times over, so the wheel always reads full; the stage gives each project a full-width moment.",
    inspiredBy: "Fine Acts' Wheels of Work (the slot-wheel spin), Agrumea's per-project colour wash.",
    interactions: "Scroll turns the dial and snaps to a project. The stage bows with scroll speed. Click a name to bring it to the marker, click again (or the stage) to open. Mission's stage scrubs its real frame sequence.",
  },
  {
    n: 2,
    name: "The Ring",
    idea: "Twelve tall panels on a slowly turning carousel seen from just above, so the work reads as one object rather than a list.",
    perProject: "Three panels: the hero, a second view and a close crop. The front project's name, line and index sit under the ring.",
    fullness: "Three panels per project close the ring; the far side shows through dimmed, so there is always depth behind the front card.",
    inspiredBy: "Agrumea's jar ring and colour crossfade, Grail's helix field.",
    interactions: "Scroll, drag or throw to turn; panels bow sideways with turning speed. When left alone it turns one panel in a quick burst that eases out long. First click turns a side panel to the front, second opens.",
  },
  {
    n: 3,
    name: "The Deck",
    idea: "Each project is a full-screen printed sheet that slides in tilted and lands on the pile; index tabs along the bottom show the whole deck.",
    perProject: "A whole sheet in the client's field colour: giant name, line, sector and place, a large hero and three details.",
    fullness: "Four is the right number for a deck: every project gets an entire screen, and the tabs make the set feel complete rather than short.",
    inspiredBy: "Grail's tilted paper sheets, huyml.co's magazine stack.",
    interactions: "Scroll deals the next sheet and snaps. The hero bows with scroll speed; sheets underneath sink and darken. First click on a tab or a buried sheet brings it up, second opens. Mission's hero plays its frame sequence as its sheet lands.",
  },
  {
    n: 4,
    name: "The Contact Sheet",
    idea: "A horizontal collage where each project is a spread: a field of its colour, the hero, and four satellite fragments on different depths.",
    perProject: "Six pieces per project: colour field, hero, four fragments (people, details, product UI), a giant name and a line.",
    fullness: "Twenty-plus images across four spreads, layered on parallax depths, so the section reads dense and editorial.",
    inspiredBy: "Delassus' layered parallax, Grail's card field, a photographer's contact sheet.",
    interactions: "Scroll pans the sheet; fragments drift at their own depths and lean with speed, heroes bow. No snap — it's for browsing. First click centres that project's spread, second opens.",
  },
];
