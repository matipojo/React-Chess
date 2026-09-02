import { Board } from "../models/Board";
import { Piece } from "../models/Piece";
import { Position } from "../models/Position";

export type PieceTravel = {
  from: Position;
  to: Position;
  team: "w" | "b";
};

function sameIdentity(a: Piece, b: Piece): boolean {
  return a.type === b.type && a.team === b.team;
}

function pieceAt(board: Board, position: Position): Piece | undefined {
  return board.pieces.find((piece) => piece.samePosition(position));
}

function unmatched(fromBoard: Board, toBoard: Board): Piece[] {
  return fromBoard.pieces.filter((piece) => {
    const other = pieceAt(toBoard, piece.position);
    return !other || !sameIdentity(piece, other);
  });
}

/**
 * Path of a piece that must travel from `fromBoard` onto `toBoard`.
 * Used to animate undo (after → before) and redo (before → after).
 */
export function pieceMoveBetween(fromBoard: Board, toBoard: Board): PieceTravel | null {
  const departed = unmatched(fromBoard, toBoard);
  const arrived = unmatched(toBoard, fromBoard);
  if (!departed.length || !arrived.length) {
    return null;
  }

  const used = new Set<Piece>();
  const matches: { from: Piece; to: Piece }[] = [];

  const take = (piece: Piece, same: (candidate: Piece) => boolean) => {
    if (matches.some((item) => item.from === piece)) {
      return;
    }
    const hit = arrived.find((candidate) => !used.has(candidate) && same(candidate));
    if (!hit) {
      return;
    }
    matches.push({ from: piece, to: hit });
    used.add(hit);
  };

  departed.forEach((piece) => take(piece, (candidate) => sameIdentity(piece, candidate)));
  departed.forEach((piece) => take(piece, (candidate) => candidate.team === piece.team));

  if (!matches.length) {
    return null;
  }

  const king = matches.find((item) => item.from.isKing);
  const chosen =
    matches.length === 1 ? matches[0] : king && matches.length === 2 ? king : null;
  if (!chosen) {
    return null;
  }

  return {
    from: chosen.from.position.clone(),
    to: chosen.to.position.clone(),
    team: chosen.from.team as "w" | "b",
  };
}
