import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { defaultScalene, moveFreePoint } from "../../geometry/figure";
import { applyGan } from "../../geometry/gan";
import { figureTransitionAnimation } from "../../geometry/figureTransition";
import { startFigure } from "../../geometry/templates";
import GeometryCanvas, { GeometryCanvasHandle } from "./GeometryCanvas";
import {
  HAND_APPROACH_MS,
  HAND_DRAG_MS,
  HAND_START_DELAY_MS,
} from "../PointerHand/PointerHandAnimation";

function pointCx(container: HTMLElement, name: string) {
  return container.querySelector(`[data-point="${name}"] circle`)?.getAttribute("cx");
}

describe("GeometryCanvas angle highlights", () => {
  it("draws a sector for ∠A but not for vertex A alone", () => {
    const { container, rerender } = render(
      <GeometryCanvas figure={defaultScalene()} peekIds={["∠A"]} />
    );
    expect(container.querySelector('[data-angle="∠A"]')).toBeTruthy();
    expect(container.querySelector(".geometry-angle.is-hot")).toBeTruthy();
    rerender(<GeometryCanvas figure={defaultScalene()} peekIds={["A"]} />);
    expect(container.querySelector('[data-angle="∠A"]')).toBeNull();
    expect(container.querySelector(".geometry-angle.is-hot")).toBeNull();
  });

  it("treats ∠BAC as the same corner as ∠A", () => {
    const { container } = render(
      <GeometryCanvas figure={defaultScalene()} peekIds={["∠BAC"]} />
    );
    expect(container.querySelector('[data-angle="∠A"]')).toBeTruthy();
  });

  it("draws a halo when peeking a vertex", () => {
    const { container } = render(
      <GeometryCanvas figure={defaultScalene()} peekIds={["C"]} />
    );
    expect(container.querySelector(".geometry-point.is-hot .geometry-point-halo")).toBeTruthy();
  });
});

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

  it("keeps the dragged point at the destination after the hand leaves", () => {
    const handle = createRef<GeometryCanvasHandle>();
    const start = defaultScalene();
    const dest = { x: 1.55, y: -0.2 };
    let figure = start;
    const { container, rerender, unmount } = render(
      <GeometryCanvas ref={handle} figure={figure} />
    );

    act(() => {
      handle.current?.playAnimation(
        { type: "move", name: "C", from: start.points.C, to: dest },
        () => {
          figure = moveFreePoint(figure, "C", dest);
        }
      );
    });

    act(() => {
      jest.advanceTimersByTime(HAND_START_DELAY_MS + HAND_APPROACH_MS + HAND_DRAG_MS);
    });
    rerender(<GeometryCanvas ref={handle} figure={figure} />);

    expect(Number(pointCx(container, "C"))).toBeCloseTo(dest.x, 5);
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

  it("shrinks a construction stroke when the draw is reversed", () => {
    const handle = createRef<GeometryCanvasHandle>();
    const start = startFigure("right-at-C");
    const built = applyGan(start, "h(C,AB)");
    expect(built.error).toBeUndefined();
    const reverse = figureTransitionAnimation(built.figure, start);
    expect(reverse?.type).toBe("draw");
    const { container, unmount } = render(
      <GeometryCanvas ref={handle} figure={built.figure} />
    );
    const dashed = () => container.querySelector("line.geometry-stroke.is-dashed");
    const startX2 = dashed()?.getAttribute("x2");
    const startY2 = dashed()?.getAttribute("y2");

    act(() => {
      handle.current?.playAnimation(reverse!, () => undefined);
    });
    act(() => {
      jest.advanceTimersByTime(HAND_START_DELAY_MS + HAND_APPROACH_MS + HAND_DRAG_MS / 2);
    });
    expect(dashed()?.getAttribute("x2")).not.toBe(startX2);
    expect(dashed()?.getAttribute("y2") !== startY2 || dashed()?.getAttribute("x2") !== startX2).toBe(
      true
    );
    unmount();
  });
});
