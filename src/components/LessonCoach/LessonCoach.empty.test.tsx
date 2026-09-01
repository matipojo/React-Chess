import { render, waitFor } from "@testing-library/react";
import LessonCoach from "./LessonCoach";
import { COPIED_PROMPT_TIP } from "../../utils/codexPrompt";
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
    expect(getByRole("button", { name: "show me Scholar's Mate" })).toBeTruthy();
    expect(getByRole("button", { name: "teach me the Italian" })).toBeTruthy();
    expect(getByRole("button", { name: "quiz me on forks" })).toBeTruthy();
  });

  it("opens example prompts with codex:// when the host is Codex", () => {
    const restore = mockUserAgent("Mozilla/5.0 Codex/1.0");
    try {
      const { getByRole } = render(<LessonCoach coach={null} />);
      expect(
        getByRole("link", { name: "show me Scholar's Mate" }).getAttribute("href")
      ).toBe("codex://new?prompt=show%20me%20Scholar's%20Mate");
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
      const link = getByRole("link", { name: "show me Scholar's Mate" });
      expect(link.getAttribute("href")).toBe(
        "codex://new?prompt=show%20me%20Scholar's%20Mate"
      );
      link.click();
      expect(open).toHaveBeenCalledWith(
        "codex://new?prompt=show%20me%20Scholar's%20Mate",
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
      expect(
        getByRole("button", { name: "show me Scholar's Mate" })
      ).toBeTruthy();
      expect(queryByRole("link", { name: "show me Scholar's Mate" })).toBeNull();
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
      getByRole("button", { name: "show me Scholar's Mate" }).click();
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("show me Scholar's Mate");
        expect(getByText(COPIED_PROMPT_TIP)).toBeTruthy();
      });
      expect(getByRole("button", { name: "show me Scholar's Mate" })).toBeTruthy();
    } finally {
      restore();
    }
  });
});
