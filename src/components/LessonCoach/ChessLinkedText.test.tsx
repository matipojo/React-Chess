import { render } from "@testing-library/react";
import ChessLinkedText from "./ChessLinkedText";

describe("ChessLinkedText", () => {
  it("turns newlines into line breaks", () => {
    const { container } = render(
      <ChessLinkedText text={"מט סנדלרים\n1.e4 e5\nנקודת התורפה: f7"} />
    );
    expect(container.querySelectorAll("br")).toHaveLength(2);
  });

  it("turns literal \\n into line breaks", () => {
    const { container } = render(
      <ChessLinkedText text={"line one\\nline two"} />
    );
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });
});
