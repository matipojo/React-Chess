import {
  buildStepParagraphs,
  lessonExpectsRecap,
  parseStepDrafts,
  parseSummaryDraft,
  shouldShowLessonNav,
  teachingSteps,
} from "./lessonCopy";

describe("lesson copy", () => {
  it("requires what and why on each draft step", () => {
    expect(
      parseStepDrafts([
        { title: "Center", what: "Play e2:e4.", why: "Take space." },
        { title: "Missing why", what: "Play g1:f3." },
      ])
    ).toEqual([
      { title: "Center", what: "Play e2:e4.", why: "Take space.", paragraphs: undefined, moves: undefined },
    ]);
  });

  it("puts what then why before extra paragraphs", () => {
    expect(
      buildStepParagraphs({
        what: "The knight develops to f3.",
        why: "It attacks e5.",
        paragraphs: ["Black usually defends with Nc6."],
      })
    ).toEqual([
      "It attacks e5.",
      "The knight develops to f3.",
      "Black usually defends with Nc6.",
    ]);
  });

  it("parses a recap string or paragraph object", () => {
    expect(parseSummaryDraft("Italian is a healthy opening.")).toEqual({
      paragraphs: ["Italian is a healthy opening."],
    });
    expect(parseSummaryDraft(["Occupy the center.", "Watch f7."])).toEqual({
      paragraphs: ["Occupy the center.", "Watch f7."],
    });
    expect(
      parseSummaryDraft({
        title: "Takeaways",
        paragraphs: ["Occupy the center.", "Look at f7."],
      })
    ).toEqual({
      title: "Takeaways",
      paragraphs: ["Occupy the center.", "Look at f7."],
    });
    expect(parseSummaryDraft("  ")).toBeNull();
  });

  it("hides recap steps from the teaching count", () => {
    const steps = teachingSteps([
      { title: "e4", body: "a" },
      { title: "Nf3", body: "b" },
      { title: "Recap", body: "c", kind: "summary" },
      { title: "Later recap", body: "d", kind: "recap" },
    ]);
    expect(steps.map((item) => item.title)).toEqual(["e4", "Nf3"]);
  });

  it("skips recap for a one-step lesson unless recap copy was saved", () => {
    expect(lessonExpectsRecap(0)).toBe(false);
    expect(lessonExpectsRecap(1)).toBe(false);
    expect(lessonExpectsRecap(1, { paragraphs: [] })).toBe(false);
    expect(lessonExpectsRecap(1, { paragraphs: ["Remember f7."] })).toBe(true);
    expect(lessonExpectsRecap(2)).toBe(true);
  });

  it("hides step nav for a one-step lesson with no recap", () => {
    expect(
      shouldShowLessonNav({
        expectsRecap: false,
        generatingNext: false,
        hasLineMoves: false,
      })
    ).toBe(false);
    expect(
      shouldShowLessonNav({
        expectsRecap: true,
        generatingNext: false,
        hasLineMoves: false,
      })
    ).toBe(true);
    expect(
      shouldShowLessonNav({
        expectsRecap: false,
        generatingNext: true,
        hasLineMoves: false,
      })
    ).toBe(true);
    expect(
      shouldShowLessonNav({
        expectsRecap: false,
        generatingNext: false,
        hasLineMoves: true,
      })
    ).toBe(true);
  });
});
