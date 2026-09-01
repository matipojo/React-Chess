import {
  canRedoExperiment,
  canUndoExperiment,
  emptyExperimentCursor,
  recordExperimentCursor,
  redoExperimentCursor,
  seededExperimentCursor,
  truncateItems,
  undoExperimentCursor,
} from "./experimentHistory";

describe("experimentHistory", () => {
  it("starts with no undo or redo", () => {
    expect(canUndoExperiment(emptyExperimentCursor())).toBe(false);
    expect(canRedoExperiment(emptyExperimentCursor())).toBe(false);
    expect(canUndoExperiment(seededExperimentCursor())).toBe(false);
    expect(canRedoExperiment(seededExperimentCursor())).toBe(false);
  });

  it("records a move so undo is available and redo is not", () => {
    const afterMove = recordExperimentCursor(seededExperimentCursor());
    expect(afterMove).toEqual({ index: 1, length: 2 });
    expect(canUndoExperiment(afterMove)).toBe(true);
    expect(canRedoExperiment(afterMove)).toBe(false);
  });

  it("undo then redo walk the cursor without dropping the redo branch", () => {
    const recorded = recordExperimentCursor(seededExperimentCursor());
    const undone = undoExperimentCursor(recorded);
    expect(undone).toEqual({ index: 0, length: 2 });
    expect(canRedoExperiment(undone!)).toBe(true);
    expect(redoExperimentCursor(undone!)).toEqual(recorded);
  });

  it("recording after undo drops the redo branch", () => {
    const recorded = recordExperimentCursor(seededExperimentCursor());
    const undone = undoExperimentCursor(recorded)!;
    const next = recordExperimentCursor(undone);
    expect(next).toEqual({ index: 1, length: 2 });
    expect(truncateItems(["start", "old", "extra"], undone.index)).toEqual(["start"]);
  });
});
