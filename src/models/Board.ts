import {
  getPossibleBishopMoves,
  getPossibleKingMoves,
  getPossibleKnightMoves,
  getPossiblePawnMoves,
  getPossibleQueenMoves,
  getPossibleRookMoves,
  getCastlingMoves,
} from "../referee/rules";
import { PieceType, TeamType } from "../Types";
import { Pawn } from "./Pawn";
import { Piece } from "./Piece";
import { Position } from "./Position";

export class Board {
  pieces: Piece[];
  totalTurns: number;
  winningTeam?: TeamType;
  learnMode: boolean;

  constructor(pieces: Piece[], totalTurns: number, learnMode: boolean = false) {
    this.pieces = pieces;
    this.totalTurns = totalTurns;
    this.learnMode = learnMode;
  }

  get currentTeam(): TeamType {
    return this.totalTurns % 2 === 0 ? TeamType.OPPONENT : TeamType.OUR;
  }

  calculateAllMoves() {
    // Calculate the moves of all the pieces
    for (const piece of this.pieces) {
      piece.possibleMoves = this.getValidMoves(piece, this.pieces);
    }

    // Calculate castling moves
    for (const king of this.pieces.filter((p) => p.isKing)) {
      if (king.possibleMoves === undefined) continue;

      king.possibleMoves = [
        ...king.possibleMoves,
        ...getCastlingMoves(king, this.pieces),
      ];
    }

    const hasKing = this.pieces.some(
      (p) => p.isKing && p.team === this.currentTeam
    );
    if (hasKing) {
      this.checkCurrentTeamMoves();
    }

    if (this.learnMode) {
      return;
    }

    // Remove the posibble moves for the team that is not playing
    for (const piece of this.pieces.filter(
      (p) => p.team !== this.currentTeam
    )) {
      piece.possibleMoves = [];
    }

    // Check if the playing team still has moves left
    // Otherwise, checkmate!
    if (
      this.pieces
        .filter((p) => p.team === this.currentTeam)
        .some(
          (p) => p.possibleMoves !== undefined && p.possibleMoves.length > 0
        )
    )
      return;

    this.winningTeam =
      this.currentTeam === TeamType.OUR ? TeamType.OPPONENT : TeamType.OUR;
  }

  checkCurrentTeamMoves() {
    // Loop through all the current team's pieces
    for (const piece of this.pieces.filter(
      (p) => p.team === this.currentTeam
    )) {
      if (piece.possibleMoves === undefined) continue;

      // Simulate all the piece moves
      for (const move of piece.possibleMoves) {
        const simulatedBoard = this.clone();

        // Remove the piece at the destination position
        simulatedBoard.pieces = simulatedBoard.pieces.filter(
          (p) => !p.samePosition(move)
        );

        // Get the piece of the cloned board
        const clonedPiece = simulatedBoard.pieces.find((p) =>
          p.samePiecePosition(piece)
        )!;
        clonedPiece.position = move.clone();

        // Get the king of the cloned board
        const clonedKing = simulatedBoard.pieces.find(
          (p) => p.isKing && p.team === simulatedBoard.currentTeam
        );
        if (!clonedKing) {
          continue;
        }

        // Loop through all enemy pieces, update their possible moves
        // And check if the current team's king will be in danger
        for (const enemy of simulatedBoard.pieces.filter(
          (p) => p.team !== simulatedBoard.currentTeam
        )) {
          enemy.possibleMoves = simulatedBoard.getValidMoves(
            enemy,
            simulatedBoard.pieces
          );

          if (enemy.isPawn) {
            if (
              enemy.possibleMoves.some(
                (m) =>
                  m.x !== enemy.position.x &&
                  m.samePosition(clonedKing.position)
              )
            ) {
              piece.possibleMoves = piece.possibleMoves?.filter(
                (m) => !m.samePosition(move)
              );
            }
          } else {
            if (
              enemy.possibleMoves.some((m) =>
                m.samePosition(clonedKing.position)
              )
            ) {
              piece.possibleMoves = piece.possibleMoves?.filter(
                (m) => !m.samePosition(move)
              );
            }
          }
        }
      }
    }
  }

  getValidMoves(piece: Piece, boardState: Piece[]): Position[] {
    let moves: Position[] = [];
    switch (piece.type) {
      case PieceType.PAWN:
        moves = getPossiblePawnMoves(piece, boardState);
        break;
      case PieceType.KNIGHT:
        moves = getPossibleKnightMoves(piece, boardState);
        break;
      case PieceType.BISHOP:
        moves = getPossibleBishopMoves(piece, boardState);
        break;
      case PieceType.ROOK:
        moves = getPossibleRookMoves(piece, boardState);
        break;
      case PieceType.QUEEN:
        moves = getPossibleQueenMoves(piece, boardState);
        break;
      case PieceType.KING:
        moves = getPossibleKingMoves(piece, boardState);
        break;
      default:
        return [];
    }
    return moves.filter((move) => move.x >= 0 && move.x <= 7 && move.y >= 0 && move.y <= 7);
  }

  playMove(
    enPassantMove: boolean,
    validMove: boolean,
    playedPiece: Piece,
    destination: Position
  ): boolean {
    const pawnDirection = playedPiece.team === TeamType.OUR ? 1 : -1;
    const origin = playedPiece.position.clone();
    const destinationPiece = this.pieces.find((p) =>
      p.samePosition(destination)
    );

    // If the move is a castling move do this
    if (
      playedPiece.isKing &&
      destinationPiece?.isRook &&
      destinationPiece.team === playedPiece.team
    ) {
      const direction =
        destinationPiece.position.x - origin.x > 0 ? 1 : -1;
      const newKingXPosition = origin.x + direction * 2;
      this.pieces = this.pieces.map((p) => {
        if (p.samePosition(origin)) {
          p.position.x = newKingXPosition;
        } else if (p.samePiecePosition(destinationPiece)) {
          p.position.x = newKingXPosition - direction;
        }

        return p;
      });

      this.calculateAllMoves();
      return true;
    }

    if (enPassantMove) {
      const captured = new Position(
        destination.x,
        destination.y - pawnDirection
      );
      this.pieces = this.pieces.reduce((results, piece) => {
        if (piece.samePosition(origin)) {
          if (piece.isPawn) (piece as Pawn).enPassant = false;
          piece.position.x = destination.x;
          piece.position.y = destination.y;
          piece.hasMoved = true;
          results.push(piece);
        } else if (!piece.samePosition(captured)) {
          if (piece.isPawn) {
            (piece as Pawn).enPassant = false;
          }
          results.push(piece);
        }

        return results;
      }, [] as Piece[]);

      this.calculateAllMoves();
    } else if (validMove) {
      //UPDATES THE PIECE POSITION
      //AND IF A PIECE IS ATTACKED, REMOVES IT
      this.pieces = this.pieces.reduce((results, piece) => {
        // Piece that we are currently moving
        if (piece.samePosition(origin) && piece.team === playedPiece.team && piece.type === playedPiece.type) {
          //SPECIAL MOVE
          if (piece.isPawn)
            (piece as Pawn).enPassant =
              Math.abs(origin.y - destination.y) === 2 &&
              piece.type === PieceType.PAWN;
          piece.position.x = destination.x;
          piece.position.y = destination.y;
          piece.hasMoved = true;
          results.push(piece);
        } else if (!piece.samePosition(destination)) {
          if (piece.isPawn) {
            (piece as Pawn).enPassant = false;
          }
          results.push(piece);
        }

        // The piece at the destination location
        // Won't be pushed in the results
        return results;
      }, [] as Piece[]);

      this.calculateAllMoves();
    } else {
      return false;
    }

    return true;
  }

  isEnPassantMove(
    initialPosition: Position,
    desiredPosition: Position,
    type: PieceType,
    team: TeamType
  ): boolean {
    const pawnDirection = team === TeamType.OUR ? 1 : -1;

    if (type !== PieceType.PAWN) {
      return false;
    }

    if (
      (desiredPosition.x - initialPosition.x === -1 ||
        desiredPosition.x - initialPosition.x === 1) &&
      desiredPosition.y - initialPosition.y === pawnDirection
    ) {
      const piece = this.pieces.find(
        (p) =>
          p.position.x === desiredPosition.x &&
          p.position.y === desiredPosition.y - pawnDirection &&
          p.isPawn &&
          (p as Pawn).enPassant
      );
      return !!piece;
    }

    return false;
  }

  tryPlayMove(
    from: Position,
    to: Position,
    options: { ignoreTurn?: boolean; ignoreLegality?: boolean } = {}
  ): boolean {
    const piece = this.pieces.find((p) => p.samePosition(from));
    if (!piece) {
      return false;
    }

    if (!options.ignoreTurn && !this.learnMode && piece.team !== this.currentTeam) {
      return false;
    }

    this.calculateAllMoves();
    const moving = this.pieces.find((p) => p.samePosition(from));
    if (!moving) {
      return false;
    }

    const enPassantMove = this.isEnPassantMove(
      from,
      to,
      moving.type,
      moving.team
    );
    const validMove =
      moving.possibleMoves?.some((m) => m.samePosition(to)) ?? false;

    if (!validMove && !options.ignoreLegality) {
      return false;
    }

    this.totalTurns += 1;
    return this.playMove(enPassantMove, true, moving, to);
  }

  clone(): Board {
    const cloned = new Board(
      this.pieces.map((p) => p.clone()),
      this.totalTurns,
      this.learnMode
    );
    cloned.winningTeam = this.winningTeam;
    return cloned;
  }
}
