import { TeamType } from "../Types";
import {
  expandCastleNotation,
  normalizeFromToMove,
  parseMoveOrCastle,
} from "./chess-notation-utils";

describe("castle notation", () => {
  it("expands O-O and O-O-O for both sides", () => {
    expect(expandCastleNotation("O-O", TeamType.OUR)).toEqual({
      from: "e1",
      to: "g1",
    });
    expect(expandCastleNotation("O-O-O", TeamType.OUR)).toEqual({
      from: "e1",
      to: "c1",
    });
    expect(expandCastleNotation("0-0", TeamType.OPPONENT)).toEqual({
      from: "e8",
      to: "g8",
    });
    expect(expandCastleNotation("0-0-0", TeamType.OPPONENT)).toEqual({
      from: "e8",
      to: "c8",
    });
  });

  it("parses either a coordinate move or a castle token", () => {
    expect(parseMoveOrCastle("e2:e4", TeamType.OUR)).toEqual({
      from: "e2",
      to: "e4",
    });
    expect(parseMoveOrCastle("O-O", TeamType.OUR)).toEqual({
      from: "e1",
      to: "g1",
    });
  });

  it("parses long algebraic moves used in coach copy", () => {
    expect(normalizeFromToMove("e2-e4")).toBe("e2:e4");
    expect(normalizeFromToMove("Ng1-f3")).toBe("g1:f3");
    expect(normalizeFromToMove("Bf1xc4")).toBe("f1:c4");
    expect(normalizeFromToMove("1.e2-e4")).toBe("e2:e4");
    expect(parseMoveOrCastle("e2-e4", TeamType.OUR)).toEqual({
      from: "e2",
      to: "e4",
    });
    expect(parseMoveOrCastle("Qd1-h5", TeamType.OUR)).toEqual({
      from: "d1",
      to: "h5",
    });
    expect(parseMoveOrCastle("h5xf7", TeamType.OUR)).toEqual({
      from: "h5",
      to: "f7",
    });
  });
});
