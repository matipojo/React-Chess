import {
  clearLessonDebugLog,
  getLessonDebugEvents,
  logLessonDebug,
  resetLessonDebugLogForTests,
} from "./debugLog";

describe("lesson debug log", () => {
  beforeEach(() => {
    resetLessonDebugLogForTests();
  });

  it("records tool, user-move, and visual events in order", () => {
    logLessonDebug("tool", "annotate-board", { arrows: [{ from: "e2", to: "e4" }] });
    logLessonDebug("user-move", "drop", { from: "e2", to: "e4" });
    logLessonDebug("visual", "arrows-painted", { tileSize: 64 });

    const names = getLessonDebugEvents().map((event) => `${event.kind}:${event.name}`);
    expect(names).toEqual([
      "tool:annotate-board",
      "user-move:drop",
      "visual:arrows-painted",
    ]);
  });

  it("clears events", () => {
    logLessonDebug("visual", "set-coach", { title: "Knight" });
    clearLessonDebugLog();
    expect(getLessonDebugEvents()).toEqual([]);
  });
});
