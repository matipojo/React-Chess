import { render } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach content", () => {
  it("renders each coach paragraph as its own block", () => {
    const { container } = render(
      <LessonCoach
        coach={{
          title: "Mate!",
          body: "",
          paragraphs: [
            "Scholar's mate in four moves.",
            "1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#",
            "Defend f7 with Qe7 or g6.",
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
    expect(container.querySelector(".lesson-coach-slide-count")).toBeNull();
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
    expect(queryByText("1/1")).toBeNull();
  });

  it("labels a riddle step as Riddle instead of Step", () => {
    const { getByText, queryByText, queryByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Tactics",
          title: "Find the fork",
          body: "",
          step: 1,
          totalSteps: 1,
          phase: "riddle",
          lesson: 1,
        }}
        quizQuestion="Click the fork square."
        quizSecondsLeft={30}
      />
    );
    expect(getByText("Riddle")).toBeTruthy();
    expect(queryByText("Step")).toBeNull();
    expect(getByText("Click the fork square.")).toBeTruthy();
    expect(queryByRole("button", { name: "Back" })).toBeNull();
    expect(queryByRole("button", { name: "Next" })).toBeNull();
  });
});
