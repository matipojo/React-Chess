import { applyGan, angleAt, commandSatisfied, parseGanCommand } from "./gan";
import { defaultScalene, emptyFigure, moveFreePoint } from "./figure";
import { ganAnswerIsCorrect, idsMatchHighlight, isAngleHighlighted } from "./hitTest";
import { measureFigure } from "./measure";
import { coachPlayGan } from "./stepPlay";
import { startFigure } from "./templates";
import { extractPlayableGan, parseGanRef, tokenizeGanText } from "./text-links";
import { parseTfn, serializeTfn } from "./tfn";

describe("GAN parse", () => {
  it("parses triangle, altitude, median, bisector, and circles", () => {
    expect(parseGanCommand("△ABC")).toEqual({
      type: "triangle",
      a: "A",
      b: "B",
      c: "C",
    });
    expect(parseGanCommand("h(C,AB)")).toEqual({
      type: "altitude",
      from: "C",
      ontoA: "A",
      ontoB: "B",
    });
    expect(parseGanCommand("m(A,BC)")?.type).toBe("median");
    expect(parseGanCommand("b(∠A)")?.type).toBe("bisector");
    expect(parseGanCommand("circ(ABC)")?.type).toBe("circum");
    expect(parseGanCommand("inc(ABC)")?.type).toBe("in");
    expect(parseGanCommand("mark(90,C)")?.type).toBe("mark-right");
    expect(parseGanCommand("fit(△ABC ≅ △DEF)")?.type).toBe("fit");
    expect(parseGanCommand("△ABC ~ △DEF")?.type).toBe("fit");
  });
});

describe("apply-gan constructions", () => {
  it("places a second triangle beside △ABC instead of stacking on it", () => {
    const created = applyGan(startFigure("scalene"), "△DEF");
    expect(created.error).toBeUndefined();
    expect(created.figure.triangles).toHaveLength(2);
    expect(created.figure.points.D.x).toBeGreaterThan(created.figure.points.B.x);
    expect(created.figure.points.E.x).toBeGreaterThan(created.figure.points.D.x);
  });

  it("creates a triangle and right-angle mark", () => {
    const created = applyGan(emptyFigure(), "A(0,0); B(4,0); C(0,3); △ABC; mark(90,C)");
    expect(created.error).toBeUndefined();
    expect(created.figure.triangles[0]).toEqual(["A", "B", "C"]);
    expect(created.figure.rights[0].vertex).toBe("C");
    expect(commandSatisfied(created.figure, "△ABC")).toBe(true);
    expect(commandSatisfied(created.figure, "mark(90,C)")).toBe(true);
  });

  it("snaps a scalene triangle so mark(90,C) is actually a right angle", () => {
    const start = startFigure("scalene");
    expect(angleAt(start, "C")).not.toBeCloseTo(90, 0);
    const marked = applyGan(start, "mark(90,C)");
    expect(marked.error).toBeUndefined();
    expect(angleAt(marked.figure, "C")).toBeCloseTo(90, 0);
    expect(marked.figure.rights[0].vertex).toBe("C");
  });

  it("drops an altitude and a median", () => {
    const start = startFigure("right-at-C");
    const alt = applyGan(start, "h(C,AB)");
    expect(alt.error).toBeUndefined();
    expect(commandSatisfied(alt.figure, "h(C,AB)")).toBe(true);
    const med = applyGan(start, "m(C,AB)");
    expect(commandSatisfied(med.figure, "m(C,AB)")).toBe(true);
    const mid = Object.keys(med.figure.points).find(
      (name) => med.figure.points[name].constraint?.kind === "mid"
    );
    expect(mid).toBeTruthy();
  });

  it("builds circumcircle and incircle", () => {
    const start = defaultScalene();
    const circ = applyGan(start, "circ(ABC)");
    expect(circ.figure.circles[0].kind).toBe("circum");
    const inc = applyGan(circ.figure, "inc(ABC)");
    expect(inc.figure.circles.map((c) => c.kind).sort()).toEqual(["circum", "in"]);
  });

  it("updates a constrained foot when a free point moves", () => {
    const start = applyGan(startFigure("right-at-C"), "h(C,AB)").figure;
    const footName = Object.keys(start.points).find(
      (name) => start.points[name].constraint?.kind === "foot"
    );
    expect(footName).toBeTruthy();
    const before = start.points[footName!].x;
    const moved = moveFreePoint(start, "C", { x: 1, y: 3 });
    expect(moved.points[footName!].x).not.toBe(before);
  });

  it("moves a free point with a grab animation", () => {
    const start = defaultScalene();
    const result = applyGan(start, "move(C,1,2)");
    expect(result.error).toBeUndefined();
    expect(result.animation).toEqual({
      type: "move",
      name: "C",
      from: { x: start.points.C.x, y: start.points.C.y },
      to: { x: 1, y: 2 },
    });
    expect(result.figure.points.C.x).toBe(1);
    expect(result.figure.points.C.y).toBe(2);
  });
});

describe("TFN round-trip", () => {
  it("serializes a right triangle and parses it back", () => {
    const figure = startFigure("right-at-C");
    const tfn = serializeTfn(figure);
    expect(tfn).toContain("△ABC");
    expect(tfn).toContain("mark(90,C)");
    const again = parseTfn(tfn);
    expect(again.triangles[0].join("")).toBe("ABC");
    expect(again.rights[0].vertex).toBe("C");
  });

  it("serializes a pair of triangles and parses them back", () => {
    const figure = startFigure("two-triangles");
    const tfn = serializeTfn(figure);
    expect(tfn).toContain("△ABC");
    expect(tfn).toContain("△DEF");
    const again = parseTfn(tfn);
    expect(again.triangles.map((t) => t.join("")).sort()).toEqual(["ABC", "DEF"]);
    expect(again.points.D).toBeTruthy();
  });
});

describe("measure", () => {
  it("measures a 3-4-5 right triangle", () => {
    const figure = applyGan(emptyFigure(), "A(0,0); B(4,0); C(0,3); △ABC").figure;
    expect(measureFigure(figure, "AB")?.value).toBe(4);
    expect(measureFigure(figure, "AC")?.value).toBe(3);
    expect(measureFigure(figure, "BC")?.value).toBe(5);
    expect(measureFigure(figure, "∠A")?.value).toBe(90);
    expect(measureFigure(figure, "△ABC")?.value).toBe(6);
  });
});

describe("GAN text links", () => {
  it("tokenizes constructions in mixed Hebrew/English prose", () => {
    const text = "במשולש △ABC הורידו גובה h(C,AB) ואז mark(90,C).";
    const refs = tokenizeGanText(text).filter((part) => part.type === "ref");
    expect(refs.map((part) => (part.type === "ref" ? part.value : ""))).toEqual([
      "△ABC",
      "h(C,AB)",
      "mark(90,C)",
    ]);
    expect(extractPlayableGan(text)).toEqual(["△ABC", "h(C,AB)", "mark(90,C)"]);
  });

  it("links vertices, sides, and angles in Hebrew naming copy", () => {
    const text = "הקודקודים הם A, B, C. הצלעות הן AB, BC, CA. הזוויות הן ∠A, ∠B, ∠C.";
    const refs = tokenizeGanText(text, ["A", "B", "C"]).filter((part) => part.type === "ref");
    expect(refs.map((part) => (part.type === "ref" ? part.value : ""))).toEqual([
      "A",
      "B",
      "C",
      "AB",
      "BC",
      "CA",
      "∠A",
      "∠B",
      "∠C",
    ]);
    expect(parseGanRef("∠A").ids).toEqual(["∠A"]);
    expect(parseGanRef("∠BAC").ids).toEqual(["∠BAC", "∠A"]);
  });

  it("does not treat SAS as a segment", () => {
    const refs = tokenizeGanText("Use SAS on △ABC and △DEF.");
    expect(refs.filter((part) => part.type === "ref").map((part) => part.type === "ref" && part.value)).toEqual([
      "△ABC",
      "△DEF",
    ]);
  });
});

describe("play status", () => {
  it("marks the next construction ready", () => {
    const figure = startFigure("right-at-C");
    const states = coachPlayGan({
      figure,
      commands: ["h(C,AB)", "circ(ABC)"],
    });
    expect(states[0]).toEqual({ notation: "h(C,AB)", status: "ready" });
    expect(states[1]).toEqual({ notation: "circ(ABC)", status: "blocked" });
    const after = applyGan(figure, "h(C,AB)").figure;
    const next = coachPlayGan({ figure: after, commands: ["h(C,AB)", "circ(ABC)"] });
    expect(next[0].status).toBe("done");
    expect(next[1].status).toBe("ready");
  });
});

describe("riddle answers", () => {
  it("accepts equivalent angle and segment ids", () => {
    expect(ganAnswerIsCorrect(["∠C"], "∠C")).toBe(true);
    expect(ganAnswerIsCorrect(["∠C"], "∠ACB")).toBe(true);
    expect(ganAnswerIsCorrect(["∠C"], "C")).toBe(true);
    expect(ganAnswerIsCorrect(["AB"], "BA")).toBe(true);
    expect(ganAnswerIsCorrect(["△ABC"], "△CAB")).toBe(true);
    expect(ganAnswerIsCorrect(["H"], "C")).toBe(false);
  });
});

describe("angle highlights", () => {
  it("matches ∠A with ∠BAC and ∠CAB", () => {
    expect(idsMatchHighlight("∠A", ["∠A"])).toBe(true);
    expect(idsMatchHighlight("∠A", ["∠BAC"])).toBe(true);
    expect(idsMatchHighlight("∠BAC", ["∠A"])).toBe(true);
    expect(idsMatchHighlight("∠CAB", ["∠BAC"])).toBe(true);
    expect(idsMatchHighlight("∠B", ["∠A"])).toBe(false);
    expect(idsMatchHighlight("AB", ["∠A"])).toBe(false);
    expect(isAngleHighlighted("A", "B", "C", ["∠A"])).toBe(true);
    expect(isAngleHighlighted("B", "A", "C", ["∠A"])).toBe(false);
  });
});
