import { render } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach play moves", () => {
  it("offers Play on a Move token only while make-move can play it", () => {
    const onPlayMove = jest.fn();
    const { getByRole, rerender, queryByRole } = render(
      <LessonCoach
        coach={{
          title: "Open the center",
          body: "",
          why: "Take space.",
          what: "1.e4 e5",
          phase: "step",
          step: 1,
          totalSteps: 1,
        }}
        playMoves={[
          { notation: "e2:e4", status: "ready" },
          { notation: "e7:e5", status: "ready" },
        ]}
        onPlayMove={onPlayMove}
      />
    );
    getByRole("button", { name: "Play e2:e4" }).click();
    expect(onPlayMove).toHaveBeenCalledWith("e2:e4");

    rerender(
      <LessonCoach
        coach={{
          title: "Open the center",
          body: "",
          why: "Take space.",
          what: "1.e4 e5",
          phase: "step",
          step: 1,
          totalSteps: 1,
        }}
        playMoves={[
          { notation: "e2:e4", status: "done" },
          { notation: "e7:e5", status: "ready" },
        ]}
        onPlayMove={onPlayMove}
      />
    );
    expect(queryByRole("button", { name: "Play e2:e4" })).toBeNull();
    expect(getByRole("button", { name: "Play e7:e5" })).toBeTruthy();
  });

  it("still lists from:to Play when the Move text has no squares", () => {
    const onPlayMove = jest.fn();
    const { getByRole } = render(
      <LessonCoach
        coach={{
          title: "Develop the bishop",
          body: "",
          why: "Look at f7.",
          what: "The bishop comes out.",
          phase: "step",
        }}
        playMoves={[{ notation: "f1:c4", status: "ready" }]}
        onPlayMove={onPlayMove}
      />
    );
    getByRole("button", { name: "Play f1:c4" }).click();
    expect(onPlayMove).toHaveBeenCalledWith("f1:c4");
  });
});
