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
  "teach me this at my pace",
  "explain it a different way",
  "quiz me until I get it",
  "let me try this myself",
];
