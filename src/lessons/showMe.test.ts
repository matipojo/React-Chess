import { resolveShowMeRequest } from "./showMe";

describe("resolveShowMeRequest", () => {
  it("fills title, explanation, and moves from a famous game id", () => {
    const resolved = resolveShowMeRequest({ game: "scholars-mate" });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      return;
    }
    expect(resolved.title).toBe("Scholar's Mate");
    expect(resolved.gameId).toBe("scholars-mate");
    expect(resolved.paragraphs).toEqual([
      "A four-move checkmate that attacks the weak f7 square.",
    ]);
    expect(resolved.moves[0]).toBe("e2:e4");
    expect(resolved.moves[resolved.moves.length - 1]).toBe("h5:f7");
  });

  it("keeps the caller's single explanation instead of the famous-game hook", () => {
    const resolved = resolveShowMeRequest({
      game: "scholars-mate",
      paragraphs: ["See how White piles on f7 and the king cannot escape."],
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      return;
    }
    expect(resolved.paragraphs).toEqual([
      "See how White piles on f7 and the king cannot escape.",
    ]);
  });

  it("requires moves when there is no famous game", () => {
    expect(resolveShowMeRequest({ title: "Demo", body: "Watch this." })).toEqual({
      ok: false,
      message:
        "Provide moves as from:to, or a famous game id, so the pieces can play live.",
    });
  });
});
