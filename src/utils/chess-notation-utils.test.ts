import { Position } from "../models/Position";
import { PieceType, TeamType } from "../Types";
import { startingLearnBoard } from "./board-setup";
import { chessNotationToCoordinates, parseMoveNotation } from "./chess-notation-utils";

describe("parseMoveNotation", () => {
  it("accepts from:to, glued squares, and SAN on a live board", () => {
    const board = startingLearnBoard();
    expect(parseMoveNotation("e2:e4")).toEqual({ from: "e2", to: "e4" });
    expect(parseMoveNotation("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(parseMoveNotation("e4", board)).toEqual({ from: "e2", to: "e4" });
    expect(parseMoveNotation("Nf3", board)).toEqual({ from: "g1", to: "f3" });
  });

  it("plays the coached SAN opening e4 e5 Nf3 Nc6", () => {
    const board = startingLearnBoard();
    ["e4", "e5", "Nf3", "Nc6"].forEach((move) => {
      const parsed = parseMoveNotation(move, board);
      const from = chessNotationToCoordinates(parsed.from);
      const to = chessNotationToCoordinates(parsed.to);
      expect(
        board.tryPlayMove(new Position(from.x, from.y), new Position(to.x, to.y), {
          ignoreTurn: true,
        })
      ).toBe(true);
    });
  });

  it("returns a JSON-friendly error for SAN without a board", () => {
    expect(() => parseMoveNotation("e4")).toThrow(/SAN|from:to/);
  });
});

describe("starting possible moves", () => {
  it("does not list off-board squares for the blocked c8 bishop", () => {
    const board = startingLearnBoard();
    const bishop = board.pieces.find(
      (piece) =>
        piece.type === PieceType.BISHOP &&
        piece.team === TeamType.OPPONENT &&
        piece.position.x === 2 &&
        piece.position.y === 7
    );
    expect(bishop).toBeTruthy();
    const moves = bishop!.possibleMoves || [];
    expect(moves).toHaveLength(0);
    expect(moves.every((move) => move.x >= 0 && move.x <= 7 && move.y >= 0 && move.y <= 7)).toBe(
      true
    );
  });

  it("keeps knight jumps on the board", () => {
    const board = startingLearnBoard();
    const knight = board.pieces.find(
      (piece) =>
        piece.type === PieceType.KNIGHT &&
        piece.team === TeamType.OUR &&
        piece.position.x === 1 &&
        piece.position.y === 0
    );
    const moves = knight!.possibleMoves || [];
    expect(moves.every((move) => move.x >= 0 && move.x <= 7 && move.y >= 0 && move.y <= 7)).toBe(
      true
    );
    expect(moves.map((move) => `${move.x},${move.y}`).sort()).toEqual(["0,2", "2,2"]);
  });
});
