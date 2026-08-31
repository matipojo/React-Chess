import { FAMOUS_GAMES } from "./catalog";
import { Board } from "../models/Board";
import { Position } from "../models/Position";
import { startingLearnBoard } from "../utils/board-setup";
import {
  chessNotationToCoordinates,
  parseMoveNotation,
} from "../utils/chess-notation-utils";

function playLine(board: Board, moves: string[]): string | null {
  for (let i = 0; i < moves.length; i++) {
      const parsed = parseMoveNotation(moves[i], board);
    const fromCoords = chessNotationToCoordinates(parsed.from);
    const toCoords = chessNotationToCoordinates(parsed.to);
    const from = new Position(fromCoords.x, fromCoords.y);
    const ok = board.tryPlayMove(from, new Position(toCoords.x, toCoords.y), {
      ignoreTurn: true,
    });
    if (!ok) {
      return `failed at ply ${i + 1}: ${moves[i]}`;
    }
  }
  return null;
}

describe("famous games", () => {
  FAMOUS_GAMES.forEach((game) => {
    it(`plays ${game.id} legally`, () => {
      const board = startingLearnBoard();
      expect(playLine(board, game.moves)).toBeNull();
    });
  });
});
