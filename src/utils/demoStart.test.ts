import {
  DEMO_START_MESSAGE,
  isDemoStartMessage,
  whenDemoShouldStart,
} from "./demoStart";

describe("demo start", () => {
  it("recognizes the embedder start message", () => {
    expect(isDemoStartMessage({ type: DEMO_START_MESSAGE })).toBe(true);
    expect(isDemoStartMessage({ type: "other" })).toBe(false);
    expect(isDemoStartMessage(null)).toBe(false);
  });

  it("starts immediately on a top-level page", () => {
    const run = jest.fn();
    const stop = whenDemoShouldStart(run, { isEmbedded: false });
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });

  it("waits for start-demo when embedded", () => {
    const run = jest.fn();
    const stop = whenDemoShouldStart(run, { isEmbedded: true });
    expect(run).not.toHaveBeenCalled();
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: DEMO_START_MESSAGE } })
    );
    expect(run).toHaveBeenCalledTimes(1);
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: DEMO_START_MESSAGE } })
    );
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });

  it("can delay the top-level start", () => {
    jest.useFakeTimers();
    const run = jest.fn();
    const stop = whenDemoShouldStart(run, {
      isEmbedded: false,
      topLevelDelayMs: 500,
    });
    expect(run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(run).toHaveBeenCalledTimes(1);
    stop();
    jest.useRealTimers();
  });
});
