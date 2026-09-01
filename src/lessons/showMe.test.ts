import { parseLessonFormat } from "./lessonCopy";
import { resolveShowMeLesson } from "./showMe";

describe("showme lesson type", () => {
  it("accepts only the create-lesson enum value showme", () => {
    expect(parseLessonFormat("showme")).toBe("showme");
    expect(parseLessonFormat("lesson")).toBe("lesson");
    expect(parseLessonFormat(undefined)).toBe("lesson");
    expect(parseLessonFormat("show me")).toBe("lesson");
    expect(parseLessonFormat("תראה לי")).toBe("lesson");
    expect(parseLessonFormat("show-me")).toBe("lesson");
  });

  it("requires title, one explanation, and the planned moves", () => {
    const resolved = resolveShowMeLesson({
      title: "Scholar's Mate",
      paragraphs: ["Watch the queen and bishop crash through on f7."],
      moves: ["e2:e4", "e7:e5", "d1:h5", "b8:c6", "f1:c4", "g8:f6", "h5:f7"],
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      return;
    }
    expect(resolved.moves[0]).toBe("e2:e4");
    expect(resolved.moves[resolved.moves.length - 1]).toBe("h5:f7");
  });

  it("rejects a showme lesson with no move plan", () => {
    expect(
      resolveShowMeLesson({
        title: "Demo",
        paragraphs: ["Watch this."],
      })
    ).toEqual({
      ok: false,
      message:
        "A showme lesson needs moves (from:to) for the Play button to run in order.",
    });
  });
});
