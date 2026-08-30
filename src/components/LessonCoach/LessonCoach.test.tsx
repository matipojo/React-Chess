import { render } from "@testing-library/react";
import LessonCoach from "./LessonCoach";

describe("LessonCoach", () => {
  it("renders each coach paragraph as its own block", () => {
    const { container } = render(
      <LessonCoach
        coach={{
          title: "מט!",
          body: "",
          paragraphs: [
            "מט הסנדלר בארבעה מהלכים.",
            "1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#",
            "הגן על f7 עם Qe7 או g6.",
          ],
        }}
      />
    );
    expect(container.querySelectorAll(".lesson-coach-body p")).toHaveLength(3);
  });
});
