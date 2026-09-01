import {
  compactPaintDetail,
  compactToolResult,
  fenForDebug,
  overlaySnapshot,
  paintFingerprint,
} from "./debugSnapshot";
import { startingLearnBoard } from "../utils/board-setup";

describe("debug snapshots", () => {
  it("logs the board as FEN instead of every piece", () => {
    const board = startingLearnBoard();
    expect(fenForDebug(board)).toMatch(/^rnbqkbnr\/pppppppp\/8\/8\/8\/8\/PPPPPPPP\/RNBQKBNR /);
  });

  it("keeps overlays as squares and from-to colors", () => {
    expect(
      overlaySnapshot({
        highlights: [{ square: "f3", kind: "correct" }],
        arrows: [{ from: "g1", to: "f3", color: "green" }],
        coachTitle: "Knights",
      })
    ).toEqual({
      highlights: [{ kind: "correct", square: "f3" }],
      arrows: [{ from: "g1", to: "f3", color: "green" }],
      coachTitle: "Knights",
    });
  });

  it("ignores hover peek arrows in paint fingerprints", () => {
    expect(
      paintFingerprint([
        { from: "g1", to: "f3", color: "green" },
        { from: "f3", to: "g1", color: "#81d4fa" },
      ])
    ).toBe("g1:f3:green");
  });

  it("omits layout math for the usual 2px board/svg gap", () => {
    expect(
      compactPaintDetail({
        arrows: [{ from: "g1", to: "f3", color: "green" }],
        tileSizePx: 75.25,
        boardOffsetVsSvg: { dx: 0, dy: 0, dw: 2, dh: 2 },
      })
    ).toEqual({
      arrowCount: 1,
      arrows: [{ from: "g1", to: "f3", color: "green" }],
      tileSizePx: 75.3,
    });
  });

  it("includes offset when the overlay is actually shifted", () => {
    expect(
      compactPaintDetail({
        arrows: [{ from: "g1", to: "f3", color: "green" }],
        tileSizePx: 75,
        boardOffsetVsSvg: { dx: 18, dy: 0, dw: 0, dh: 0 },
      }).misaligned
    ).toBe(true);
  });

  it("strips piece lists and possibleMoves from tool results", () => {
    expect(
      compactToolResult({
        success: true,
        message: "Board state retrieved successfully",
        data: {
          learnMode: true,
          totalTurns: 2,
          currentTeamTurn: "b",
          pieces: [{ type: "pawn", team: "w", position: { x: 4, y: 3 }, possibleMoves: [{ x: 4, y: 4 }] }],
        },
      })
    ).toEqual({
      success: true,
      message: "Board state retrieved successfully",
      data: {
        learnMode: true,
        totalTurns: 2,
        currentTeamTurn: "b",
        pieceCount: 1,
      },
    });
  });
});
