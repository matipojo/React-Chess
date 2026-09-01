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
