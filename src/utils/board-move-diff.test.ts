import { Position } from "../models/Position";
import { boardFromFen } from "./board-setup";
import { pieceMoveBetween } from "./board-move-diff";

function play(fen: string, from: [number, number], to: [number, number]) {
  const before = boardFromFen(fen, true);
  const after = before.clone();
  const ok = after.tryPlayMove(new Position(from[0], from[1]), new Position(to[0], to[1]), {
    ignoreTurn: true,
  });
  expect(ok).toBe(true);
  return { before, after };
}

describe("pieceMoveBetween", () => {
  it("finds a knight going back from f3 to g1", () => {
    const { before, after } = play(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      [6, 0],
      [5, 2]
    );
    const reverse = pieceMoveBetween(after, before);
    expect(reverse).toEqual({
      from: new Position(5, 2),
      to: new Position(6, 0),
      team: "w",
    });
    const forward = pieceMoveBetween(before, after);
    expect(forward).toEqual({
      from: new Position(6, 0),
      to: new Position(5, 2),
      team: "w",
    });
  });

  it("follows a capturing piece back to its origin", () => {
    const { before, after } = play(
      "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1",
      [4, 3],
      [3, 4]
    );
    const reverse = pieceMoveBetween(after, before);
    expect(reverse?.from).toEqual(new Position(3, 4));
    expect(reverse?.to).toEqual(new Position(4, 3));
    expect(reverse?.team).toBe("w");
  });

  it("prefers the king when undoing a castle", () => {
    const { before, after } = play("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", [4, 0], [6, 0]);
    const reverse = pieceMoveBetween(after, before);
    expect(reverse).toEqual({
      from: new Position(6, 0),
      to: new Position(4, 0),
      team: "w",
    });
  });

  it("returns null when the pieces did not move", () => {
    const board = boardFromFen("8/8/8/8/8/8/8/4K3 w - - 0 1", true);
    expect(pieceMoveBetween(board, board.clone())).toBeNull();
  });
});
