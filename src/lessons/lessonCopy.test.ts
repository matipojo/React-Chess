import {
  buildStepParagraphs,
  coachFromDraft,
  lessonExpectsRecap,
  lessonSlideCounter,
  parseLessonStepType,
  parseStepDrafts,
  parseSummaryDraft,
  shouldShowLessonNav,
  teachingSteps,
  coachFromShowme,
  isShowmePhase,
} from "./lessonCopy";

describe("lesson copy", () => {
  it("requires what and why on each draft step", () => {
    expect(
      parseStepDrafts([
        { title: "Center", what: "Play e2:e4.", why: "Take space." },
        { title: "Missing why", what: "Play g1:f3." },
      ])
    ).toEqual([
      { title: "Center", what: "Play e2:e4.", why: "Take space.", type: "step", paragraphs: undefined, moves: undefined },
    ]);
  });

  it("parses a riddle step from type riddle or Hebrew חידה", () => {
    expect(parseLessonStepType("riddle")).toBe("riddle");
    expect(parseLessonStepType("quiz")).toBe("riddle");
    expect(parseLessonStepType("חידה")).toBe("riddle");
    expect(parseLessonStepType("step")).toBe("step");
    expect(
      parseStepDrafts([
        {
          type: "riddle",
          title: "Find the fork",
          question: "Click the square where the knight forks king and queen.",
          correct: ["c7"],
          hint: "Look at the black queen.",
        },
        { type: "riddle", question: "Missing squares" },
      ])
    ).toEqual([
      {
        title: "Find the fork",
        what: "",
        why: "",
        type: "riddle",
        paragraphs: undefined,
        moves: undefined,
        question: "Click the square where the knight forks king and queen.",
        correct: ["c7"],
        hint: "Look at the black queen.",
        quizType: undefined,
      },
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
    expect(
      shouldShowLessonNav({
        expectsRecap: false,
        generatingNext: false,
        hasLineMoves: true,
        isShowme: true,
      })
    ).toBe(false);
    expect(
      shouldShowLessonNav({
        expectsRecap: false,
        generatingNext: false,
        hasLineMoves: false,
        stepCount: 3,
      })
    ).toBe(true);
    expect(
      shouldShowLessonNav({
        expectsRecap: false,
        generatingNext: false,
        hasLineMoves: false,
        stepCount: 1,
      })
    ).toBe(false);
  });

  it("builds one show-me explanation without why, what, or step numbers", () => {
    const coach = coachFromShowme({
      title: "Scholar's Mate",
      paragraphs: ["Watch the queen and bishop crash through on f7."],
      lesson: 4,
      moves: ["e2:e4", "h5:f7"],
    });
    expect(isShowmePhase(coach.phase)).toBe(true);
    expect(coach.what).toBeUndefined();
    expect(coach.why).toBeUndefined();
    expect(coach.step).toBeUndefined();
    expect(coach.paragraphs).toEqual([
      "Watch the queen and bishop crash through on f7.",
    ]);
    expect(coach.moves).toEqual(["e2:e4", "h5:f7"]);
  });

  it("builds a compact slide fraction for multi-slide lessons", () => {
    expect(lessonSlideCounter({ step: 1, totalSteps: 1, phase: "step" })).toBeNull();
    expect(lessonSlideCounter({ step: 2, totalSteps: 3, phase: "step" })).toEqual({
      current: 2,
      total: 3,
    });
    expect(lessonSlideCounter({ phase: "recap", totalSteps: 3 })).toEqual({
      current: 4,
      total: 4,
    });
    expect(lessonSlideCounter({ historyIndex: 0, historyLength: 1 })).toBeNull();
    expect(lessonSlideCounter({ historyIndex: 1, historyLength: 4 })).toEqual({
      current: 2,
      total: 4,
    });
    expect(
      lessonSlideCounter({
        step: 4,
        totalSteps: 4,
        phase: "step",
        historyIndex: 3,
        historyLength: 6,
      })
    ).toEqual({ current: 4, total: 6 });
  });

  it("builds riddle coach copy without why/what spoilers", () => {
    const coach = coachFromDraft(
      {
        title: "Knight fork",
        what: "",
        why: "",
        type: "riddle",
        question: "Click the fork square.",
        correct: ["c7"],
      },
      { lessonTitle: "Tactics", lesson: 2, step: 1, totalSteps: 1 }
    );
    expect(coach.phase).toBe("riddle");
    expect(coach.title).toBe("Knight fork");
    expect(coach.what).toBeUndefined();
    expect(coach.why).toBeUndefined();
    expect(coach.body).toBe("");
  });
});
