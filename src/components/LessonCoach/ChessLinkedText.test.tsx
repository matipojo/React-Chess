import { render } from "@testing-library/react";
import ChessLinkedText from "./ChessLinkedText";

describe("ChessLinkedText", () => {
  it("turns newlines into separate lines", () => {
    const { container } = render(
      <ChessLinkedText text={"Scholar's mate\n1.e4 e5\nThe weak point: f7"} />
    );
    const lines = container.querySelectorAll(".coach-line");
    expect(lines).toHaveLength(3);
    expect(lines[0].getAttribute("dir")).toBe("ltr");
    expect(lines[1].getAttribute("dir")).toBe("ltr");
    expect(lines[2].getAttribute("dir")).toBe("ltr");
  });

  it("turns literal \\n into separate lines", () => {
    const { container } = render(
      <ChessLinkedText text={"line one\\nline two"} />
    );
    expect(container.querySelectorAll(".coach-line")).toHaveLength(2);
  });

  it("keeps a sentence that starts with a move number as ltr", () => {
    const { container } = render(
      <ChessLinkedText text={"3...Nf6?? - Black develops another piece"} />
    );
    const line = container.querySelector(".coach-line");
    expect(line && line.getAttribute("dir")).toBe("ltr");
    expect(container.querySelector(".chess-ref")?.textContent).toBe("3...Nf6??");
  });

  it("keeps the taught square on its own wrapping line", () => {
    const { container } = render(
      <ChessLinkedText text={"Not quite.\nThe correct square is e5."} />
    );
    const lines = container.querySelectorAll(".coach-line");
    expect(lines).toHaveLength(2);
    expect(lines[1].textContent).toContain("e5");
    expect(container.querySelector(".chess-ref")?.textContent).toBe("e5");
  });
});
