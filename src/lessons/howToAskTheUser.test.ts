import { buildGiveMeAHintPrompt, buildHowToAskTheUserPrompt } from "./howToAskTheUser";

describe("buildHowToAskTheUserPrompt", () => {
  it("asks the host chat to visualize options with the current accent", () => {
    const prompt = buildHowToAskTheUserPrompt("#8a5fc8");
    expect(prompt).toContain("inline visualization");
    expect(prompt).toContain("clickable buttons");
    expect(prompt).toContain("not on the open chess page");
    expect(prompt).toContain("#8a5fc8");
    expect(prompt).toContain("Do not list options as 1/2/3");
    expect(prompt).toContain("They must tap a button");
    expect(prompt).toContain("Each button on its own new line");
    expect(prompt).toContain("not full row");
    expect(prompt).toContain("airy and spacious");
    expect(prompt).toContain("20px space above the first button");
    expect(prompt).toContain("padding 14px 22px");
    expect(prompt).toContain("16px vertical gap");
    expect(prompt).toContain("background #8a5fc8");
    expect(prompt).toContain("label text #ffffff");
  });
});

describe("buildGiveMeAHintPrompt", () => {
  it("asks the host chat for one Give me a hint button without spoiling the puzzle", () => {
    const prompt = buildGiveMeAHintPrompt("#8a5fc8");
    expect(prompt).toContain("inline visualization");
    expect(prompt).toContain("Give me a hint");
    expect(prompt).toContain("Do not explain how to solve it");
    expect(prompt).toContain("Do not add other buttons yet");
    expect(prompt).toContain("background #8a5fc8");
    expect(prompt).toContain("label text #ffffff");
    expect(prompt).toContain("add-lesson-step with type riddle");
    expect(prompt).toContain("Use ask-quiz only if this puzzle is not a catalog lesson step");
  });
});
