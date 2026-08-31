import { splitTextLines, squaresFromChessRef, tokenizeChessText, groupLtrRuns, parseChessRef, peekSquaresFromRef } from "./chess-text-links";
import { PieceType } from "../Types";

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

  it("links numbered SAN with annotations", () => {
    const parts = tokenizeChessText("2...Nc6 3.Bc4! Qxf7");
    const refs = parts.filter((part) => part.type === "ref");
    expect(refs.map((part) => part.value)).toEqual(["2...Nc6", "3.Bc4!", "Qxf7"]);
    expect(parseChessRef("Nc6").piece).toBe(PieceType.KNIGHT);
    expect(parseChessRef("Bc4!").piece).toBe(PieceType.BISHOP);
    expect(parseChessRef("Qxf7").piece).toBe(PieceType.QUEEN);
    expect(parseChessRef("Qxf7").dest).toBe("f7");
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
    expect(
      rtl.some((group) => group.type === "text" && group.value.trim().startsWith("-"))
    ).toBe(true);
  });

  it("does not pin a whole English sentence into one nowrap run", () => {
    const groups = groupLtrRuns(
      tokenizeChessText("Not quite. The correct square is e5.")
    );
    const prose = groups.find((group) => group.type === "text");
    expect(prose && prose.type === "text" && prose.value).toContain(
      "The correct square is"
    );
    expect(
      groups.some(
        (group) =>
          group.type === "ltr" && group.parts.some((part) => part.value === "e5")
      )
    ).toBe(true);
    expect(
      groups.some(
        (group) =>
          group.type === "ltr" &&
          group.parts.map((part) => part.value).join("").includes("Not quite")
      )
    ).toBe(false);
  });
});

describe("peekSquaresFromRef", () => {
  it("highlights the queen that can capture f7, not only f7", () => {
    const ref = { type: "ref" as const, value: "Qxf7", ...parseChessRef("Qxf7") };
    expect(
      peekSquaresFromRef(ref, [
        { type: PieceType.QUEEN, square: "h5", destinations: ["f7", "h4"] },
        { type: PieceType.KING, square: "e8", destinations: ["d8", "e7"] },
      ])
    ).toEqual(["h5", "f7"]);
  });

  it("highlights the knight that can go to c6", () => {
    const ref = { type: "ref" as const, value: "Nc6", ...parseChessRef("Nc6") };
    expect(
      peekSquaresFromRef(ref, [
        { type: PieceType.KNIGHT, square: "b8", destinations: ["a6", "c6"] },
      ])
    ).toEqual(["b8", "c6"]);
  });

  it("highlights only the destination when the piece already sits there", () => {
    const ref = { type: "ref" as const, value: "Bc4", ...parseChessRef("Bc4") };
    expect(
      peekSquaresFromRef(ref, [
        { type: PieceType.BISHOP, square: "c4", destinations: ["b3", "d5"] },
      ])
    ).toEqual(["c4"]);
  });
});
