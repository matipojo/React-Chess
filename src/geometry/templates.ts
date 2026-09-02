import { applyGan } from "./gan";
import { parseTfn } from "./tfn";
import { Figure } from "./types";

export const FIGURE_TEMPLATES: Record<string, string> = {
  scalene: "A(-2.2,-1.35) B(2.45,-1.35) C(-0.35,1.85) △ABC",
  "right-at-C": "A(4,0) B(0,3) C(0,0) △ABC mark(90,C)",
  "right-at-A": "A(0,0) B(4,0) C(0,3) △ABC mark(90,A)",
  "isosceles-AB=AC": "A(0,2.6) B(-2.2,0) C(2.2,0) △ABC mark(=,AB,AC)",
  "30-60-90": "A(0,0) B(2,0) C(0,3.464) △ABC mark(90,A) lab(∠B=60) lab(∠C=30)",
  equilateral: "A(-2,0) B(2,0) C(0,3.464) △ABC mark(=,AB,BC,CA)",
  "ssa-ambiguous": "A(0,0) B(4,0) C(3.2,1.8) △ABC",
  "two-triangles":
    "A(-3.2,-1.2) B(-0.4,-1.2) C(-2.4,1.4) D(0.6,-1.2) E(3.4,-1.2) F(1.4,1.4) △ABC △DEF",
};

export function templateNames(): string[] {
  return Object.keys(FIGURE_TEMPLATES);
}

export function figureFromTemplate(id: string): Figure | null {
  const tfn = FIGURE_TEMPLATES[id];
  if (!tfn) {
    return null;
  }
  return parseTfn(tfn);
}

export function startFigure(id?: string): Figure {
  return figureFromTemplate(id || "scalene") || parseTfn(FIGURE_TEMPLATES.scalene);
}

export function twoCongruentTriangles(): Figure {
  const figure =
    figureFromTemplate("two-triangles") || parseTfn(FIGURE_TEMPLATES["two-triangles"]);
  const marked = applyGan(figure, "mark(=,AB,DE); mark(=,AC,DF)");
  return marked.error ? figure : marked.figure;
}
