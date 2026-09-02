import { defaultScalene } from "./figure";
import { animationPointerPath } from "./pointerPath";

describe("animationPointerPath", () => {
  it("drags a free point from its start to the destination", () => {
    const figure = defaultScalene();
    expect(
      animationPointerPath(
        {
          type: "move",
          name: "C",
          from: figure.points.C,
          to: { x: 1, y: 2 },
        },
        figure
      )
    ).toEqual({
      from: figure.points.C,
      to: { x: 1, y: 2 },
      grab: true,
    });
  });

  it("traces a construction stroke", () => {
    const figure = defaultScalene();
    const path = animationPointerPath(
      { type: "draw", from: figure.points.C, to: figure.points.A },
      figure
    );
    expect(path?.grab).toBe(true);
    expect(path?.from).toEqual(figure.points.C);
    expect(path?.to).toEqual(figure.points.A);
  });
});
