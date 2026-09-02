import { FIGURE_TEMPLATES } from "../geometry/templates";
import { parseTfn } from "../geometry/tfn";
import { SavedLesson } from "./types";
import {
  ensureGoalTriangles,
  projectTriangleLessonSession,
  tfnAfterTeaching,
  triangleCommandsInText,
} from "./triangleLessonDocument";

function sasGoal(): SavedLesson {
  return {
    id: "custom:lesson-1",
    kind: "custom",
    title: "SAS Congruence",
    body: "Learn why two matching sides and the included angle are enough to prove two triangles congruent.",
    paragraphs: ["We will compare △ABC and △DEF."],
    savedAt: 1,
    number: 1,
    steps: [],
  };
}

describe("triangle lesson document", () => {
  it("finds named triangles in Goal copy", () => {
    expect(triangleCommandsInText(["We will compare △ABC and △DEF."])).toEqual([
      "△ABC",
      "△DEF",
    ]);
  });

  it("places both triangles when a SAS Goal is saved without a figure", () => {
    const slides = projectTriangleLessonSession(sasGoal());
    expect(slides).toHaveLength(1);
    expect(slides[0].coach?.phase).toBe("goal");
    const figure = parseTfn(slides[0].tfn);
    expect(figure.triangles.map((t) => t.join(""))).toEqual(["ABC", "DEF"]);
    expect(figure.points.A).toBeTruthy();
    expect(figure.points.D).toBeTruthy();
  });

  it("restores Goal plus each step figure, including constructions", () => {
    const lesson: SavedLesson = {
      ...sasGoal(),
      tfn: FIGURE_TEMPLATES["two-triangles"],
      recap: { paragraphs: ["SAS is enough."] },
      steps: [
        {
          title: "Mark the sides",
          body: "",
          what: "mark(=,AB,DE)",
          why: "The first pair of matching sides.",
          tfn: FIGURE_TEMPLATES["two-triangles"],
        },
        {
          title: "Second pair",
          body: "",
          what: "mark(=,AC,DF)",
          why: "The included sides must match too.",
        },
      ],
    };
    const slides = projectTriangleLessonSession(lesson);
    expect(slides.map((slide) => slide.coach?.phase)).toEqual([
      "goal",
      "step",
      "step",
      "recap",
    ]);
    expect(parseTfn(slides[0].tfn).triangles).toHaveLength(2);
    expect(parseTfn(slides[1].tfn).equalGroups).toHaveLength(0);
    expect(parseTfn(slides[2].tfn).equalGroups.length).toBeGreaterThan(0);
    expect(parseTfn(slides[3].tfn).equalGroups.length).toBeGreaterThan(
      parseTfn(slides[1].tfn).equalGroups.length
    );
    expect(tfnAfterTeaching(lesson)).toBe(slides[slides.length - 1].tfn);
  });

  it("still shows △DEF when an old lesson stored only scalene TFN", () => {
    const lesson: SavedLesson = {
      ...sasGoal(),
      tfn: FIGURE_TEMPLATES.scalene,
      steps: [
        {
          title: "Compare the triangles",
          body: "",
          what: "mark(=,AB,DE)",
          why: "Match the first pair of sides.",
          tfn: FIGURE_TEMPLATES.scalene,
        },
      ],
    };
    const slides = projectTriangleLessonSession(lesson);
    expect(parseTfn(slides[0].tfn).triangles.map((t) => t.join(""))).toEqual([
      "ABC",
      "DEF",
    ]);
    expect(parseTfn(slides[1].tfn).triangles.map((t) => t.join(""))).toEqual([
      "ABC",
      "DEF",
    ]);
  });

  it("does not invent △DEF when the Goal never names it", () => {
    const figure = ensureGoalTriangles(parseTfn(FIGURE_TEMPLATES.scalene), {
      title: "Altitude",
      body: "Drop a height in △ABC.",
    });
    expect(figure.triangles.map((t) => t.join(""))).toEqual(["ABC"]);
    expect(figure.points.D).toBeUndefined();
  });
});
