import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { defaultScalene } from "../../geometry/figure";
import GeometryCanvas, { GeometryCanvasHandle } from "./GeometryCanvas";
import {
  HAND_APPROACH_MS,
  HAND_DRAG_MS,
  HAND_START_DELAY_MS,
} from "../PointerHand/PointerHandAnimation";

function pointCx(container: HTMLElement, name: string) {
  return container.querySelector(`[data-point="${name}"] circle`)?.getAttribute("cx");
}

describe("GeometryCanvas pointer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    document.querySelectorAll("[data-pointer-hand]").forEach((node) => node.remove());
  });

  it("sends the chess-style hand cursor and drags a point", () => {
    const handle = createRef<GeometryCanvasHandle>();
    const figure = defaultScalene();
    const { container, unmount } = render(
      <GeometryCanvas ref={handle} figure={figure} />
    );
    const viewBox = container.querySelector("svg")?.getAttribute("viewBox");
    const startCx = pointCx(container, "C");

    const done = jest.fn();
    act(() => {
      handle.current?.playAnimation(
        {
          type: "move",
          name: "C",
          from: figure.points.C,
          to: { x: 1, y: -0.2 },
        },
        done
      );
    });

    const hand = document.querySelector("[data-pointer-hand]") as HTMLElement;
    expect(hand).toBeTruthy();
    expect(hand.querySelector("img")?.getAttribute("alt")).toBe("open hand");
    expect(document.querySelector(".simple-hand-animation")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(HAND_START_DELAY_MS + HAND_APPROACH_MS);
    });
    expect(document.querySelector(".simple-hand-animation.grabbing")).toBeTruthy();
    expect(document.querySelector("[data-pointer-hand] img")?.getAttribute("alt")).toBe(
      "grabbing hand"
    );

    act(() => {
      jest.advanceTimersByTime(HAND_DRAG_MS / 2);
    });
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(viewBox);
    expect(pointCx(container, "C")).not.toBe(startCx);

    act(() => {
      jest.advanceTimersByTime(HAND_DRAG_MS / 2);
    });
    expect(done).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-pointer-hand]")).toBeNull();
    unmount();
  });

  it("still completes the agent move if the hand is cancelled", () => {
    const handle = createRef<GeometryCanvasHandle>();
    const figure = defaultScalene();
    const { unmount } = render(<GeometryCanvas ref={handle} figure={figure} />);
    const done = jest.fn();
    act(() => {
      handle.current?.playAnimation(
        {
          type: "move",
          name: "C",
          from: figure.points.C,
          to: { x: 1, y: 2 },
        },
        done
      );
    });
    act(() => {
      handle.current?.cancelAnimation();
    });
    expect(done).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-pointer-hand]")).toBeNull();
    unmount();
  });
});
