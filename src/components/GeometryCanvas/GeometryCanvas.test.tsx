import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { defaultScalene } from "../../geometry/figure";
import GeometryCanvas, { GeometryCanvasHandle } from "./GeometryCanvas";
import {
  HAND_APPROACH_MS,
  HAND_DRAG_MS,
  HAND_START_DELAY_MS,
} from "../PointerHand/PointerHandAnimation";

describe("GeometryCanvas pointer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.querySelectorAll("[data-pointer-hand]").forEach((node) => node.remove());
  });

  it("sends the chess-style hand cursor and drags a point", () => {
    const handle = createRef<GeometryCanvasHandle>();
    const figure = defaultScalene();
    const { unmount } = render(
      <GeometryCanvas ref={handle} figure={figure} />
    );

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

    expect(document.querySelector("[data-pointer-hand]")).toBeTruthy();
    expect(document.querySelector(".simple-hand-animation")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(HAND_START_DELAY_MS + HAND_APPROACH_MS);
    });
    expect(document.querySelector(".simple-hand-animation.grabbing")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(HAND_DRAG_MS);
    });
    expect(done).toHaveBeenCalled();
    expect(document.querySelector("[data-pointer-hand]")).toBeNull();
    unmount();
  });
});
