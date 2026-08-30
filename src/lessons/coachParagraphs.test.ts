import { normalizeCoachCopy, splitCoachParagraphs } from "./coachParagraphs";

describe("splitCoachParagraphs", () => {
  it("splits blank lines and literal \\n", () => {
    expect(splitCoachParagraphs("a\n\nb")).toEqual(["a", "b"]);
    expect(splitCoachParagraphs("a\\nb")).toEqual(["a", "b"]);
  });
});

describe("normalizeCoachCopy", () => {
  it("prefers the paragraphs array over body", () => {
    expect(
      normalizeCoachCopy({
        body: "ignored",
        paragraphs: [" מהלך ", "", "לקח"],
      })
    ).toEqual({
      paragraphs: ["מהלך", "לקח"],
      body: "מהלך\n\nלקח",
    });
  });

  it("falls back to splitting body", () => {
    expect(normalizeCoachCopy({ body: "one\ntwo" })).toEqual({
      paragraphs: ["one", "two"],
      body: "one\n\ntwo",
    });
  });
});
