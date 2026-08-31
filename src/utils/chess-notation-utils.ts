import { Board } from "../models/Board";
import { Position } from "../models/Position";
import { PieceType, TeamType } from "../Types";

const SAN_PIECE: { [letter: string]: PieceType } = {
  N: PieceType.KNIGHT,
  B: PieceType.BISHOP,
  R: PieceType.ROOK,
  Q: PieceType.QUEEN,
  K: PieceType.KING,
};

export function coordinatesToNotation(x: number, y: number): string {
  return `${String.fromCharCode("a".charCodeAt(0) + x)}${y + 1}`;
}

export function chessNotationToCoordinates(notation: string): { x: number; y: number } {
  if (!/^[a-h][1-8]$/.test(notation)) {
    throw new Error(`Invalid chess notation: ${notation}. Expected format like 'e4', 'a1', etc.`);
  }

  const file = notation.charAt(0);
  const rank = parseInt(notation.charAt(1));

  return {
    x: file.charCodeAt(0) - "a".charCodeAt(0),
    y: rank - 1,
  };
}

function stripMoveNumber(raw: string): string {
  return raw.trim().replace(/^\d+\.+\s*/, "");
}

function parseExplicitMove(moveNotation: string): { from: string; to: string } | null {
  const compact = stripMoveNumber(moveNotation).replace(/\s/g, "");
  const coord = compact.match(/^([a-h][1-8])[-:x–—→]([a-h][1-8])$/i);
  if (coord) {
    return { from: coord[1].toLowerCase(), to: coord[2].toLowerCase() };
  }
  const glued = compact.match(/^([a-h][1-8])([a-h][1-8])$/i);
  if (glued) {
    return { from: glued[1].toLowerCase(), to: glued[2].toLowerCase() };
  }
  return null;
}

function resolveCastle(board: Board, queenside: boolean): { from: string; to: string } {
  const team = board.currentTeam;
  const king = board.pieces.find((piece) => piece.isKing && piece.team === team);
  if (!king) {
    throw new Error(`No ${team === TeamType.OUR ? "white" : "black"} king to castle.`);
  }
  const rookX = queenside ? 0 : 7;
  const dest = (king.possibleMoves || []).find(
    (move) => move.y === king.position.y && move.x === rookX
  );
  if (!dest) {
    throw new Error(`${queenside ? "Queenside" : "Kingside"} castle is not legal.`);
  }
  return {
    from: coordinatesToNotation(king.position.x, king.position.y),
    to: coordinatesToNotation(dest.x, dest.y),
  };
}

function resolveSan(moveNotation: string, board: Board): { from: string; to: string } {
  const compact = stripMoveNumber(moveNotation)
    .replace(/\s/g, "")
    .replace(/[!?]+$/g, "")
    .replace(/[+#]+$/g, "");

  if (compact === "O-O" || compact === "0-0") {
    return resolveCastle(board, false);
  }
  if (compact === "O-O-O" || compact === "0-0-0") {
    return resolveCastle(board, true);
  }

  const pieceSan = compact.match(/^([NBRQK])([a-h])?([1-8])?(x)?([a-h][1-8])(?:=[NBRQ])?$/);
  const pawnCapture = compact.match(/^([a-h])x([a-h][1-8])(?:=[NBRQ])?$/);
  const pawnPush = compact.match(/^([a-h][1-8])(?:=[NBRQ])?$/);

  let pieceType: PieceType;
  let dest: string;
  let fromFile: string | undefined;
  let fromRank: string | undefined;

  if (pieceSan) {
    pieceType = SAN_PIECE[pieceSan[1]];
    fromFile = pieceSan[2];
    fromRank = pieceSan[3];
    dest = pieceSan[5].toLowerCase();
  } else if (pawnCapture) {
    pieceType = PieceType.PAWN;
    fromFile = pawnCapture[1];
    dest = pawnCapture[2].toLowerCase();
  } else if (pawnPush) {
    pieceType = PieceType.PAWN;
    dest = pawnPush[1].toLowerCase();
    fromFile = dest.charAt(0);
  } else {
    throw new Error(
      `Invalid move format: ${moveNotation}. Use SAN (e4, Nf3) or from:to (e2:e4).`
    );
  }

  const destCoords = chessNotationToCoordinates(dest);
  const destPos = new Position(destCoords.x, destCoords.y);
  const team = board.currentTeam;
  const candidates = board.pieces.filter((piece) => {
    if (piece.team !== team || piece.type !== pieceType) {
      return false;
    }
    const from = coordinatesToNotation(piece.position.x, piece.position.y);
    if (fromFile && from.charAt(0) !== fromFile) {
      return false;
    }
    if (fromRank && from.charAt(1) !== fromRank) {
      return false;
    }
    return (piece.possibleMoves || []).some((move) => move.samePosition(destPos));
  });

  if (candidates.length === 0) {
    throw new Error(`No legal move ${moveNotation} for the side to move.`);
  }
  if (candidates.length > 1) {
    throw new Error(`Ambiguous move ${moveNotation}. Use from:to, e.g. e2:e4.`);
  }

  return {
    from: coordinatesToNotation(candidates[0].position.x, candidates[0].position.y),
    to: dest,
  };
}

export function parseMoveNotation(
  moveNotation: string,
  board?: Board
): { from: string; to: string } {
  const explicit = parseExplicitMove(moveNotation);
  if (explicit) {
    return explicit;
  }
  if (board) {
    return resolveSan(moveNotation, board);
  }
  throw new Error(
    `Invalid move format: ${moveNotation}. Expected SAN (e4, Nf3) or from:to (e.g., e2:e4).`
  );
}

export function moveNotationToPositions(
  moveNotation: string,
  board: Board
): { from: Position; to: Position } {
  const parsed = parseMoveNotation(moveNotation, board);
  const fromCoords = chessNotationToCoordinates(parsed.from);
  const toCoords = chessNotationToCoordinates(parsed.to);
  return {
    from: new Position(fromCoords.x, fromCoords.y),
    to: new Position(toCoords.x, toCoords.y),
  };
}
