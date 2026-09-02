import { render, waitFor } from "@testing-library/react";
import { TRIANGLE_EXAMPLE_PROMPTS } from "../../geometry/notation";
import LessonCoach from "./LessonCoach";
import { COPIED_PROMPT_TIP, buildCodexPromptHref, promptWithCurrentLocation } from "../../utils/codexPrompt";
import { mockUserAgent, mockWindowOpen } from "./lessonCoachTestUtils";

describe("LessonCoach empty state", () => {
  it("explains generative learning when no lesson is open", () => {
    const { getByText, getByRole } = render(<LessonCoach coach={null} />);
    expect(getByText("Generative Learning")).toBeTruthy();
    expect(getByText("Your turn, generate your lesson")).toBeTruthy();
    expect(
      getByText(/Everything you learn here is created in the chat/)
    ).toBeTruthy();
    expect(
      getByText(/Ask it to show you a line and it plays the moves live/)
    ).toBeTruthy();
    expect(getByRole("button", { name: "Show Scholar's Mate" })).toBeTruthy();
    expect(getByRole("button", { name: "Invent an American opening" })).toBeTruthy();
    expect(getByRole("button", { name: "Teach me the Italian opening" })).toBeTruthy();
    expect(getByRole("button", { name: "Quiz me on forks" })).toBeTruthy();
  });

  it("shows triangle example prompts when provided", () => {
    const { getByRole } = render(
      <LessonCoach coach={null} examplePrompts={TRIANGLE_EXAMPLE_PROMPTS} />
    );
    expect(TRIANGLE_EXAMPLE_PROMPTS[1]).toBe(
      "Teach me about two different triangles that share the same base"
    );
    TRIANGLE_EXAMPLE_PROMPTS.forEach((prompt) => {
      expect(getByRole("button", { name: prompt })).toBeTruthy();
    });
  });

  it("opens example prompts with codex:// when the host is Codex", () => {
    const restore = mockUserAgent("Mozilla/5.0 Codex/1.0");
    try {
      const { getByRole } = render(<LessonCoach coach={null} />);
      expect(
        getByRole("link", { name: "Show Scholar's Mate" }).getAttribute("href")
      ).toBe(buildCodexPromptHref("Show Scholar's Mate"));
    } finally {
      restore();
    }
  });

  it("opens example prompts with codex:// in the ChatGPT desktop webview", () => {
    const restoreAgent = mockUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.180 Electron/42.3.0 Safari/537.36"
    );
    const { open, restore: restoreOpen } = mockWindowOpen();
    try {
      const { getByRole } = render(<LessonCoach coach={null} />);
      const link = getByRole("link", { name: "Show Scholar's Mate" });
      expect(link.getAttribute("href")).toBe(buildCodexPromptHref("Show Scholar's Mate"));
      link.click();
      expect(open).toHaveBeenCalledWith(
        buildCodexPromptHref("Show Scholar's Mate"),
        "_blank",
        "noopener"
      );
    } finally {
      restoreOpen();
      restoreAgent();
    }
  });

  it("keeps example prompts as copy buttons in regular Chrome", () => {
    const restore = mockUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
    );
    try {
      const { getByRole, queryByRole } = render(<LessonCoach coach={null} />);
      const button = getByRole("button", { name: "Show Scholar's Mate" });
      expect(button).toBeTruthy();
      expect(button.getAttribute("title")).toBe("Copy prompt");
      expect(button.querySelector(".lesson-coach-example-copy")).toBeTruthy();
      expect(queryByRole("link", { name: "Show Scholar's Mate" })).toBeNull();
    } finally {
      restore();
    }
  });

  it("shows a copied mark and paste tooltip after copying a prompt", async () => {
    const restore = mockUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
    );
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    try {
      const { getByRole, getByText } = render(<LessonCoach coach={null} />);
      getByRole("button", { name: "Show Scholar's Mate" }).click();
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          promptWithCurrentLocation("Show Scholar's Mate")
        );
        expect(getByText(COPIED_PROMPT_TIP)).toBeTruthy();
      });
      expect(getByRole("button", { name: "Show Scholar's Mate" })).toBeTruthy();
    } finally {
      restore();
    }
  });
});
