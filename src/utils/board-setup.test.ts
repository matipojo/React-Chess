import { initialBoard } from "../Constants";
import { boardFromFen, boardToFen } from "./board-setup";

describe("board FEN", () => {
  it("round-trips the starting position", () => {
    const fen = boardToFen(initialBoard);
    expect(fen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
    const restored = boardFromFen(fen, true);
    expect(boardToFen(restored)).toBe(fen);
  });
});
