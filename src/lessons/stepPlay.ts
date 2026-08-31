import { Board } from "../models/Board";
import { Position } from "../models/Position";
import { tokenizeChessText } from "../utils/chess-text-links";
import { boardFromFen, boardToFen } from "../utils/board-setup";
import { chessNotationToCoordinates, parseMoveNotation } from "../utils/chess-notation-utils";

export type MovePlayStatus = "ready" | "done" | "blocked";

export type CoachPlayMove = {
  notation: string;
  status: MovePlayStatus;
};

export function extractFromToMoves(text: string): string[] {
  if (!text) {
    return [];
  }
  const found: string[] = [];
  tokenizeChessText(text).forEach((part) => {
    if (part.type !== "ref") {
      return;
    }
    const notation = fromToNotation(part.value, part.squares, part.dest);
    if (notation && found.indexOf(notation) === -1) {
      found.push(notation);
    }
  });
  return found;
}

export function fromToNotation(
  raw: string,
  squares: string[],
  dest?: string
): string | null {
  if (dest && squares.length >= 2 && /^[a-h][1-8]$/.test(squares[0]) && squares[0] !== dest) {
    return `${squares[0]}:${dest}`;
  }
  const compact = raw.replace(/\s/g, "");
  const coord = compact.match(/^([a-h][1-8])[-:x–—→]([a-h][1-8])/i);
  if (coord) {
    return `${coord[1].toLowerCase()}:${coord[2].toLowerCase()}`;
  }
  return null;
}

export function applyMovesToBoard(board: Board, moves: string[]): boolean {
  for (let i = 0; i < moves.length; i++) {
    let parsed: { from: string; to: string };
    try {
      parsed = parseMoveNotation(moves[i]);
    } catch {
      return false;
    }
    const fromCoords = chessNotationToCoordinates(parsed.from);
    const toCoords = chessNotationToCoordinates(parsed.to);
    const from = new Position(fromCoords.x, fromCoords.y);
    const to = new Position(toCoords.x, toCoords.y);
    const ok =
      board.tryPlayMove(from, to, { ignoreTurn: true }) ||
      board.tryPlayMove(from, to, { ignoreTurn: true, ignoreLegality: true });
    if (!ok) {
      return false;
    }
  }
  board.learnMode = true;
  board.winningTeam = undefined;
  board.calculateAllMoves();
  return true;
}

export function fenPlacement(fen: string): string {
  return fen.trim().split(/\s+/)[0] || "";
}

export function shouldApplySavedStepFen(input: {
  stepFen?: string;
  currentFen: string;
  startingFen: string;
  isFirst: boolean;
}): boolean {
  if (!input.stepFen) {
    return false;
  }
  if (input.isFirst) {
    return true;
  }
  const saved = fenPlacement(input.stepFen);
  const start = fenPlacement(input.startingFen);
  const current = fenPlacement(input.currentFen);
  return !(saved === start && current !== start);
}

export function fenAfterMoves(fen: string, moves: string[]): string | null {
  try {
    const board = boardFromFen(fen, true);
    if (!applyMovesToBoard(board, moves)) {
      return null;
    }
    return boardToFen(board);
  } catch {
    return null;
  }
}

function squareOccupied(board: Board, square: string): boolean {
  const coords = chessNotationToCoordinates(square);
  const position = new Position(coords.x, coords.y);
  return board.pieces.some((item) => item.samePosition(position));
}

function canPlayOnBoard(board: Board, fromName: string, toName: string): boolean {
  const fromCoords = chessNotationToCoordinates(fromName);
  const toCoords = chessNotationToCoordinates(toName);
  const from = new Position(fromCoords.x, fromCoords.y);
  const to = new Position(toCoords.x, toCoords.y);
  const piece = board.pieces.find((item) => item.samePosition(from));
  if (!piece) {
    return false;
  }
  if ((piece.possibleMoves || []).some((move) => move.samePosition(to))) {
    return true;
  }
  const clone = board.clone();
  return (
    clone.tryPlayMove(from.clone(), to.clone(), { ignoreTurn: true }) ||
    clone.tryPlayMove(from.clone(), to.clone(), { ignoreTurn: true, ignoreLegality: true })
  );
}

export function coachPlayMoves(args: {
  board: Board;
  moves: string[];
  fromFen?: string;
  currentFen: string;
}): CoachPlayMove[] {
  const unique: string[] = [];
  args.moves.forEach((move) => {
    const key = move.trim();
    if (key && unique.indexOf(key) === -1) {
      unique.push(key);
    }
  });

  return unique.map((notation, index) => {
    let parsed: { from: string; to: string };
    try {
      parsed = parseMoveNotation(notation);
    } catch {
      return { notation, status: "blocked" as MovePlayStatus };
    }

    if (args.fromFen) {
      const before = index === 0 ? args.fromFen : fenAfterMoves(args.fromFen, unique.slice(0, index));
      const after = fenAfterMoves(args.fromFen, unique.slice(0, index + 1));
      const now = fenPlacement(args.currentFen);
      if (after && now === fenPlacement(after)) {
        return { notation, status: "done" };
      }
      if (before && now === fenPlacement(before)) {
        return { notation, status: "ready" };
      }
    }

    const previousDone = unique.slice(0, index).every((prior) => {
      try {
        const priorParsed = parseMoveNotation(prior);
        return !squareOccupied(args.board, priorParsed.from);
      } catch {
        return false;
      }
    });
    if (canPlayOnBoard(args.board, parsed.from, parsed.to) && previousDone) {
      return { notation, status: "ready" };
    }
    if (!squareOccupied(args.board, parsed.from) && previousDone) {
      return { notation, status: "done" };
    }
    return { notation, status: "blocked" };
  });
}

export function matchPlayMove(
  playMoves: CoachPlayMove[] | undefined,
  raw: string,
  squares: string[],
  dest?: string
): CoachPlayMove | undefined {
  if (!playMoves || playMoves.length === 0) {
    return undefined;
  }
  const fromTo = fromToNotation(raw, squares, dest);
  if (fromTo) {
    const hit = playMoves.find((item) => item.notation === fromTo);
    if (hit) {
      return hit;
    }
  }
  if (!dest) {
    return undefined;
  }
  const hits = playMoves.filter((item) => {
    try {
      return parseMoveNotation(item.notation).to === dest;
    } catch {
      return false;
    }
  });
  if (hits.length === 1) {
    return hits[0];
  }
  const ready = hits.filter((item) => item.status === "ready");
  if (ready.length === 1) {
    return ready[0];
  }
  return undefined;
}

export function resolveStepMoves(what?: string, listed?: string[]): string[] {
  if (listed && listed.length) {
    return listed.filter(Boolean);
  }
  return extractFromToMoves(what || "");
}
