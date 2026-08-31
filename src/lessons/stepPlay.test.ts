import { boardToFen, startingLearnBoard } from "../utils/board-setup";
import {
  applyMovesToBoard,
  coachPlayMoves,
  extractFromToMoves,
  shouldApplySavedStepFen,
} from "./stepPlay";

describe("step play buttons", () => {
  it("plays SAN lines the same way as from:to", () => {
    const board = startingLearnBoard();
    expect(applyMovesToBoard(board, ["e4", "e5", "Nf3", "Nc6"])).toBe(true);
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
