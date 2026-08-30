import { splitTextLines, squaresFromChessRef, tokenizeChessText, groupLtrRuns } from "./chess-text-links";

describe("tokenizeChessText", () => {
  it("links squares and coordinate moves", () => {
    const parts = tokenizeChessText("White opens with e2:e4, aiming at e4.");
    const refs = parts.filter((part) => part.type === "ref");
    expect(refs.map((part) => part.value)).toEqual(["e2:e4", "e4"]);
    expect(refs[0].type === "ref" && refs[0].squares).toEqual(["e2", "e4"]);
    expect(refs[1].type === "ref" && refs[1].squares).toEqual(["e4"]);
  });

  it("links SAN moves and pawn captures", () => {
    const parts = tokenizeChessText("Try Nf3, then Bxc6 or exd5.");
    const refs = parts.filter((part) => part.type === "ref");
    expect(refs.map((part) => part.value)).toEqual(["Nf3", "Bxc6", "exd5"]);
    expect(squaresFromChessRef("Nf3")).toEqual(["f3"]);
    expect(squaresFromChessRef("Bxc6")).toEqual(["c6"]);
    expect(squaresFromChessRef("exd5")).toEqual(["d5"]);
  });

  it("keeps Hebrew around Latin notation", () => {
    const parts = tokenizeChessText("המהלך e2-e4 פותח את המרכז");
    const refs = parts.filter((part) => part.type === "ref");
    expect(refs).toHaveLength(1);
    expect(refs[0].value).toBe("e2-e4");
  });

  it("splits real newlines and literal \\n from model text", () => {
    expect(splitTextLines("a\nb")).toEqual(["a", "b"]);
    expect(splitTextLines("a\\nb")).toEqual(["a", "b"]);
    expect(splitTextLines("a\r\nb")).toEqual(["a", "b"]);
  });

  it("does not treat letters inside words as squares", () => {
    const parts = tokenizeChessText("The idea is simple.");
    expect(parts.filter((part) => part.type === "ref")).toEqual([]);
  });
});

describe("groupLtrRuns", () => {
  it("isolates a leading move sequence in a Hebrew paragraph", () => {
    const text =
      "2...Nc6 3.Bc4! - עכשיו יש שני תוקפים על f7 (מלכה + רץ) מול מגן יחיד. זהו איום אמיתי: Qxf7 יהיה מט.";
    const groups = groupLtrRuns(tokenizeChessText(text));
    expect(groups[0].type).toBe("ltr");
    if (groups[0].type === "ltr") {
      const joined = groups[0].parts.map((part) => part.value).join("");
      expect(joined).toContain("Nc6");
      expect(joined).toContain("Bc4");
      expect(joined.startsWith("2...")).toBe(true);
    }
    const rtl = groups.filter((group) => group.type === "text");
    expect(rtl.some((group) => group.type === "text" && group.value.includes("עכשיו"))).toBe(
      true
    );
  });
});
