import { buildCodexPromptHref, EXAMPLE_LESSON_PROMPTS, isCodexHost } from "./codexPrompt";

describe("codexPrompt", () => {
  it("detects Codex and ChatGPT desktop user agents", () => {
    expect(isCodexHost("Mozilla/5.0 Codex/1.0")).toBe(true);
    expect(isCodexHost("Mozilla/5.0 ChatGPT/1.0")).toBe(true);
    expect(isCodexHost("Mozilla/5.0 Chrome/120.0.0.0")).toBe(false);
  });

  it("builds a new-chat deep link with the encoded prompt", () => {
    expect(buildCodexPromptHref(EXAMPLE_LESSON_PROMPTS[0])).toBe(
      "codex://new?prompt=show%20me%20Scholar's%20Mate"
    );
  });
});
