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
      "Not quite.\nThe correct square is e5."
    );
    expect(formatQuizIncorrectFeedback(["e5", "d4"])).toBe(
      "Not quite.\nThe correct squares are e5, d4."
    );
  });

  it("does not name the correct square after time runs out", () => {
    expect(formatQuizTimeoutFeedback()).toBe(
      "Time's up.\nWrite your answer to the agent in chat. It is no longer tracking this click and expects a written answer."
    );
    expect(formatQuizTimeoutFeedback()).not.toMatch(/[a-h][1-8]/);
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
