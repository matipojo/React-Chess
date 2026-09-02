import { render } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach quiz", () => {
  it("does not show a how-to-solve hint on the coach panel", () => {
    const { queryByText } = render(
      <LessonCoach
        coach={null}
        quizQuestion="Click the key square."
        quizSecondsLeft={30}
      />
    );
    expect(queryByText("Look for a fork")).toBeNull();
    expect(queryByText("Need a nudge?")).toBeNull();
  });

  it("shows a 30s countdown and correct feedback in the coach panel", () => {
    const { getByText, rerender, queryByText } = render(
      <LessonCoach
        coach={null}
        quizQuestion="Click the fork square."
        quizSecondsLeft={30}
      />
    );
    expect(getByText("30s")).toBeTruthy();

    rerender(
      <LessonCoach
        coach={null}
        quizQuestion="Click the fork square."
        quizFeedback="Correct!"
      />
    );
    expect(getByText("Correct!")).toBeTruthy();
    expect(queryByText("30s")).toBeNull();
  });

  it("hides teaching spoilers while a quiz is on the coach", () => {
    const { getByText, queryByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "The Italian Game",
          title: "Claim the center",
          body: "",
          why: "A pawn on e4 controls d5 and f5 and opens both the queen and bishop.",
          what: "Play e2-e4. Black commonly mirrors with e7-e5.",
          step: 1,
          totalSteps: 4,
          phase: "step",
        }}
        quizQuestion="Pick White's first move in the Italian Game."
        quizSecondsLeft={30}
      />
    );
    expect(getByText("Riddle")).toBeTruthy();
    expect(getByText("Pick White's first move in the Italian Game.")).toBeTruthy();
    expect(getByText("30s")).toBeTruthy();
    expect(queryByText("Why")).toBeNull();
    expect(queryByText("Move")).toBeNull();
    expect(queryByText("Play e2-e4. Black commonly mirrors with e7-e5.")).toBeNull();
    expect(queryByText("A pawn on e4 controls d5 and f5 and opens both the queen and bishop.")).toBeNull();
  });

  it("teaches the correct square after a miss", () => {
    const { container } = render(
      <LessonCoach
        coach={null}
        quizQuestion="Click the fork square."
        quizFeedback="Not quite.\nThe correct square is e5."
      />
    );
    const feedback = container.querySelector(".lesson-coach-feedback");
    expect(feedback && feedback.textContent).toContain("Not quite");
    expect(feedback && feedback.textContent).toContain("e5");
  });
});
