import { render, waitFor } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach", () => {
  it("explains generative learning when no lesson is open", () => {
    const { getByText, getByRole } = render(<LessonCoach coach={null} />);
    expect(getByText("Generative Learning")).toBeTruthy();
    expect(getByText("Your turn, generate your lesson")).toBeTruthy();
    expect(
      getByText(
        /Everything you learn here is created in the chat/
      )
    ).toBeTruthy();
    expect(
      getByText(/it can also quiz you on any topic you have already covered/)
    ).toBeTruthy();
    expect(getByRole("button", { name: "how does a knight move?" })).toBeTruthy();
    expect(getByRole("button", { name: "show Scholar's Mate" })).toBeTruthy();
    expect(getByRole("button", { name: "quiz me on forks" })).toBeTruthy();
  });

  it("opens example prompts with codex:// when the host is Codex", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 Codex/1.0",
    });
    try {
      const { getByRole } = render(<LessonCoach coach={null} />);
      expect(
        getByRole("link", { name: "how does a knight move?" }).getAttribute("href")
      ).toBe("codex://new?prompt=how%20does%20a%20knight%20move%3F");
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });

  it("opens example prompts with codex:// in the ChatGPT desktop webview", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.180 Electron/42.3.0 Safari/537.36",
    });
    const open = jest.fn().mockReturnValue({});
    const originalOpen = window.open;
    window.open = open;
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
      window.open = originalOpen;
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });

  it("keeps example prompts as copy buttons in regular Chrome", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    });
    try {
      const { getByRole, queryByRole } = render(<LessonCoach coach={null} />);
      expect(getByRole("button", { name: "how does a knight move?" })).toBeTruthy();
      expect(queryByRole("link", { name: "how does a knight move?" })).toBeNull();
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });

  it("renders each coach paragraph as its own block", () => {
    const { container } = render(
      <LessonCoach
        coach={{
          title: "Mate!",
          body: "",
          paragraphs: [
            "Scholar's mate in four moves.",
            "1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#",
            "Defend f7 with Qe7 or g6.",
          ],
        }}
      />
    );
    expect(container.querySelectorAll(".lesson-coach-body p")).toHaveLength(3);
  });

  it("keeps the lesson title visible and labels what, why, and recap", () => {
    const { container, getByText, rerender } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "",
          what: "Play g1:f3.",
          why: "It attacks the pawn on e5.",
          step: 2,
          totalSteps: 3,
          phase: "step",
        }}
      />
    );
    expect(getByText("Why")).toBeTruthy();
    expect(getByText("Move")).toBeTruthy();
    expect(container.querySelector(".lesson-coach-why")).toBeTruthy();
    const why = container.querySelector(".lesson-coach-why");
    const move = container.querySelector(".lesson-coach-what");
    expect(why && move && why.compareDocumentPosition(move) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    rerender(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Takeaways",
          body: "",
          paragraphs: ["Occupy the center, then look at f7."],
          phase: "recap",
          totalSteps: 3,
        }}
      />
    );
    expect(getByText("Italian Opening")).toBeTruthy();
    expect(getByText("Recap")).toBeTruthy();
    expect(container.querySelector(".lesson-coach-slide-count")).toBeNull();
  });

  it("labels a teaching beat as Step, not Recap", () => {
    const { getByText, queryByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "",
          what: "Play g1:f3.",
          why: "It attacks e5.",
          step: 1,
          totalSteps: 1,
          phase: "step",
        }}
      />
    );
    expect(getByText("Step")).toBeTruthy();
    expect(queryByText("Step 1 of 1")).toBeNull();
    expect(queryByText("Recap")).toBeNull();
    expect(queryByText("Goal")).toBeNull();
  });

  it("labels the skeleton as Goal and does not number it as a step", () => {
    const { getByText, queryByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Scholar's Mate",
          title: "Scholar's Mate",
          body: "Learn the four-move mate.",
          paragraphs: ["Learn the four-move mate."],
          phase: "goal",
          lesson: 1,
        }}
      />
    );
    expect(getByText("Goal")).toBeTruthy();
    expect(queryByText("Step 1 of 1")).toBeNull();
    expect(queryByText("Scholar's Mate")).toBeTruthy();
  });

  it("hides Back/Next and the step counter on a one-step lesson", () => {
    const { queryByRole, queryByText, getByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Chess exam",
          title: "Find the fork",
          body: "",
          what: "Click the knight fork.",
          why: "Two pieces are hanging.",
          step: 1,
          totalSteps: 1,
          phase: "step",
          lesson: 1,
        }}
      />
    );
    expect(getByText("Step")).toBeTruthy();
    expect(queryByText("Recap")).toBeNull();
    expect(queryByText("Step 1 of 1")).toBeNull();
    expect(queryByRole("button", { name: "Back" })).toBeNull();
    expect(queryByRole("button", { name: "Next" })).toBeNull();
    expect(queryByRole("button", { name: "First step" })).toBeNull();
    expect(queryByRole("button", { name: "Last step" })).toBeNull();
    expect(queryByText("1/1")).toBeNull();
  });

  it("labels a riddle step as Riddle instead of Step", () => {
    const { getByText, queryByText, queryByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Tactics",
          title: "Find the fork",
          body: "",
          step: 1,
          totalSteps: 1,
          phase: "riddle",
          lesson: 1,
        }}
        quizQuestion="Click the fork square."
        quizSecondsLeft={30}
      />
    );
    expect(getByText("Riddle")).toBeTruthy();
    expect(queryByText("Step")).toBeNull();
    expect(getByText("Click the fork square.")).toBeTruthy();
    expect(queryByRole("button", { name: "Back" })).toBeNull();
    expect(queryByRole("button", { name: "Next" })).toBeNull();
  });

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
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 ChatGPT/26.715.72359 Electron/42.3.0",
    });
    const open = jest.fn().mockReturnValue({});
    const originalOpen = window.open;
    window.open = open;
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
      window.open = originalOpen;
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });

  it("does not show a how-to-solve hint on the coach panel", () => {
    const { queryByText } = render(
      <LessonCoach
        coach={null}
        quizQuestion="Click the key square."
        quizSecondsLeft={30}
      />
    );
    expect(queryByText("Look for a fork")).toBeNull();
    expect(queryByText("Need a nudge?")).toBeNull();
  });

  it("shows a 30s countdown and correct feedback in the coach panel", () => {
    const { getByText, rerender, queryByText } = render(
      <LessonCoach
        coach={null}
        quizQuestion="Click the fork square."
        quizSecondsLeft={30}
      />
    );
    expect(getByText("30s")).toBeTruthy();

    rerender(
      <LessonCoach
        coach={null}
        quizQuestion="Click the fork square."
        quizFeedback="Correct!"
      />
    );
    expect(getByText("Correct!")).toBeTruthy();
    expect(queryByText("30s")).toBeNull();
  });

  it("teaches the correct square after a miss", () => {
    const { container } = render(
      <LessonCoach
        coach={null}
        quizQuestion="Click the fork square."
        quizFeedback="Not quite.\nThe correct square is e5."
      />
    );
    const feedback = container.querySelector(".lesson-coach-feedback");
    expect(feedback && feedback.textContent).toContain("Not quite");
    expect(feedback && feedback.textContent).toContain("e5");
  });

  it("keeps Next enabled when the parent says the wait can continue", () => {
    const onNext = jest.fn();
    const { getByRole } = render(
      <LessonCoach
        coach={{ title: "Knight development", body: "Develop pieces.", step: 3, totalSteps: 6 }}
        waitPrompt="Your turn. How do we develop another piece?"
        waitChoices={[
          { id: "bishop-c4", label: "Play Bf1:c4" },
          { id: "bishop-b5", label: "Play Bf1:b5" },
        ]}
        onBack={() => undefined}
        onNext={onNext}
        canBack={false}
        canNext
      />
    );
    const next = getByRole("button", { name: "Next" });
    expect(next).not.toBeDisabled();
    next.click();
    expect(onNext).toHaveBeenCalled();
  });

  it("shows an animated Generating label on Next while the following screen is missing", () => {
    const onNext = jest.fn();
    const { getByRole, getByText, queryByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "",
          what: "Play g1:f3.",
          why: "It attacks e5.",
          step: 2,
          totalSteps: 3,
          phase: "step",
          lesson: 1,
        }}
        onBack={() => undefined}
        onNext={onNext}
        canNext={false}
        nextGenerating
      />
    );
    expect(queryByRole("button", { name: "Next" })).toBeNull();
    const next = getByRole("button", { name: "Generating next screen" });
    expect(next).toBeDisabled();
    expect(next.className).toContain("lesson-coach-next-generating");
    expect(getByText("Generating")).toBeTruthy();
    expect(getByText("2/3")).toBeTruthy();
    next.click();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("places reset opposite the title and jump controls beside Back and Next", () => {
    const onReset = jest.fn();
    const onFirst = jest.fn();
    const onLast = jest.fn();
    const { container, getByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "Develop pieces.",
          step: 2,
          totalSteps: 3,
        }}
        onBack={() => undefined}
        onNext={() => undefined}
        onFirst={onFirst}
        onLast={onLast}
        onReset={onReset}
        canBack
        canNext
        canFirst
        canLast
        canReset
      />
    );
    const heading = container.querySelector(".lesson-coach-heading");
    const topic = container.querySelector(".lesson-coach-topic");
    const reset = getByRole("button", { name: "Reset lesson" });
    expect(heading && topic && heading.contains(topic) && heading.contains(reset)).toBeTruthy();
    reset.click();
    expect(onReset).toHaveBeenCalled();

    const nav = container.querySelector(".lesson-coach-nav");
    expect(container.querySelector(".lesson-coach-slide-count")?.textContent).toBe("2/3");
    const first = getByRole("button", { name: "First step" });
    const last = getByRole("button", { name: "Last step" });
    const back = getByRole("button", { name: "Back" });
    const next = getByRole("button", { name: "Next" });
    expect(nav && first.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nav && next.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    first.click();
    last.click();
    expect(onFirst).toHaveBeenCalled();
    expect(onLast).toHaveBeenCalled();
  });

  it("puts Finish below the nav row so jump controls stay on their own line", () => {
    const onFinish = jest.fn();
    const { container, getByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "Develop pieces.",
          step: 2,
          totalSteps: 3,
        }}
        onBack={() => undefined}
        onNext={() => undefined}
        onFirst={() => undefined}
        onLast={() => undefined}
        onFinish={onFinish}
        canBack
        canNext
        canFirst
        canLast
      />
    );
    const wrap = container.querySelector(".lesson-coach-nav-wrap");
    const nav = container.querySelector(".lesson-coach-nav");
    const finish = getByRole("button", { name: "Finish lesson" });
    expect(wrap && nav && wrap.contains(nav) && wrap.contains(finish)).toBeTruthy();
    expect(nav && nav.compareDocumentPosition(finish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nav && !nav.contains(finish)).toBeTruthy();
    finish.click();
    expect(onFinish).toHaveBeenCalled();
  });

  it("still shows Finish at the bottom when a one-step lesson has no nav", () => {
    const onFinish = jest.fn();
    const { container, getByRole, queryByRole } = render(
      <LessonCoach
        coach={{
          title: "Knight exam",
          body: "Click the landing squares.",
          phase: "step",
          step: 1,
          totalSteps: 1,
        }}
        onFinish={onFinish}
      />
    );
    expect(queryByRole("button", { name: "Next" })).toBeNull();
    const wrap = container.querySelector(".lesson-coach-nav-wrap");
    const finish = getByRole("button", { name: "Finish lesson" });
    expect(wrap && wrap.contains(finish)).toBeTruthy();
    expect(finish.textContent).toBe("Finish");
  });

  it("labels Finish as סיום when the lesson copy is RTL", () => {
    const { getByRole } = render(
      <LessonCoach
        coach={{
          lessonTitle: "ההגנה הסיציליאנית",
          title: "מסע ראשון",
          body: "השחור עונה במסע למרכז.",
          why: "יוצרים משחק לא סימטרי.",
          phase: "step",
        }}
        onFinish={() => undefined}
      />
    );
    expect(getByRole("button", { name: "Finish lesson" }).textContent).toBe(
      "סיום"
    );
  });

  it("shows a slide fraction above Back/Next and updates it", () => {
    const { getByText, rerender, queryByText } = render(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Develop the knight",
          body: "Develop pieces.",
          step: 1,
          totalSteps: 3,
          phase: "step",
        }}
        onBack={() => undefined}
        onNext={() => undefined}
        canBack={false}
        canNext
      />
    );
    expect(getByText("1/3")).toBeTruthy();

    rerender(
      <LessonCoach
        coach={{
          lessonTitle: "Italian Opening",
          title: "Castle",
          body: "King safety.",
          step: 3,
          totalSteps: 3,
          phase: "step",
        }}
        onBack={() => undefined}
        onNext={() => undefined}
        canBack
        canNext
      />
    );
    expect(queryByText("1/3")).toBeNull();
    expect(getByText("3/3")).toBeTruthy();
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

  it("offers Play on a Move token only while make-move can play it", () => {
    const onPlayMove = jest.fn();
    const { getByRole, rerender, queryByRole } = render(
      <LessonCoach
        coach={{
          title: "Open the center",
          body: "",
          why: "Take space.",
          what: "1.e4 e5",
          phase: "step",
          step: 1,
          totalSteps: 1,
        }}
        playMoves={[
          { notation: "e2:e4", status: "ready" },
          { notation: "e7:e5", status: "ready" },
        ]}
        onPlayMove={onPlayMove}
      />
    );
    getByRole("button", { name: "Play e2:e4" }).click();
    expect(onPlayMove).toHaveBeenCalledWith("e2:e4");

    rerender(
      <LessonCoach
        coach={{
          title: "Open the center",
          body: "",
          why: "Take space.",
          what: "1.e4 e5",
          phase: "step",
          step: 1,
          totalSteps: 1,
        }}
        playMoves={[
          { notation: "e2:e4", status: "done" },
          { notation: "e7:e5", status: "ready" },
        ]}
        onPlayMove={onPlayMove}
      />
    );
    expect(queryByRole("button", { name: "Play e2:e4" })).toBeNull();
    expect(getByRole("button", { name: "Play e7:e5" })).toBeTruthy();
  });

  it("still lists from:to Play when the Move text has no squares", () => {
    const onPlayMove = jest.fn();
    const { getByRole } = render(
      <LessonCoach
        coach={{
          title: "Develop the bishop",
          body: "",
          why: "Look at f7.",
          what: "The bishop comes out.",
          phase: "step",
        }}
        playMoves={[{ notation: "f1:c4", status: "ready" }]}
        onPlayMove={onPlayMove}
      />
    );
    getByRole("button", { name: "Play f1:c4" }).click();
    expect(onPlayMove).toHaveBeenCalledWith("f1:c4");
  });
});
