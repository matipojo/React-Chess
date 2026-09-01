import { render } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach show-me", () => {
  it("labels a show-me demo and offers play, stop, and replay", () => {
    const onPlayLine = jest.fn();
    const onPauseLine = jest.fn();
    const onStopLine = jest.fn();
    const onReplayLine = jest.fn();
    const coach = {
      lessonTitle: "Scholar's Mate",
      title: "Scholar's Mate",
      body: "Watch the queen and bishop crash through on f7.",
      paragraphs: ["Watch the queen and bishop crash through on f7."],
      phase: "showme" as const,
      lesson: 4,
      moves: ["e2:e4", "e7:e5", "d1:h5"],
    };
    const { getByText, queryByText, queryByRole, getByRole, rerender } = render(
      <LessonCoach
        coach={coach}
        onPlayLine={onPlayLine}
        onPauseLine={onPauseLine}
        onStopLine={onStopLine}
        onReplayLine={onReplayLine}
      />
    );
    expect(getByText("Show me")).toBeTruthy();
    expect(queryByText("Step")).toBeNull();
    expect(queryByText("Goal")).toBeNull();
    expect(queryByText("Why")).toBeNull();
    expect(queryByText("Move")).toBeNull();
    expect(
      getByText(/Watch the queen and bishop crash through on/)
    ).toBeTruthy();
    expect(queryByRole("button", { name: "Back" })).toBeNull();
    expect(queryByRole("button", { name: "Next" })).toBeNull();
    const play = getByRole("button", { name: "Play the line" });
    expect(getByRole("button", { name: "Stop the line" })).toHaveProperty(
      "disabled",
      true
    );
    getByRole("button", { name: "Replay the line" });
    play.click();
    expect(onPlayLine).toHaveBeenCalledTimes(1);

    rerender(
      <LessonCoach
        coach={coach}
        showmePlayback="playing"
        showmePly={1}
        onPlayLine={onPlayLine}
        onPauseLine={onPauseLine}
        onStopLine={onStopLine}
        onReplayLine={onReplayLine}
      />
    );
    expect(queryByRole("button", { name: "Play the line" })).toBeNull();
    const pause = getByRole("button", { name: "Pause the line" });
    expect(getByRole("button", { name: "Stop the line" })).toHaveProperty(
      "disabled",
      false
    );
    pause.click();
    expect(onPauseLine).toHaveBeenCalledTimes(1);

    rerender(
      <LessonCoach
        coach={coach}
        showmePlayback="paused"
        showmePly={1}
        onPlayLine={onPlayLine}
        onPauseLine={onPauseLine}
        onStopLine={onStopLine}
        onReplayLine={onReplayLine}
      />
    );
    getByRole("button", { name: "Play the line" }).click();
    expect(onPlayLine).toHaveBeenCalledTimes(2);
    getByRole("button", { name: "Stop the line" }).click();
    expect(onStopLine).toHaveBeenCalledTimes(1);

    rerender(
      <LessonCoach
        coach={coach}
        showmePlayback="idle"
        showmePly={3}
        onPlayLine={onPlayLine}
        onPauseLine={onPauseLine}
        onStopLine={onStopLine}
        onReplayLine={onReplayLine}
      />
    );
    expect(queryByRole("button", { name: "Play the line" })).toBeNull();
    expect(queryByRole("button", { name: "Pause the line" })).toBeNull();
    getByRole("button", { name: "Replay the line" }).click();
    expect(onReplayLine).toHaveBeenCalledTimes(1);
  });
});
