import { TeamType } from "../Types";

export function coordinatesToNotation(x: number, y: number): string {
  return `${String.fromCharCode("a".charCodeAt(0) + x)}${y + 1}`;
}

export function expandCastleNotation(
  notation: string,
  team: TeamType
): { from: string; to: string } | null {
  const compact = notation.trim().replace(/\s/g, "");
  const queenside = /^(O-O-O|0-0-0)$/i.test(compact);
  const kingside = /^(O-O|0-0)$/i.test(compact);
  if (!queenside && !kingside) {
    return null;
  }
  const white = team === TeamType.OUR;
  if (queenside) {
    return { from: white ? "e1" : "e8", to: white ? "c1" : "c8" };
  }
  return { from: white ? "e1" : "e8", to: white ? "g1" : "g8" };
}

export function chessNotationToCoordinates(notation: string): { x: number; y: number } {
  if (!/^[a-h][1-8]$/.test(notation)) {
    throw new Error(`Invalid chess notation: ${notation}. Expected format like 'e4', 'a1', etc.`);
  }

  const file = notation.charAt(0);
  const rank = parseInt(notation.charAt(1));

  return {
    x: file.charCodeAt(0) - 'a'.charCodeAt(0),
    y: rank - 1,
  };
}

export function parseMoveNotation(moveNotation: string): { from: string; to: string } {
  const [fromNotation, toNotation] = moveNotation.split(':');

  if (!fromNotation || !toNotation) {
    throw new Error(`Invalid move format: ${moveNotation}. Expected format: "from:to" (e.g., "e2:e4")`);
  }

  return { from: fromNotation, to: toNotation };
}

export function parseMoveOrCastle(
  notation: string,
  team: TeamType
): { from: string; to: string } {
  const castle = expandCastleNotation(notation, team);
  if (castle) {
    return castle;
  }
  return parseMoveNotation(notation);
}
