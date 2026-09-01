import { COACH_NOTATION_RULE, coachNotationViolation } from "./coachNotation";

describe("coach notation", () => {
  it("requires long algebraic notation for moves and forbids short SAN", () => {
    expect(COACH_NOTATION_RULE).toContain("long algebraic");
    expect(COACH_NOTATION_RULE).toContain("e2-e4");
    expect(COACH_NOTATION_RULE).toContain("Ng1-f3");
    expect(COACH_NOTATION_RULE).toContain("Bf1-c4");
    expect(COACH_NOTATION_RULE).toMatch(/Never write short SAN/);
    expect(COACH_NOTATION_RULE).not.toMatch(/Write e4, h5, g4, e2:e4, Nf3/);
  });

  it("rejects the Italian SAN line and accepts long algebraic", () => {
    const san = coachNotationViolation([
      "הקו הבסיסי הוא 1.e4 e5 2.Nf3 Nc6 3.Bc4 — והרָץ כבר מביט אל f7",
    ]);
    expect(san).toContain("1.e4");
    expect(san).toContain("Nf3");
    expect(san).toContain("e2-e4");
    expect(
      coachNotationViolation([
        "הקו הבסיסי הוא 1.e2-e4 e7-e5 2.Ng1-f3 Nb8-c6 3.Bf1-c4 — והרָץ כבר מביט אל f7",
      ])
    ).toBeNull();
  });

  it("rejects listed Play moves that are not from:to", () => {
    expect(coachNotationViolation([], ["Nf3", "e2:e4"])).toContain("Nf3");
    expect(coachNotationViolation([], ["e2:e4", "g1:f3"])).toBeNull();
  });
});
