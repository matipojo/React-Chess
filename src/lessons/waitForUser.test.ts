import {
  continueWaitChoice,
  formatWaitChoiceCopy,
  normalizeWaitChoices,
  normalizeWaitPrompt,
} from "./waitForUser";

describe("normalizeWaitChoices", () => {
  it("defaults to Continue when empty", () => {
    expect(normalizeWaitChoices(undefined)).toEqual([
      { id: "continue", label: "Continue" },
    ]);
    expect(normalizeWaitChoices([])).toEqual([
      { id: "continue", label: "Continue" },
    ]);
  });

  it("accepts id/label objects and string ids", () => {
    expect(
      normalizeWaitChoices([
        { id: "scholars-mate", label: "Scholar's Mate" },
        "continue",
      ])
    ).toEqual([
      { id: "scholars-mate", label: "Scholar's Mate" },
      { id: "continue", label: "continue" },
    ]);
  });
});

describe("continueWaitChoice", () => {
  it("prefers an explicit continue choice", () => {
    expect(
      continueWaitChoice([
        { id: "bishop-c4", label: "Play Bf1:c4" },
        { id: "continue", label: "Continue" },
      ])
    ).toEqual({ id: "continue", label: "Continue" });
  });

  it("falls back to Continue when the prompt has only custom actions", () => {
    expect(
      continueWaitChoice([
        { id: "bishop-c4", label: "Play Bf1:c4" },
        { id: "bishop-b5", label: "Play Bf1:b5" },
      ])
    ).toEqual({ id: "continue", label: "Continue" });
  });
});

describe("normalizeWaitPrompt", () => {
  it("uses a default prompt when missing", () => {
    expect(normalizeWaitPrompt("")).toBe("What do you want to learn today?");
  });
});

describe("formatWaitChoiceCopy", () => {
  it("includes Q, A, and action for the model", () => {
    expect(
      formatWaitChoiceCopy("What do you want to learn today?", {
        id: "scholars-mate",
        label: "Scholar's Mate",
      })
    ).toBe(
      [
        "The student answered a wait-for-user prompt. Continue from this choice.",
        "Q: What do you want to learn today?",
        "A: Scholar's Mate",
        "action: scholars-mate",
      ].join("\n")
    );
  });
});
