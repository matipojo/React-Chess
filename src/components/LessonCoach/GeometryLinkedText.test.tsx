import { fireEvent, render } from "@testing-library/react";
import GeometryLinkedText from "./GeometryLinkedText";

describe("GeometryLinkedText", () => {
  it("renders dotted GAN tokens and a Play button for a ready construction", () => {
    const onPlay = jest.fn();
    const { container, getByLabelText } = render(
      <GeometryLinkedText
        text="Draw h(C,AB) in △ABC."
        playMoves={[{ notation: "h(C,AB)", status: "ready" }]}
        onPlayMove={onPlay}
      />
    );
    const refs = Array.from(container.querySelectorAll(".chess-ref")).map(
      (node) => node.textContent
    );
    expect(refs).toEqual(["h(C,AB)", "△ABC"]);
    getByLabelText("Play h(C,AB)").click();
    expect(onPlay).toHaveBeenCalledWith("h(C,AB)");
  });

  it("peeks ∠A when hovering an angle token", () => {
    const onHover = jest.fn();
    const { getByText } = render(
      <GeometryLinkedText
        text="הזוויות הן ∠A, ∠B, ∠C."
        knownIds={["A", "B", "C"]}
        onHoverIds={onHover}
      />
    );
    fireEvent.pointerEnter(getByText("∠A"));
    expect(onHover).toHaveBeenCalledWith(["∠A"]);
    fireEvent.pointerEnter(getByText("∠B"));
    expect(onHover).toHaveBeenCalledWith(["∠B"]);
  });
});
