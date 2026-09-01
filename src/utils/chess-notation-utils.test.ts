import { TeamType } from "../Types";
import { expandCastleNotation, parseMoveOrCastle } from "./chess-notation-utils";

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
});
