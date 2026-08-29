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
      pieces.push(createPiece(type, team, new Position(x, y), true));
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
    const onStartRank =
      type === PieceType.PAWN &&
      ((team === TeamType.OUR && coords.y === 1) ||
        (team === TeamType.OPPONENT && coords.y === 6));
    return createPiece(
      type,
      team,
      new Position(coords.x, coords.y),
      !onStartRank
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
