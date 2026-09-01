import { render } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach navigation", () => {
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
});
