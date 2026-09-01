import { applyGan, commandSatisfied, parseGanCommand } from "./gan";
import { defaultScalene, emptyFigure, moveFreePoint } from "./figure";
import { measureFigure } from "./measure";
import { startFigure } from "./templates";
import { parseTfn, serializeTfn } from "./tfn";
import { extractPlayableGan, tokenizeGanText } from "./text-links";
import { coachPlayGan } from "./stepPlay";
import { ganAnswerIsCorrect } from "./hitTest";

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
  it("creates a triangle and right-angle mark", () => {
    const created = applyGan(emptyFigure(), "A(0,0); B(4,0); C(0,3); △ABC; mark(90,C)");
    expect(created.error).toBeUndefined();
    expect(created.figure.triangles[0]).toEqual(["A", "B", "C"]);
    expect(created.figure.rights[0].vertex).toBe("C");
    expect(commandSatisfied(created.figure, "△ABC")).toBe(true);
    expect(commandSatisfied(created.figure, "mark(90,C)")).toBe(true);
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
    expect(ganAnswerIsCorrect(["AB"], "BA")).toBe(true);
    expect(ganAnswerIsCorrect(["△ABC"], "△CAB")).toBe(true);
    expect(ganAnswerIsCorrect(["H"], "C")).toBe(false);
  });
});
