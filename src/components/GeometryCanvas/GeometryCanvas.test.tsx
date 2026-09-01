import { render } from "@testing-library/react";
import { defaultScalene } from "../../geometry/figure";
import GeometryCanvas from "./GeometryCanvas";

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
