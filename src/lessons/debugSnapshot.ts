import { GRID_SIZE } from "../Constants";
import { Board } from "../models/Board";
import { chessNotationToCoordinates, coordinatesToNotation } from "../utils/chess-notation-utils";
import { BoardArrow, BoardHighlight } from "./types";

export function piecesForDebug(board: Board) {
  return board.pieces.map((piece) => ({
    type: piece.type,
    team: piece.team,
    square: coordinatesToNotation(piece.position.x, piece.position.y),
    x: piece.position.x,
    y: piece.position.y,
  }));
}

export function arrowGeometry(arrow: BoardArrow) {
  try {
    const from = chessNotationToCoordinates(arrow.from.toLowerCase());
    const to = chessNotationToCoordinates(arrow.to.toLowerCase());
    return {
      from: arrow.from,
      to: arrow.to,
      color: arrow.color || "#ffc107",
      coords: { from, to },
      svg: {
        x1: from.x * GRID_SIZE + GRID_SIZE / 2,
        y1: (7 - from.y) * GRID_SIZE + GRID_SIZE / 2,
        x2: to.x * GRID_SIZE + GRID_SIZE / 2,
        y2: (7 - to.y) * GRID_SIZE + GRID_SIZE / 2,
      },
      gridSizeConstant: GRID_SIZE,
      viewBox: "0 0 600 600",
    };
  } catch (error) {
    return {
      from: arrow.from,
      to: arrow.to,
      error: `${error}`,
    };
  }
}

export function overlaySnapshot(args: {
  highlights: BoardHighlight[];
  arrows: BoardArrow[];
  coachTitle?: string | null;
}) {
  return {
    highlights: args.highlights.map((item) => ({ ...item })),
    arrows: args.arrows.map((arrow) => arrowGeometry(arrow)),
    coachTitle: args.coachTitle || null,
  };
}

export function rectSnapshot(el: Element | null) {
  if (!el) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
  };
}
