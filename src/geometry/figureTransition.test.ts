import { applyGan } from "./gan";
import { defaultScalene, moveFreePoint } from "./figure";
import { figureTransitionAnimation } from "./figureTransition";
import { startFigure } from "./templates";

describe("figureTransitionAnimation", () => {
  it("moves a free point back to where it was", () => {
    const start = defaultScalene();
    const dest = { x: 1.2, y: -0.4 };
    const moved = moveFreePoint(start, "C", dest);
    const reverse = figureTransitionAnimation(moved, start);
    expect(reverse).toEqual({
      type: "move",
      name: "C",
      from: dest,
      to: { x: start.points.C.x, y: start.points.C.y },
    });
  });

  it("undraws a construction stroke that is leaving the figure", () => {
    const start = startFigure("right-at-C");
    const alt = applyGan(start, "h(C,AB)");
    expect(alt.error).toBeUndefined();
    const reverse = figureTransitionAnimation(alt.figure, start);
    expect(reverse?.type).toBe("draw");
    if (reverse?.type !== "draw") {
      return;
    }
    expect(reverse.reverse).toBe(true);
    expect(reverse.from).toEqual({ x: start.points.C.x, y: start.points.C.y });
  });

  it("draws a stroke that is being added", () => {
    const start = startFigure("right-at-C");
    const alt = applyGan(start, "h(C,AB)");
    const forward = figureTransitionAnimation(start, alt.figure);
    expect(forward?.type).toBe("draw");
    if (forward?.type !== "draw") {
      return;
    }
    expect(forward.reverse).toBeUndefined();
  });
});
