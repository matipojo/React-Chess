import { boardFromFen } from "../../utils/board-setup";
import { chessNotationToCoordinates } from "../../utils/chess-notation-utils";
import { PieceType } from "../../Types";
import { figureFromTemplate } from "../../geometry/templates";
import {
  ABOUT_DEMO_FIGURE_ID,
  ABOUT_EXAMPLE_PROMPTS,
  ITALIAN_GAME_ARROWS,
  ITALIAN_GAME_FEN,
} from "./aboutDemo";

describe("about demo position", () => {
  it("uses a chess position as one example surface", () => {
    const board = boardFromFen(ITALIAN_GAME_FEN, true);
    const at = (square: string) => {
      const coords = chessNotationToCoordinates(square);
      return board.pieces.find(
        (piece) => piece.position.x === coords.x && piece.position.y === coords.y
      );
    };
    expect(at("c4")?.type).toBe(PieceType.BISHOP);
    expect(at("f3")?.type).toBe(PieceType.KNIGHT);
    expect(at("e4")?.type).toBe(PieceType.PAWN);
    expect(at("c6")?.type).toBe(PieceType.KNIGHT);
    expect(at("e5")?.type).toBe(PieceType.PAWN);
    expect(at("f1")).toBeUndefined();
    expect(at("g1")).toBeUndefined();
    expect(ITALIAN_GAME_ARROWS).toEqual([
      { from: "g1", to: "f3", color: "#9b74d8" },
      { from: "f1", to: "c4", color: "#9b74d8" },
    ]);
  });

  it("uses a right triangle as the geometry example surface", () => {
    const figure = figureFromTemplate(ABOUT_DEMO_FIGURE_ID);
    expect(figure).toBeTruthy();
    expect(figure?.triangles).toHaveLength(1);
    expect(figure?.points.A && figure?.points.B && figure?.points.C).toBeTruthy();
  });

  it("uses mixed chess and triangle prompts with a capital first letter", () => {
    expect(ABOUT_EXAMPLE_PROMPTS).toEqual([
      "Show Scholar's Mate",
      "Show a right triangle and the altitude to the hypotenuse",
      "Teach me the Italian opening",
      "Teach SAS congruence with two triangles",
    ]);
    ABOUT_EXAMPLE_PROMPTS.forEach((prompt) => {
      expect(prompt.charAt(0)).toMatch(/[A-Z]/);
    });
  });
});

