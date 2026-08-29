import {
  findUserLesson,
  lessonSlug,
  readUserCatalog,
  removeUserLesson,
  USER_CATALOG_KEY,
  upsertUserLesson,
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
});
