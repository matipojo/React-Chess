import {
  formatQuizClickCopy,
  formatQuizIncorrectFeedback,
  formatQuizTimeoutFeedback,
  quizAnswerIsCorrect,
} from "./quizCopy";

describe("formatQuizClickCopy", () => {
  it("includes the question, square, and whether it was correct", () => {
    expect(
      formatQuizClickCopy({
        question: "Click the fork square.",
        square: "e5",
        correct: true,
      })
    ).toBe(
      [
        "The student answered an ask-quiz by clicking a square. Continue from this click.",
        "Q: Click the fork square.",
        "square: e5",
        "correct: yes",
      ].join("\n")
    );
  });
});

describe("quiz teaching copy", () => {
  it("names the correct square after a miss", () => {
    expect(formatQuizIncorrectFeedback(["e5"])).toBe(
      "Not quite. The correct square is e5."
    );
    expect(formatQuizIncorrectFeedback(["e5", "d4"])).toBe(
      "Not quite. The correct squares are e5, d4."
    );
  });

  it("names the correct square after time runs out", () => {
    expect(formatQuizTimeoutFeedback(["f7"])).toBe(
      "Time's up. The correct square is f7."
    );
  });
});

describe("quizAnswerIsCorrect", () => {
  it("accepts a click or drop on the listed square", () => {
    expect(quizAnswerIsCorrect(["e5"], "e5")).toBe(true);
    expect(quizAnswerIsCorrect(["e5"], "d4")).toBe(false);
  });

  it("accepts moving a piece onto the listed destination", () => {
    expect(quizAnswerIsCorrect(["e5"], "e5", "e4")).toBe(true);
    expect(quizAnswerIsCorrect(["e4:e5"], "e5", "e4")).toBe(true);
    expect(quizAnswerIsCorrect(["Qh5"], "h5", "d1")).toBe(true);
  });
});
