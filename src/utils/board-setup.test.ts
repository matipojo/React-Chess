import { initialBoard } from "../Constants";
import { boardFromFen, boardToFen } from "./board-setup";

describe("board FEN", () => {
  it("round-trips the starting position", () => {
    const fen = boardToFen(initialBoard);
    expect(fen.startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")).toBe(
      true
    );
    const restored = boardFromFen(fen, true);
    expect(boardToFen(restored).split(" ")[0]).toBe(fen.split(" ")[0]);
  });
});
