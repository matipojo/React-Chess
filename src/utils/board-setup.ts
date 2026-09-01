import { initialBoard } from "../Constants";
import { Board } from "../models/Board";
import { Pawn } from "../models/Pawn";
import { Piece } from "../models/Piece";
import { Position } from "../models/Position";
import { PieceType, TeamType } from "../Types";
import { chessNotationToCoordinates } from "./chess-notation-utils";

const FEN_PIECES: { [key: string]: PieceType } = {
  p: PieceType.PAWN,
  n: PieceType.KNIGHT,
  b: PieceType.BISHOP,
  r: PieceType.ROOK,
  q: PieceType.QUEEN,
  k: PieceType.KING,
};

export type PlacedPiece = {
  square: string;
  type: string;
  color: string;
};

export function parsePieceType(value: string): PieceType {
  const normalized = value.toLowerCase();
  const match = Object.keys(PieceType).find(
    (key) => PieceType[key as keyof typeof PieceType] === normalized
  );
  if (!match) {
    throw new Error(`Unknown piece type: ${value}`);
  }
  return PieceType[match as keyof typeof PieceType];
}

export function parseTeam(value: string): TeamType {
  const normalized = value.toLowerCase();
  if (normalized === "w" || normalized === "white") {
    return TeamType.OUR;
  }
  if (normalized === "b" || normalized === "black") {
    return TeamType.OPPONENT;
  }
  throw new Error(`Unknown color: ${value}. Use w or b.`);
}

export function createPiece(
  type: PieceType,
  team: TeamType,
  position: Position,
  hasMoved: boolean
): Piece {
  if (type === PieceType.PAWN) {
    return new Pawn(position, team, hasMoved);
  }
  return new Piece(position, type, team, hasMoved);
}

type CastlingRights = { K: boolean; Q: boolean; k: boolean; q: boolean };

const ALL_CASTLING: CastlingRights = { K: true, Q: true, k: true, q: true };

function parseCastlingRights(field: string | undefined): CastlingRights {
  // Missing or "-" still infers from home squares so learn-mode FEN setups can castle.
  if (!field || field === "-") {
    return ALL_CASTLING;
  }
  return {
    K: field.indexOf("K") >= 0,
    Q: field.indexOf("Q") >= 0,
    k: field.indexOf("k") >= 0,
    q: field.indexOf("q") >= 0,
  };
}

function hasMovedFromPlacement(
  type: PieceType,
  team: TeamType,
  x: number,
  y: number,
  rights: CastlingRights
): boolean {
  if (type === PieceType.PAWN) {
    const startRank = team === TeamType.OUR ? 1 : 6;
    return y !== startRank;
  }
  if (type === PieceType.KING) {
    const homeY = team === TeamType.OUR ? 0 : 7;
    if (x !== 4 || y !== homeY) {
      return true;
    }
    return team === TeamType.OUR ? !(rights.K || rights.Q) : !(rights.k || rights.q);
  }
  if (type === PieceType.ROOK) {
    const homeY = team === TeamType.OUR ? 0 : 7;
    if (y !== homeY) {
      return true;
    }
    if (x === 7) {
      return team === TeamType.OUR ? !rights.K : !rights.k;
    }
    if (x === 0) {
      return team === TeamType.OUR ? !rights.Q : !rights.q;
    }
    return true;
  }
  return true;
}

function pieceAt(
  board: Board,
  x: number,
  y: number,
  team: TeamType,
  test: (piece: Piece) => boolean
): boolean {
  return board.pieces.some(
    (piece) =>
      piece.team === team &&
      piece.position.x === x &&
      piece.position.y === y &&
      !piece.hasMoved &&
      test(piece)
  );
}

export function fenCastlingField(board: Board): string {
  let rights = "";
  const whiteKingHome = pieceAt(board, 4, 0, TeamType.OUR, (p) => p.isKing);
  const blackKingHome = pieceAt(board, 4, 7, TeamType.OPPONENT, (p) => p.isKing);
  if (whiteKingHome) {
    if (pieceAt(board, 7, 0, TeamType.OUR, (p) => p.isRook)) {
      rights += "K";
    }
    if (pieceAt(board, 0, 0, TeamType.OUR, (p) => p.isRook)) {
      rights += "Q";
    }
  }
  if (blackKingHome) {
    if (pieceAt(board, 7, 7, TeamType.OPPONENT, (p) => p.isRook)) {
      rights += "k";
    }
    if (pieceAt(board, 0, 7, TeamType.OPPONENT, (p) => p.isRook)) {
      rights += "q";
    }
  }
  return rights || "-";
}

export function boardFromFen(fen: string, learnMode: boolean): Board {
  const parts = fen.trim().split(/\s+/);
  const placement = parts[0];
  if (!placement) {
    throw new Error("Invalid FEN: missing piece placement");
  }

  const ranks = placement.split("/");
  if (ranks.length !== 8) {
    throw new Error("Invalid FEN: expected 8 ranks");
  }

  const rights = parseCastlingRights(parts[2]);
  const pieces: Piece[] = [];
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    const y = 7 - rankIndex;
    let x = 0;
    const rank = ranks[rankIndex];
    for (let i = 0; i < rank.length; i++) {
      const ch = rank.charAt(i);
      if (ch >= "1" && ch <= "8") {
        x += parseInt(ch, 10);
        continue;
      }
      const type = FEN_PIECES[ch.toLowerCase()];
      if (!type) {
        throw new Error(`Invalid FEN piece: ${ch}`);
      }
      if (x > 7) {
        throw new Error("Invalid FEN: too many squares in a rank");
      }
      const team = ch === ch.toUpperCase() ? TeamType.OUR : TeamType.OPPONENT;
      pieces.push(
        createPiece(
          type,
          team,
          new Position(x, y),
          hasMovedFromPlacement(type, team, x, y, rights)
        )
      );
      x += 1;
    }
    if (x !== 8) {
      throw new Error("Invalid FEN: rank does not cover 8 squares");
    }
  }

  const totalTurns = parts[1] === "b" ? 2 : 1;
  const board = new Board(pieces, totalTurns, learnMode);
  board.winningTeam = undefined;
  board.calculateAllMoves();
  return board;
}

export function boardFromPlacements(
  placements: PlacedPiece[],
  turn: TeamType,
  learnMode: boolean
): Board {
  const pieces = placements.map((placement) => {
    const coords = chessNotationToCoordinates(placement.square.toLowerCase());
    const type = parsePieceType(placement.type);
    const team = parseTeam(placement.color);
    return createPiece(
      type,
      team,
      new Position(coords.x, coords.y),
      hasMovedFromPlacement(type, team, coords.x, coords.y, ALL_CASTLING)
    );
  });

  const totalTurns = turn === TeamType.OPPONENT ? 2 : 1;
  const board = new Board(pieces, totalTurns, learnMode);
  board.winningTeam = undefined;
  board.calculateAllMoves();
  return board;
}

export function startingLearnBoard(): Board {
  const board = initialBoard.clone();
  board.learnMode = true;
  board.winningTeam = undefined;
  board.calculateAllMoves();
  return board;
}

export function startingPlayBoard(): Board {
  const board = initialBoard.clone();
  board.learnMode = false;
  board.winningTeam = undefined;
  board.calculateAllMoves();
  return board;
}

const FEN_LETTER: { [type: string]: string } = {
  pawn: "p",
  knight: "n",
  bishop: "b",
  rook: "r",
  queen: "q",
  king: "k",
};

export function boardToFen(board: Board): string {
  const ranks: string[] = [];
  for (let y = 7; y >= 0; y--) {
    let empty = 0;
    let rank = "";
    for (let x = 0; x < 8; x++) {
      const piece = board.pieces.find(
        (item) => item.position.x === x && item.position.y === y
      );
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty > 0) {
        rank += String(empty);
        empty = 0;
      }
      const letter = FEN_LETTER[piece.type] || "p";
      rank += piece.team === TeamType.OUR ? letter.toUpperCase() : letter;
    }
    if (empty > 0) {
      rank += String(empty);
    }
    ranks.push(rank);
  }
  const turn = board.currentTeam === TeamType.OPPONENT ? "b" : "w";
  return `${ranks.join("/")} ${turn} ${fenCastlingField(board)} - 0 1`;
}
