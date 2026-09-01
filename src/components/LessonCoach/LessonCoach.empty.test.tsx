import { render } from "@testing-library/react";
import LessonCoach from "./LessonCoach";
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
      getByText(/it can also quiz you on any topic you have already covered/)
    ).toBeTruthy();
    expect(getByRole("button", { name: "how does a knight move?" })).toBeTruthy();
    expect(getByRole("button", { name: "show Scholar's Mate" })).toBeTruthy();
    expect(getByRole("button", { name: "quiz me on forks" })).toBeTruthy();
  });

  it("opens example prompts with codex:// when the host is Codex", () => {
    const restore = mockUserAgent("Mozilla/5.0 Codex/1.0");
    try {
      const { getByRole } = render(<LessonCoach coach={null} />);
      expect(
        getByRole("link", { name: "how does a knight move?" }).getAttribute("href")
      ).toBe("codex://new?prompt=how%20does%20a%20knight%20move%3F");
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
      const link = getByRole("link", { name: "how does a knight move?" });
      expect(link.getAttribute("href")).toBe(
        "codex://new?prompt=how%20does%20a%20knight%20move%3F"
      );
      link.click();
      expect(open).toHaveBeenCalledWith(
        "codex://new?prompt=how%20does%20a%20knight%20move%3F",
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
      expect(getByRole("button", { name: "how does a knight move?" })).toBeTruthy();
      expect(queryByRole("link", { name: "how does a knight move?" })).toBeNull();
    } finally {
      restore();
    }
  });
});
