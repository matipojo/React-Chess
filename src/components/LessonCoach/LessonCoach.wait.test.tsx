import { render, waitFor } from "@testing-library/react";
import LessonCoach from "./LessonCoach";
import { mockUserAgent, mockWindowOpen } from "./lessonCoachTestUtils";

describe("LessonCoach wait-for-user", () => {
  it("renders wait-for-user choices and reports the clicked action", () => {
    const onWaitChoice = jest.fn();
    const { getByRole } = render(
      <LessonCoach
        coach={null}
        waitPrompt="What do you want to learn today?"
        waitChoices={[
          { id: "scholars-mate", label: "Scholar's Mate" },
          { id: "continue", label: "Continue" },
        ]}
        onWaitChoice={onWaitChoice}
      />
    );
    getByRole("button", { name: "Scholar's Mate" }).click();
    expect(onWaitChoice).toHaveBeenCalledWith("scholars-mate", "Scholar's Mate");
  });

  it("always shows Copy and pastes Q/A without submitting the wait", async () => {
    const onWaitChoice = jest.fn();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getAllByRole } = render(
      <LessonCoach
        coach={null}
        waitPrompt="What do you want to learn today?"
        waitChoices={[
          { id: "scholars-mate", label: "Scholar's Mate" },
          { id: "continue", label: "Continue" },
        ]}
        onWaitChoice={onWaitChoice}
      />
    );
    expect(getAllByRole("button", { name: "Copy" })).toHaveLength(2);
    getAllByRole("button", { name: "Copy" })[0].click();
    expect(onWaitChoice).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        [
          "The student answered a wait-for-user prompt. Continue from this choice.",
          "Q: What do you want to learn today?",
          "A: Scholar's Mate",
          "action: scholars-mate",
        ].join("\n")
      );
    });
  });

  it("opens wait answers with codex:// instead of copying on Codex", () => {
    const restoreAgent = mockUserAgent(
      "Mozilla/5.0 ChatGPT/26.715.72359 Electron/42.3.0"
    );
    const { open, restore: restoreOpen } = mockWindowOpen();
    try {
      const { getAllByRole, queryAllByRole } = render(
        <LessonCoach
          coach={null}
          waitPrompt="What do you want to learn today?"
          waitChoices={[{ id: "scholars-mate", label: "Scholar's Mate" }]}
        />
      );
      expect(queryAllByRole("button", { name: "Copy" })).toHaveLength(0);
      const link = getAllByRole("link", { name: "Open" })[0];
      expect(link.getAttribute("href")).toContain("codex://new?prompt=");
      link.click();
      expect(open).toHaveBeenCalled();
      expect(String(open.mock.calls[0][0])).toContain("codex://new?prompt=");
    } finally {
      restoreOpen();
      restoreAgent();
    }
  });

  it("links moves in the wait prompt and choice labels", () => {
    const { container } = render(
      <LessonCoach
        coach={null}
        waitPrompt="Should we play e2:e4?"
        waitChoices={[{ id: "e4", label: "Yes, push e2:e4" }]}
      />
    );
    const refs = Array.from(container.querySelectorAll(".chess-ref")).map(
      (node) => node.textContent
    );
    expect(refs).toContain("e2:e4");
    expect(refs.filter((value) => value === "e2:e4")).toHaveLength(2);
  });
});
