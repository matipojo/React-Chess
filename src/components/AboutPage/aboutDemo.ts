import { BoardArrow } from "../../lessons/types";

/** Italian Game after 1. e4 e5 2. Nf3 Nc6 3. Bc4 — an example of a subject surface. */
export const ITALIAN_GAME_FEN =
  "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 3";

export const ITALIAN_GAME_ARROWS: BoardArrow[] = [
  { from: "g1", to: "f3", color: "#9b74d8" },
  { from: "f1", to: "c4", color: "#9b74d8" },
];

export const ABOUT_DEMO_FIGURE_ID = "right-at-C";

export const ABOUT_EXAMPLE_PROMPTS = [
  "Show Scholar's Mate",
  "Show a right triangle and the altitude to the hypotenuse",
  "Teach me the Italian",
  "Teach SAS congruence with two triangles",
];

export type AboutDemoClipId = "chess" | "triangles";

export const ABOUT_DEMO_CLIPS: Array<{
  id: AboutDemoClipId;
  label: string;
  blurb: string;
  href: "chess" | "triangles";
  src: string;
  poster: string;
  alt: string;
}> = [
  {
    id: "chess",
    label: "Chess",
    blurb: "Learn on a real chessboard",
    href: "chess",
    src: "demos/scholars-mate.gif",
    poster: "demos/scholars-mate-poster.jpg",
    alt: "Scholar's Mate demo",
  },
  {
    id: "triangles",
    label: "Triangles",
    blurb: "Learn on a figure you can move",
    href: "triangles",
    src: "demos/triangles-altitude.gif",
    poster: "demos/triangles-altitude-poster.jpg",
    alt: "Altitude to the hypotenuse demo",
  },
];
