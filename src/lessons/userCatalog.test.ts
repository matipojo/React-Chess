import {
  findUserLesson,
  findUserLessonByNumber,
  lessonSlug,
  nextLessonNumber,
  readUserCatalog,
  removeUserLesson,
  USER_CATALOG_KEY,
  upsertLessonStep,
  upsertUserLesson,
  createCatalogLesson,
  setLessonRecap,
} from "./userCatalog";

describe("user catalog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("slugs titles for stable ids", () => {
    expect(lessonSlug("Scholar's Mate")).toBe("scholar-s-mate");
    expect(lessonSlug("  ")).toBe("lesson");
  });

  it("upserts, finds, and removes lessons", () => {
    upsertUserLesson({
      id: "custom:forks",
      kind: "custom",
      title: "Forks",
      body: "Attack two pieces at once.",
    });
    upsertUserLesson({
      id: "game:scholars-mate",
      kind: "game",
      title: "Scholar's Mate",
      body: "Four-move mate.",
      gameId: "scholars-mate",
    });

    expect(readUserCatalog().map((item) => item.id)).toEqual([
      "game:scholars-mate",
      "custom:forks",
    ]);
    expect(findUserLesson("Forks")?.id).toBe("custom:forks");
    expect(findUserLesson("scholars-mate")?.kind).toBe("game");

    upsertUserLesson({
      id: "custom:forks",
      kind: "custom",
      title: "Forks",
      body: "Updated body.",
    });
    expect(readUserCatalog()).toHaveLength(2);
    expect(findUserLesson("custom:forks")?.body).toBe("Updated body.");

    upsertUserLesson({
      id: "game:scholars-mate",
      kind: "game",
      title: "4. Qxf7# — checkmate",
      body: "The queen takes on f7.",
      gameId: "scholars-mate",
      arrows: [{ from: "c4", to: "f7" }],
      highlights: [{ square: "f7", kind: "correct" }],
      quiz: {
        question: "Where does the queen mate?",
        type: "click-square",
        correct: ["f7"],
      },
    });
    const taught = findUserLesson("scholars-mate");
    expect(taught?.arrows).toEqual([{ from: "c4", to: "f7" }]);
    expect(taught?.quiz?.correct).toEqual(["f7"]);
    expect(taught?.highlights?.[0].square).toBe("f7");

    expect(removeUserLesson("custom:forks").map((item) => item.id)).toEqual([
      "game:scholars-mate",
    ]);
    expect(localStorage.getItem(USER_CATALOG_KEY)).toContain("scholars-mate");
  });

  it("appends steps to a numbered lesson instead of creating new catalog entries", () => {
    upsertLessonStep({
      lessonNumber: 1,
      step: { title: "The fork", body: "Attack two pieces.", paragraphs: ["Look at the knight."] },
    });
    upsertLessonStep({
      lessonNumber: 1,
      step: { title: "Where to land", body: "d5 and c7 are the targets." },
    });
    upsertLessonStep({
      lessonNumber: 1,
      stepNumber: 2,
      step: { title: "Where to land", body: "Updated landing squares." },
    });

    const catalog = readUserCatalog();
    expect(catalog).toHaveLength(1);
    expect(catalog[0].id).toBe("custom:lesson-1");
    expect(catalog[0].number).toBe(1);
    expect(catalog[0].title).toBe("The fork");
    expect(catalog[0].steps).toHaveLength(2);
    expect(catalog[0].steps?.[1].body).toBe("Updated landing squares.");
    expect(catalog[0].activeStep).toBeUndefined();
    expect(nextLessonNumber()).toBe(2);

    upsertLessonStep({
      lessonNumber: 1,
      patch: true,
      step: {
        title: "Where to land",
        body: "Patched.",
        highlights: [{ square: "d5", kind: "key" }],
      },
    });
    expect(readUserCatalog()).toHaveLength(1);
    expect(findUserLessonByNumber(1)?.steps?.[1].highlights?.[0].square).toBe("d5");
    expect(findUserLesson("1")?.id).toBe("custom:lesson-1");
  });

  it("keeps the catalog title when later steps are added", () => {
    upsertLessonStep({
      lessonNumber: 1,
      lessonTitle: "Italian Opening",
      step: { title: "Center pawns", body: "e2:e4", what: "Play e2:e4.", why: "Take the center." },
    });
    upsertLessonStep({
      lessonNumber: 1,
      step: { title: "Knight", body: "g1:f3", what: "Play g1:f3.", why: "Attack e5." },
    });
    const lesson = findUserLessonByNumber(1);
    expect(lesson?.title).toBe("Italian Opening");
    expect(lesson?.steps?.map((item) => item.title)).toEqual(["Center pawns", "Knight"]);
  });

  it("creates an empty numbered lesson for later steps", () => {
    const created = createCatalogLesson({
      title: "Italian Opening",
      body: "A healthy start.",
    });
    expect(created.number).toBe(1);
    expect(created.steps).toEqual([]);
    expect(readUserCatalog()).toHaveLength(1);
  });

  it("stores recap on the lesson without turning it into a teaching step", () => {
    createCatalogLesson({ title: "Scholar's Mate", body: "Four-move mate." });
    upsertLessonStep({
      lessonNumber: 1,
      lessonTitle: "Scholar's Mate",
      step: { title: "Center", body: "e4", what: "e2:e4", why: "Take the center." },
    });
    setLessonRecap(1, { paragraphs: ["Recap v1"] });
    upsertLessonStep({
      lessonNumber: 1,
      step: { title: "Queen", body: "Qh5", what: "d1:h5", why: "Press f7." },
    });
    const lesson = findUserLessonByNumber(1);
    expect(lesson?.body).toBe("Four-move mate.");
    expect(lesson?.recap?.paragraphs).toEqual(["Recap v1"]);
    expect(lesson?.steps?.map((item) => item.title)).toEqual(["Center", "Queen"]);
    setLessonRecap(1, { title: "Takeaways", paragraphs: ["Recap v2"] });
    expect(findUserLessonByNumber(1)?.recap?.paragraphs).toEqual(["Recap v2"]);
  });
});
