import { CHESS_TOOL_NAMES } from "./useModelContextTools";
import { TRIANGLE_TOOL_NAMES } from "./useTriangleModelContextTools";

const CHESS_ONLY = [
  "get-board-state",
  "make-move",
  "get-possible-moves",
  "restart-game",
  "promote-pawn",
  "enter-learn-mode",
  "exit-learn-mode",
  "set-position",
  "annotate-board",
  "load-game",
  "goto-move",
  "play-line",
  "demonstrate-piece",
];

const TRIANGLE_ONLY = [
  "get-figure-state",
  "apply-gan",
  "set-figure",
  "move-point",
  "rotate-figure",
  "mark-figure",
  "measure-figure",
];

describe("learning area tools", () => {
  it("does not register triangle tools on the chess page", () => {
    TRIANGLE_ONLY.forEach((name) => {
      expect(CHESS_TOOL_NAMES).not.toContain(name);
    });
    expect(CHESS_TOOL_NAMES).not.toContain("set-learning-area");
    expect(CHESS_TOOL_NAMES).toContain("make-move");
    expect(CHESS_TOOL_NAMES).toContain("create-lesson");
  });

  it("does not register chess tools on the triangle page", () => {
    CHESS_ONLY.forEach((name) => {
      expect(TRIANGLE_TOOL_NAMES).not.toContain(name);
    });
    expect(TRIANGLE_TOOL_NAMES).not.toContain("set-learning-area");
    expect(TRIANGLE_TOOL_NAMES).toContain("apply-gan");
    expect(TRIANGLE_TOOL_NAMES).toContain("create-lesson");
  });
});
