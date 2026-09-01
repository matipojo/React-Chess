import { boardFromFen } from "../../utils/board-setup";
import { chessNotationToCoordinates } from "../../utils/chess-notation-utils";
import { PieceType } from "../../Types";
import { ITALIAN_GAME_ARROWS, ITALIAN_GAME_FEN } from "./aboutDemo";

describe("about demo position", () => {
  it("uses the Italian Game after Bc4", () => {
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
});
