import { render, waitFor } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach", () => {
  it("renders each coach paragraph as its own block", () => {
    const { container } = render(
      <LessonCoach
        coach={{
          title: "מט!",
          body: "",
          paragraphs: [
            "מט הסנדלר בארבעה מהלכים.",
            "1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#",
            "הגן על f7 עם Qe7 או g6.",
          ],
        }}
      />
    );
    expect(container.querySelectorAll(".lesson-coach-body p")).toHaveLength(3);
  });

  it("keeps the lesson title visible and labels what, why, and recap", () => {
    const { container, getByText, rerender } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "",
          what: "Play g1:f3.",
          why: "It attacks the pawn on e5.",
          step: 2,
          totalSteps: 3,
          phase: "step",
        }}
      />
    );
    expect(getByText("Why")).toBeTruthy();
    expect(getByText("Move")).toBeTruthy();
    expect(container.querySelector(".lesson-coach-why")).toBeTruthy();
    const why = container.querySelector(".lesson-coach-why");
    const move = container.querySelector(".lesson-coach-what");
    expect(why && move && why.compareDocumentPosition(move) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getByText("Step 2 of 3")).toBeTruthy();

    rerender(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Takeaways",
          body: "",
          paragraphs: ["Occupy the center, then look at f7."],
          phase: "recap",
          totalSteps: 3,
        }}
      />
    );
    expect(getByText("Italian Opening")).toBeTruthy();
    expect(getByText("Recap")).toBeTruthy();
    expect(container.querySelector(".lesson-coach-step")).toBeNull();
  });

  it("labels a teaching beat as Step, not Recap", () => {
    const { getByText, queryByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "",
          what: "Play g1:f3.",
          why: "It attacks e5.",
          step: 1,
          totalSteps: 1,
          phase: "step",
        }}
      />
    );
    expect(getByText("Step")).toBeTruthy();
    expect(queryByText("Step 1 of 1")).toBeNull();
    expect(queryByText("Recap")).toBeNull();
    expect(queryByText("Goal")).toBeNull();
  });

  it("labels the skeleton as Goal and does not number it as a step", () => {
    const { getByText, queryByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Scholar's Mate",
          title: "Scholar's Mate",
          body: "Learn the four-move mate.",
          paragraphs: ["Learn the four-move mate."],
          phase: "goal",
          lesson: 1,
        }}
      />
    );
    expect(getByText("Goal")).toBeTruthy();
    expect(queryByText("Step 1 of 1")).toBeNull();
    expect(queryByText("Scholar's Mate")).toBeTruthy();
  });

  it("hides Back/Next and the step counter on a one-step lesson", () => {
    const { queryByRole, queryByText, getByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Chess exam",
          title: "Find the fork",
          body: "",
          what: "Click the knight fork.",
          why: "Two pieces are hanging.",
          step: 1,
          totalSteps: 1,
          phase: "step",
          lesson: 1,
        }}
      />
    );
    expect(getByText("Step")).toBeTruthy();
    expect(queryByText("Recap")).toBeNull();
    expect(queryByText("Step 1 of 1")).toBeNull();
    expect(queryByRole("button", { name: "Back" })).toBeNull();
    expect(queryByRole("button", { name: "Next" })).toBeNull();
    expect(queryByRole("button", { name: "First step" })).toBeNull();
    expect(queryByRole("button", { name: "Last step" })).toBeNull();
  });

  it("renders wait-for-user choices and reports the clicked action", () => {
    const onWaitChoice = jest.fn();
    const { getByRole } = render(
      <LessonCoach
        coach={null}
        waitPrompt="What do you want to learn today?"
        waitChoices={[
          { id: "scholars-mate", label: "Scholar's Mate" },
          { id: "continue", label: "Continue" },
        ]}
        onWaitChoice={onWaitChoice}
      />
    );
    getByRole("button", { name: "Scholar's Mate" }).click();
    expect(onWaitChoice).toHaveBeenCalledWith("scholars-mate", "Scholar's Mate");
  });

  it("always shows Copy and pastes Q/A without submitting the wait", async () => {
    const onWaitChoice = jest.fn();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getAllByRole } = render(
      <LessonCoach
        coach={null}
        waitPrompt="What do you want to learn today?"
        waitChoices={[
          { id: "scholars-mate", label: "Scholar's Mate" },
          { id: "continue", label: "Continue" },
        ]}
        onWaitChoice={onWaitChoice}
      />
    );
    expect(getAllByRole("button", { name: "Copy" })).toHaveLength(2);
    getAllByRole("button", { name: "Copy" })[0].click();
    expect(onWaitChoice).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        [
          "The student answered a wait-for-user prompt. Continue from this choice.",
          "Q: What do you want to learn today?",
          "A: Scholar's Mate",
          "action: scholars-mate",
        ].join("\n")
      );
    });
  });

  it("offers a one-time copy of a timed-out quiz click", async () => {
    const onQuizCopied = jest.fn();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByRole, getByText } = render(
      <LessonCoach
        coach={null}
        quizQuestion="Click the fork square."
        quizTimedOut
        quizCopy={{
          question: "Click the fork square.",
          square: "e5",
          correct: true,
        }}
        onQuizCopied={onQuizCopied}
      />
    );
    expect(getByText("Copy this answer once and paste it in chat.")).toBeTruthy();
    getByRole("button", { name: "Copy" }).click();
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        [
          "The student answered an ask-quiz by clicking a square. Continue from this click.",
          "Q: Click the fork square.",
          "square: e5",
          "correct: yes",
        ].join("\n")
      );
    });
    await waitFor(() => {
      expect(onQuizCopied).toHaveBeenCalled();
    }, { timeout: 2500 });
  });

  it("keeps Next enabled when the parent says the wait can continue", () => {
    const onNext = jest.fn();
    const { getByRole } = render(
      <LessonCoach
        coach={{ title: "Knight development", body: "Develop pieces.", step: 3, totalSteps: 6 }}
        waitPrompt="Your turn. How do we develop another piece?"
        waitChoices={[
          { id: "bishop-c4", label: "Play Bf1:c4" },
          { id: "bishop-b5", label: "Play Bf1:b5" },
        ]}
        onBack={() => undefined}
        onNext={onNext}
        canBack={false}
        canNext
      />
    );
    const next = getByRole("button", { name: "Next" });
    expect(next).not.toBeDisabled();
    next.click();
    expect(onNext).toHaveBeenCalled();
  });

  it("shows an animated Generating label on Next while the following screen is missing", () => {
    const onNext = jest.fn();
    const { getByRole, getByText, queryByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "",
          what: "Play g1:f3.",
          why: "It attacks e5.",
          step: 2,
          totalSteps: 3,
          phase: "step",
          lesson: 1,
        }}
        onBack={() => undefined}
        onNext={onNext}
        canNext={false}
        nextGenerating
      />
    );
    expect(queryByRole("button", { name: "Next" })).toBeNull();
    const next = getByRole("button", { name: "Generating next screen" });
    expect(next).toBeDisabled();
    expect(next.className).toContain("lesson-coach-next-generating");
    expect(getByText("Generating")).toBeTruthy();
    expect(getByText("Step 2")).toBeTruthy();
    next.click();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("places reset opposite the title and jump controls beside Back and Next", () => {
    const onReset = jest.fn();
    const onFirst = jest.fn();
    const onLast = jest.fn();
    const { container, getByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "Develop pieces.",
          step: 2,
          totalSteps: 3,
        }}
        onBack={() => undefined}
        onNext={() => undefined}
        onFirst={onFirst}
        onLast={onLast}
        onReset={onReset}
        canBack
        canNext
        canFirst
        canLast
        canReset
      />
    );
    const heading = container.querySelector(".lesson-coach-heading");
    const topic = container.querySelector(".lesson-coach-topic");
    const reset = getByRole("button", { name: "Reset lesson" });
    expect(heading && topic && heading.contains(topic) && heading.contains(reset)).toBeTruthy();
    reset.click();
    expect(onReset).toHaveBeenCalled();

    const nav = container.querySelector(".lesson-coach-nav");
    const first = getByRole("button", { name: "First step" });
    const last = getByRole("button", { name: "Last step" });
    const back = getByRole("button", { name: "Back" });
    const next = getByRole("button", { name: "Next" });
    expect(nav && first.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nav && next.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    first.click();
    last.click();
    expect(onFirst).toHaveBeenCalled();
    expect(onLast).toHaveBeenCalled();
  });

  it("links moves in the wait prompt and choice labels", () => {
    const { container } = render(
      <LessonCoach
        coach={null}
        waitPrompt="Should we play e2:e4?"
        waitChoices={[{ id: "e4", label: "Yes, push e2:e4" }]}
      />
    );
    const refs = Array.from(container.querySelectorAll(".chess-ref")).map(
      (node) => node.textContent
    );
    expect(refs).toContain("e2:e4");
    expect(refs.filter((value) => value === "e2:e4")).toHaveLength(2);
  });

  it("offers Play on a Move token only while make-move can play it", () => {
    const onPlayMove = jest.fn();
    const { getByRole, rerender, queryByRole } = render(
      <LessonCoach
        coach={{
          title: "Open the center",
          body: "",
          why: "Take space.",
          what: "1.e4 e5",
          phase: "step",
          step: 1,
          totalSteps: 1,
        }}
        playMoves={[
          { notation: "e2:e4", status: "ready" },
          { notation: "e7:e5", status: "ready" },
        ]}
        onPlayMove={onPlayMove}
      />
    );
    getByRole("button", { name: "Play e2:e4" }).click();
    expect(onPlayMove).toHaveBeenCalledWith("e2:e4");

    rerender(
      <LessonCoach
        coach={{
          title: "Open the center",
          body: "",
          why: "Take space.",
          what: "1.e4 e5",
          phase: "step",
          step: 1,
          totalSteps: 1,
        }}
        playMoves={[
          { notation: "e2:e4", status: "done" },
          { notation: "e7:e5", status: "ready" },
        ]}
        onPlayMove={onPlayMove}
      />
    );
    expect(queryByRole("button", { name: "Play e2:e4" })).toBeNull();
    expect(getByRole("button", { name: "Play e7:e5" })).toBeTruthy();
  });

  it("still lists from:to Play when the Move text has no squares", () => {
    const onPlayMove = jest.fn();
    const { getByRole } = render(
      <LessonCoach
        coach={{
          title: "Develop the bishop",
          body: "",
          why: "Look at f7.",
          what: "הרץ יוצא.",
          phase: "step",
        }}
        playMoves={[{ notation: "f1:c4", status: "ready" }]}
        onPlayMove={onPlayMove}
      />
    );
    getByRole("button", { name: "Play f1:c4" }).click();
    expect(onPlayMove).toHaveBeenCalledWith("f1:c4");
  });
});
