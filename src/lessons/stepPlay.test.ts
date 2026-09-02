import { Position } from "../models/Position";
import { PieceType } from "../Types";
import { boardToFen, startingLearnBoard } from "../utils/board-setup";
import {
  applyMovesToBoard,
  coachPlayMoves,
  extractFromToMoves,
  shouldApplySavedStepFen,
} from "./stepPlay";

describe("step play buttons", () => {
  it("extracts from:to moves from mixed What text", () => {
    expect(extractFromToMoves("f1:c4, then g8:f6.")).toEqual(["f1:c4", "g8:f6"]);
  });

  it("extracts O-O as a playable castle move", () => {
    expect(extractFromToMoves("Castle kingside with O-O.")).toEqual(["O-O"]);
  });

  it("extracts play moves from long algebraic What text", () => {
    expect(extractFromToMoves("1.e2-e4 e7-e5 2.Ng1-f3 Nb8-c6 3.Bf1-c4")).toEqual([
      "e2:e4",
      "e7:e5",
      "g1:f3",
      "b8:c6",
      "f1:c4",
    ]);
  });

  it("plays a long algebraic line onto the board", () => {
    const board = startingLearnBoard();
    expect(
      applyMovesToBoard(board, [
        "e2-e4",
        "e7-e5",
        "Qd1-h5",
        "Nb8-c6",
        "Bf1-c4",
        "Ng8-f6",
        "Qh5xf7",
      ])
    ).toBe(true);
    const mateSquare = board.pieces.find((piece) =>
      piece.samePosition(new Position(5, 6))
    );
    expect(mateSquare?.type).toBe(PieceType.QUEEN);
  });

  it("marks the first move ready and the second blocked before anything is played", () => {
    const board = startingLearnBoard();
    applyMovesToBoard(board, ["e2:e4", "e7:e5", "g1:f3", "b8:c6"]);
    const fromFen = boardToFen(board);
    expect(
      coachPlayMoves({
        board,
        fromFen,
        currentFen: fromFen,
        moves: ["f1:c4", "g8:f6"],
      }).map((item) => item.status)
    ).toEqual(["ready", "blocked"]);
  });

  it("does not rewind a later step to the starting fen", () => {
    const start = startingLearnBoard();
    const after = startingLearnBoard();
    applyMovesToBoard(after, ["e2:e4"]);
    expect(
      shouldApplySavedStepFen({
        stepFen: boardToFen(start),
        currentFen: boardToFen(after),
        startingFen: boardToFen(start),
        isFirst: false,
      })
    ).toBe(false);
    expect(
      shouldApplySavedStepFen({
        stepFen: boardToFen(start),
        currentFen: boardToFen(start),
        startingFen: boardToFen(start),
        isFirst: true,
      })
    ).toBe(true);
  });

  it("marks the first move done and the second ready after Play", () => {
    const start = startingLearnBoard();
    applyMovesToBoard(start, ["e2:e4", "e7:e5", "g1:f3", "b8:c6"]);
    const fromFen = boardToFen(start);
    const board = startingLearnBoard();
    applyMovesToBoard(board, ["e2:e4", "e7:e5", "g1:f3", "b8:c6", "f1:c4"]);
    expect(
      coachPlayMoves({
        board,
        fromFen,
        currentFen: boardToFen(board),
        moves: ["f1:c4", "g8:f6"],
      }).map((item) => item.status)
    ).toEqual(["done", "ready"]);
  });
});
