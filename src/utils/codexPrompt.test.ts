import {
  buildCodexPromptHref,
  EXAMPLE_LESSON_PROMPTS,
  isCodexHost,
  openCodexPrompt,
  sharePromptWithHost,
} from "./codexPrompt";

const CHATGPT_DESKTOP_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ChatGPT/26.715.72359 Chrome/148.0.7778.180 Electron/42.3.0 Safari/537.36";

describe("codexPrompt", () => {
  it("detects ChatGPT desktop and Codex clients, not regular Chrome", () => {
    expect(isCodexHost("Mozilla/5.0 Codex/1.0")).toBe(true);
    expect(isCodexHost("Mozilla/5.0 ChatGPT/1.0")).toBe(true);
    expect(isCodexHost(CHATGPT_DESKTOP_UA)).toBe(true);
    expect(isCodexHost("Mozilla/5.0 ChatGPTBrowser Chrome/142.0.0.0")).toBe(
      true
    );
    expect(
      isCodexHost(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.180 Electron/42.3.0 Safari/537.36"
      )
    ).toBe(true);
    expect(
      isCodexHost(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
      )
    ).toBe(false);
  });

  it("detects ChatGPT client-hint brands and ignores native WebMCP in Chrome", () => {
    expect(
      isCodexHost({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        brands: ["Chromium", "Google Chrome"],
      })
    ).toBe(false);
    expect(
      isCodexHost({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        brands: ["Chromium", "ChatGPT"],
      })
    ).toBe(true);
  });

  it("builds a new-chat deep link with the encoded prompt", () => {
    expect(buildCodexPromptHref(EXAMPLE_LESSON_PROMPTS[0])).toBe(
      "codex://new?prompt=how%20does%20a%20knight%20move%3F"
    );
  });

  it("opens the deep link instead of relying on an <a> navigation", () => {
    const open = jest.fn().mockReturnValue({});
    const originalOpen = window.open;
    window.open = open;
    try {
      openCodexPrompt(EXAMPLE_LESSON_PROMPTS[0]);
      expect(open).toHaveBeenCalledWith(
        "codex://new?prompt=how%20does%20a%20knight%20move%3F",
        "_blank",
        "noopener"
      );
    } finally {
      window.open = originalOpen;
    }
  });

  it("shares by opening on Codex and copying otherwise", async () => {
    const copyText = jest.fn().mockResolvedValue(true);
    expect(await sharePromptWithHost("quiz me on forks", copyText)).toBe(
      "copied"
    );
    expect(copyText).toHaveBeenCalledWith("quiz me on forks");

    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => CHATGPT_DESKTOP_UA,
    });
    const open = jest.fn().mockReturnValue({});
    const originalOpen = window.open;
    window.open = open;
    try {
      copyText.mockClear();
      expect(await sharePromptWithHost("quiz me on forks", copyText)).toBe(
        "opened"
      );
      expect(copyText).not.toHaveBeenCalled();
      expect(open).toHaveBeenCalledWith(
        "codex://new?prompt=quiz%20me%20on%20forks",
        "_blank",
        "noopener"
      );
    } finally {
      window.open = originalOpen;
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });
});
