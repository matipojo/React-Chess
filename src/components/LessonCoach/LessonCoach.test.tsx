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
    const title = container.querySelector("h2");
    const reset = getByRole("button", { name: "Reset lesson" });
    expect(heading && title && heading.contains(title) && heading.contains(reset)).toBeTruthy();
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
});
