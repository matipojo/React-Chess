import { render } from "@testing-library/react";
import ChessLinkedText from "./ChessLinkedText";

describe("ChessLinkedText", () => {
  it("turns newlines into separate lines", () => {
    const { container } = render(
      <ChessLinkedText text={"מט סנדלרים\n1.e4 e5\nנקודת התורפה: f7"} />
    );
    const lines = container.querySelectorAll(".coach-line");
    expect(lines).toHaveLength(3);
    expect(lines[0].getAttribute("dir")).toBe("rtl");
    expect(lines[1].getAttribute("dir")).toBe("ltr");
    expect(lines[2].getAttribute("dir")).toBe("rtl");
  });

  it("turns literal \\n into separate lines", () => {
    const { container } = render(
      <ChessLinkedText text={"line one\\nline two"} />
    );
    expect(container.querySelectorAll(".coach-line")).toHaveLength(2);
  });

  it("keeps a Hebrew sentence that starts with a move number as rtl", () => {
    const { container } = render(
      <ChessLinkedText text={"3...Nf6?? - שחור מפתח עוד כלי"} />
    );
    const line = container.querySelector(".coach-line");
    expect(line && line.getAttribute("dir")).toBe("rtl");
    expect(container.querySelector(".chess-ref")?.textContent).toBe("3...Nf6??");
  });
});
