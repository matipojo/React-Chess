import { Position } from "./Position";
import { TeamType } from "../Types";
import {
  boardFromFen,
  boardFromPlacements,
  boardToFen,
  startingLearnBoard,
} from "../utils/board-setup";
import { applyMovesToBoard } from "../lessons/stepPlay";
import { chessNotationToCoordinates } from "../utils/chess-notation-utils";
import { Board } from "./Board";

function pieceAt(board: Board, square: string) {
  const coords = chessNotationToCoordinates(square);
  return board.pieces.find(
    (piece) => piece.position.x === coords.x && piece.position.y === coords.y
  );
}

function canGo(board: Board, from: string, to: string): boolean {
  const piece = pieceAt(board, from);
  const dest = chessNotationToCoordinates(to);
  return (
    piece?.possibleMoves?.some((move) => move.x === dest.x && move.y === dest.y) ??
    false
  );
}

function play(board: Board, from: string, to: string): boolean {
  const start = chessNotationToCoordinates(from);
  const end = chessNotationToCoordinates(to);
  return board.tryPlayMove(
    new Position(start.x, start.y),
    new Position(end.x, end.y),
    { ignoreTurn: true }
  );
}

describe("castling in learn mode", () => {
  it("keeps starting-position castling rights in FEN", () => {
    const fen = boardToFen(startingLearnBoard());
    expect(fen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
    const restored = boardFromFen(fen, true);
    expect(pieceAt(restored, "e1")?.hasMoved).toBe(false);
    expect(pieceAt(restored, "h1")?.hasMoved).toBe(false);
    expect(pieceAt(restored, "a1")?.hasMoved).toBe(false);
  });

  it("allows kingside castling after a FEN setup with a clear path", () => {
    const board = boardFromFen(
      "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      true
    );
    expect(canGo(board, "e1", "g1")).toBe(true);
    expect(canGo(board, "e1", "h1")).toBe(true);
    expect(play(board, "e1", "g1")).toBe(true);
    expect(pieceAt(board, "g1")?.isKing).toBe(true);
    expect(pieceAt(board, "f1")?.isRook).toBe(true);
    expect(pieceAt(board, "g1")?.hasMoved).toBe(true);
    expect(pieceAt(board, "f1")?.hasMoved).toBe(true);
  });

  it("allows castling from a teaching FEN that omits the rights field", () => {
    const board = boardFromFen("4k2r/8/8/8/8/8/8/4K2R w - - 0 1", true);
    expect(play(board, "e1", "g1")).toBe(true);
    expect(pieceAt(board, "g1")?.isKing).toBe(true);
    expect(pieceAt(board, "f1")?.isRook).toBe(true);
  });

  it("still lets the king castle by dropping onto the rook", () => {
    const board = boardFromFen("4k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", true);
    expect(play(board, "e1", "a1")).toBe(true);
    expect(pieceAt(board, "c1")?.isKing).toBe(true);
    expect(pieceAt(board, "d1")?.isRook).toBe(true);
  });

  it("honors an explicit FEN that only allows kingside", () => {
    const board = boardFromFen("r3k2r/8/8/8/8/8/8/R3K2R w K - 0 1", true);
    expect(canGo(board, "e1", "g1")).toBe(true);
    expect(canGo(board, "e1", "c1")).toBe(false);
  });

  it("allows castling from a placed king and rook on their home squares", () => {
    const board = boardFromPlacements(
      [
        { square: "e1", type: "king", color: "w" },
        { square: "h1", type: "rook", color: "w" },
        { square: "e8", type: "king", color: "b" },
      ],
      TeamType.OUR,
      true
    );
    expect(play(board, "e1", "g1")).toBe(true);
    expect(pieceAt(board, "g1")?.isKing).toBe(true);
    expect(pieceAt(board, "f1")?.isRook).toBe(true);
  });

  it("plays O-O in a learn-mode move list", () => {
    const board = startingLearnBoard();
    expect(
      applyMovesToBoard(board, [
        "e2:e4",
        "e7:e5",
        "g1:f3",
        "b8:c6",
        "f1:c4",
        "g8:f6",
        "O-O",
      ])
    ).toBe(true);
    expect(pieceAt(board, "g1")?.isKing).toBe(true);
    expect(pieceAt(board, "f1")?.isRook).toBe(true);
  });
});
