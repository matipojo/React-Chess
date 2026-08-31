import { boardToFen, startingLearnBoard } from "../utils/board-setup";
import { applyMovesToBoard, coachPlayMoves, extractFromToMoves } from "./stepPlay";

describe("step play buttons", () => {
  it("extracts from:to moves from mixed Hebrew What text", () => {
    expect(extractFromToMoves("f1:c4, ואז g8:f6.")).toEqual(["f1:c4", "g8:f6"]);
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
